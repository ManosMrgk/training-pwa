<template>
  <DefaultLayout>
    <v-container>
      <h2 class="text-accent">Your Upcoming Appointments</h2>

      <v-data-table
        :items="appointments"
        :headers="apptHeaders"
        class="mb-2"
      >
        <template #item.start_time="{ item }">
          {{ item.start_time.slice(0, 5) }}
        </template>

        <template #item.end_time="{ item }">
          {{ item.end_time.slice(0, 5) }}
        </template>

        <template #item.appointment_type_id="{ item }">
          {{ appointmentTypeName(item.appointment_type_id) }}
        </template>

        <template #item.actions="{ item }">
          <v-btn
            color="error"
            variant="text"
            size="small"
            :disabled="item.status === 'cancelled'"
            @click="openCancelDialog(item)"
          >
            Cancel
          </v-btn>
        </template>
      </v-data-table>

      <v-alert v-if="appointments.length === 0" type="info" class="mt-4">
        You have no upcoming appointments.
      </v-alert>

      <h2 class="mt-8 text-accent">Book a Slot</h2>

      <!-- Parent-side loading guard (prevents child from getting stuck) -->
      <div v-if="loadingBooking" class="d-flex justify-center my-8">
        <v-progress-circular indeterminate size="36" />
      </div>

      <BookingSelector
        v-else
        :key="selectedDate"
        :available-events="availableEvents"
        @update:selected-date="loadAvailableEventsForDate"
      />

      <!-- Pretty confirm dialog -->
      <v-dialog v-model="cancelDialog.open" max-width="420">
        <v-card>
          <v-card-title class="d-flex align-center text-accent">
            <v-icon :icon="mdiAlertCircleOutline" class="mr-2" />
            Confirm cancellation
          </v-card-title>
          <v-card-text>
            Are you sure you want to cancel this booking
            <template v-if="cancelDialog.appt">
              on <strong>{{ cancelDialog.appt.date }}</strong>
              from <strong>{{ cancelDialog.appt.start_time.slice(0,5) }}</strong>
              to <strong>{{ cancelDialog.appt.end_time.slice(0,5) }}</strong>?
            </template>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn
              variant="text"
              @click="closeCancelDialog"
              :disabled="isCancelling"
            >
              Keep booking
            </v-btn>
            <v-btn
              color="error"
              :loading="isCancelling"
              @click="confirmCancel"
            >
              Cancel booking
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Feedback -->
      <v-snackbar v-model="snack.show" :color="snack.color" timeout="2500">
        {{ snack.message }}
      </v-snackbar>
    </v-container>
  </DefaultLayout>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted, ref } from 'vue';
import { mdiAlertCircleOutline } from '@mdi/js';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import BookingSelector from '@/components/BookingSelector.vue';
import { useSlotsStore } from '@/store/slots';
import { useOverridesStore } from '@/store/overrides';
import { useAppointmentsStore } from '@/store/appointments';
import { useAuthStore } from '@/store/auth';
import { useAppointmentTypesStore } from '@/store/appointmentTypes';
import type { Appointment } from '@/supabase/types';

export default defineComponent({
  name: 'Dashboard',
  components: { DefaultLayout, BookingSelector },
  setup() {
    const typesStore = useAppointmentTypesStore();
    const slotStore = useSlotsStore();
    const ovStore = useOverridesStore();
    const apptStore = useAppointmentsStore();
    const auth = useAuthStore();

    const selectedDate = ref(new Date().toISOString().slice(0, 10));
    const loadingBooking = ref(false);

    const apptHeaders = [
      { title: 'Date', key: 'date' },
      { title: 'Start', key: 'start_time' },
      { title: 'End', key: 'end_time' },
      { title: 'Type', key: 'appointment_type_id' },
      { title: 'Status', key: 'status' },
      { title: 'Actions', key: 'actions', sortable: false },
    ];

    onMounted(async () => {
      // Make sure the listing is ready, then prime the booking area
      if (auth.user) {
        await apptStore.fetchAppointmentsRange(auth.user.id, 14);
      }
      await typesStore.fetchTypes();

      // initial load for booking area
      await loadAvailableEventsForDate(selectedDate.value);
    });

    const appointmentTypeName = (id?: number) =>
      typesStore.types.find(t => t.id === id)?.name ?? 'N/A';

    const appointments = computed(() => {
      const now = new Date();
      const todayIso = now.toISOString().slice(0, 10);
      const currentTime = now.toTimeString().slice(0, 5);

      const upcoming = apptStore.appointments.filter(appt => {
        if (appt.date > todayIso) return true;
        if (appt.date === todayIso && appt.end_time > currentTime) return true;
        return false;
      });

      return upcoming.slice().sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });
    });

    // helpers
    const toMinutes = (t?: string) => {
      if (!t) return 0;
      const [hh, mm] = t.split(':').map((n) => parseInt(n, 10));
      return (hh || 0) * 60 + (mm || 0);
    };
    const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
      const s1 = toMinutes(aStart), e1 = toMinutes(aEnd);
      const s2 = toMinutes(bStart), e2 = toMinutes(bEnd);
      return Math.max(s1, s2) < Math.min(e1, e2);
    };

    const availableEvents = computed(() => {
      const dateStr = selectedDate.value;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return [];

      const weekday = new Date(dateStr + 'T00:00:00').getDay();
      const normalize = (s?: string) => (s ?? '').toLowerCase().trim();

      const todaysOverrides = ovStore.overrides;

      // closed day: nothing available
      const hasClosedDay = todaysOverrides.some(o => normalize(o.override_type) === 'closed_day');
      if (hasClosedDay) return [];

      const closedRanges = todaysOverrides.filter(o => normalize(o.override_type) === 'closed_slot');
      const customSlots  = todaysOverrides.filter(o => normalize(o.override_type) === 'custom_slot');

      const events: any[] = [];

      // weekly slots for that weekday, minus closed slots
      const todaysSlots = slotStore.slots.filter(s => s.day_of_week === weekday);
      todaysSlots.forEach((s) => {
        const blocked = closedRanges.some(cr => {
          if (cr.slot_id && cr.slot_id !== s.id) return false;
          return overlaps(cr.custom_start_time, cr.custom_end_time, s.start_time, s.end_time);
        });
        if (blocked) return;

        const booked = apptStore.appointments.filter(a =>
          a.date === dateStr && a.slot_id === s.id && a.status === 'booked'
        ).length;
        if (booked >= s.capacity) return;

        events.push({
          date: dateStr,
          start_time: s.start_time.slice(0, 5),
          end_time: s.end_time.slice(0, 5),
          slot: s
        });
      });

      // custom slots (if any)
      customSlots.forEach(cs => {
        const base = cs.slot_id ? slotStore.slots.find(s => s.id === cs.slot_id) : undefined;
        const capacity = (cs as any).capacity ?? base?.capacity ?? 1;

        const booked = apptStore.appointments.filter(a =>
          a.date === dateStr &&
          a.status === 'booked' &&
          (cs.slot_id ? a.slot_id === cs.slot_id
                      : overlaps(cs.custom_start_time, cs.custom_end_time, a.start_time, a.end_time))
        ).length;
        if (booked >= capacity) return;

        const slotLike = {
          id: base?.id ?? -(cs.id as number),
          day_of_week: weekday,
          appointment_type_id: cs.appointment_type_id ?? base?.appointment_type_id ?? null,
          start_time: cs.custom_start_time,
          end_time: cs.custom_end_time,
          capacity,
        };

        events.push({
          date: dateStr,
          start_time: cs.custom_start_time.slice(0, 5),
          end_time: cs.custom_end_time.slice(0, 5),
          slot: slotLike,
        });
      });

      return events.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    // Loaders
    const loadAvailableEventsForDate = async (date: string) => {
      // Normalize/guard date to avoid bad requests that never finish
      const normalized = (date || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
        // invalid -> clear overrides so availableEvents = []
        selectedDate.value = '';
        ovStore.overrides = [];
        return;
      }

      loadingBooking.value = true;
      try {
        selectedDate.value = normalized;

        // Fetch everything this view needs.
        // (If child also fetches, the key=selectedDate remount prevents stale loaders.)
        await slotStore.fetchSlots();                 // cached
        await ovStore.fetchOverridesByDate(normalized);
        if (auth.user) {
          await apptStore.fetchAppointmentsRange(auth.user.id, 14);
        }
      } finally {
        // always stop the spinner
        loadingBooking.value = false;
      }
    };

    const reloadAppointments = async () => {
      if (auth.user) await apptStore.fetchAppointmentsRange(auth.user.id, 14);
    };

    // --- Confirm dialog state ---
    const cancelDialog = ref<{ open: boolean; appt: Appointment | null }>({
      open: false,
      appt: null
    });
    const isCancelling = ref(false);
    const snack = ref<{ show: boolean; color: string; message: string }>({
      show: false, color: 'success', message: ''
    });

    const openCancelDialog = (appt: Appointment) => {
      cancelDialog.value.open = true;
      cancelDialog.value.appt = appt;
    };
    const closeCancelDialog = () => {
      cancelDialog.value.open = false;
      cancelDialog.value.appt = null;
    };

    const confirmCancel = async () => {
      if (!cancelDialog.value.appt) return;
      try {
        isCancelling.value = true;
        await apptStore.cancelAppointment(cancelDialog.value.appt.id, auth.user?.id);
        await reloadAppointments();
        snack.value = { show: true, color: 'success', message: 'Appointment cancelled.' };
      } catch (e) {
        console.error(e);
        snack.value = { show: true, color: 'error', message: 'Failed to cancel appointment.' };
      } finally {
        isCancelling.value = false;
        closeCancelDialog();
      }
    };

    return {
      // data
      selectedDate,
      apptHeaders,
      appointments,
      availableEvents,

      // booking region loading guard
      loadingBooking,

      // dialog + feedback
      cancelDialog,
      isCancelling,
      openCancelDialog,
      closeCancelDialog,
      confirmCancel,
      snack,

      // loaders
      loadAvailableEventsForDate,
      reloadAppointments,

      // icons & helpers
      mdiAlertCircleOutline,
      appointmentTypeName,
    };
  }
});
</script>
