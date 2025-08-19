<template>
  <div>
    <v-row>
      <v-col cols="12" md="6">
        <v-menu
          v-model="dateMenu"
          :close-on-content-click="false"
          transition="scale-transition"
          offset-y
        >
          <template #activator="{ props }">
            <v-text-field
              v-bind="props"
              v-model="selectedDateDisplay"
              label="Select a date"
              readonly
              clearable
              @click:clear="onClearDate"
            />
          </template>

          <v-date-picker
            color="accent"
            v-model="selectedDate"
            :min="minDate"
            :max="maxDate"
            @update:model-value="dateMenu = false"
          />
        </v-menu>
      </v-col>
    </v-row>

    <div v-if="loading" class="text-center my-10">
      <v-progress-circular indeterminate color="accent" size="48" />
    </div>

    <div v-else-if="selectedDate">
      <v-row>
        <v-col
          v-for="slot in slotsForDate"
          :key="slot.id"
          cols="12"
          md="6"
        >
          <v-card :elevation="1" class="mb-2" outlined dense>
            <v-card-title class="py-2 d-flex align-center">
              <span class="font-weight-bold text-accent">
                {{ weekDayName }}
                {{ slot.start_time.slice(0,5) }} - {{ slot.end_time.slice(0,5) }}
              </span>
              <v-spacer />
              <v-chip
                v-if="slot.bookedOut"
                color="red lighten-2"
                text-color="white"
                small
                label
              >Full</v-chip>
            </v-card-title>

            <v-card-subtitle class="py-1 d-flex align-center">
              <v-icon :icon="mdiAccountGroup" small class="mr-1" />
              {{ appointmentTypeName(slot.appointment_type_id) }}
              <v-spacer />
              <v-chip
                small
                :color="slot.bookedOut ? 'grey lighten-1' : 'green lighten-4'"
                class="ml-2"
                label
              >
                {{ slot.booked }} / {{ slot.capacity }} booked
              </v-chip>
              <v-chip
                v-if="!slot.bookedOut"
                small
                color="green lighten-4"
                class="ml-2"
                label
              >
                {{ Math.max(0, slot.capacity - slot.booked) }} left
              </v-chip>
            </v-card-subtitle>

            <v-card-actions class="py-1">
              <v-spacer />
              <v-btn
                color="accent"
                @click="openBooking(slot)"
                :disabled="slot.bookedOut"
                :loading="bookingSlotId === slot.id"
                v-if="!slot.bookedOut"
                small
                text
              >
                Book
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <div v-if="!slotsForDate.length" class="text-grey">No available slots for this date.</div>
    </div>

    <!-- Booking Dialog -->
    <v-dialog v-model="dialog" max-width="400">
      <v-card>
        <v-card-title class="text-accent">Confirm Booking</v-card-title>
        <v-card-text>
          <div>
            <strong>Date:</strong> {{ selectedDateDisplay }}<br>
            <strong>Time:</strong> {{ selectedSlot?.start_time.slice(0,5) }} - {{ selectedSlot?.end_time.slice(0,5) }}<br>
            <strong>Type:</strong> {{ appointmentTypeName(selectedSlot?.appointment_type_id) }}
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="dialog = false">Cancel</v-btn>
          <v-btn class="text-accent" @click="book(selectedSlot)" :loading="bookingSlotId === selectedSlot?.id">Book</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Success Snackbar -->
    <v-snackbar v-model="snackbar" color="success" timeout="2000">
      Booking successful!
    </v-snackbar>
  </div>
</template>

<script lang="ts">
import { mdiAccountGroup, mdiClock } from '@mdi/js';
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import { useSlotsStore } from '@/store/slots';
import { useOverridesStore } from '@/store/overrides';
import { useAppointmentsStore } from '@/store/appointments';
import { useAuthStore } from '@/store/auth';
import { useAppointmentTypesStore } from '@/store/appointmentTypes';

export default defineComponent({
  name: 'BookingSelector',
  setup() {
    const slotsStore = useSlotsStore();
    const overridesStore = useOverridesStore();
    const apptStore = useAppointmentsStore();
    const auth = useAuthStore();
    const typesStore = useAppointmentTypesStore();

    // ---- helpers: normalize & parse dates safely (no timezone surprises) ----
    const toYMD = (v: string | Date): string => {
      if (!v) return '';
      if (v instanceof Date) {
        const y = v.getFullYear();
        const m = String(v.getMonth() + 1).padStart(2, '0');
        const d = String(v.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
      const dt = new Date(String(v));
      if (!isNaN(dt.getTime())) {
        const y = dt.getFullYear();
        const mo = String(dt.getMonth() + 1).padStart(2, '0');
        const da = String(dt.getDate()).padStart(2, '0');
        return `${y}-${mo}-${da}`;
      }
      return '';
    };
    const localDateFromYMD = (ymd: string): Date => {
      const [y, m, d] = ymd.split('-').map(Number);
      return new Date(y, (m ?? 1) - 1, d ?? 1);
    };

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = toYMD(tomorrow);
    const minDate = toYMD(today);
    const maxDate = toYMD(new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000));

    const selectedDate = ref<string | Date>(tomorrowDate);
    const bookingSlotId = ref<number|null>(null);
    const loading = ref(true);

    // Booking dialog state
    const dialog = ref(false);
    const selectedSlot = ref<any>(null);
    const snackbar = ref(false);

    const dateMenu = ref(false);

    const selectedDateDisplay = computed(() => {
      const ymd = toYMD(selectedDate.value as any);
      if (!ymd) return '';
      const d = localDateFromYMD(ymd);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
    });

    // Timeout wrapper
    const withTimeout = <T>(p: Promise<T>, ms = 10000) =>
      Promise.race<T>([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)) as Promise<T>,
      ]);

    // ------- request token guard (prevents stale requests from toggling loading) -------
    let activeReq = 0;
    const runForDate = async (dateYMD: string) => {
      const req = ++activeReq;
      loading.value = true;
      try {
        await Promise.allSettled([
          withTimeout(overridesStore.fetchOverridesByDate(dateYMD)),
          withTimeout(apptStore.fetchBookedCountsForDate(dateYMD)),
          auth.user ? withTimeout(apptStore.fetchAppointmentsRange(auth.user.id, 14)) : Promise.resolve(),
        ]);
      } finally {
        if (req === activeReq) loading.value = false;
      }
    };

    onMounted(async () => {
      const initDate = toYMD(selectedDate.value as any);
      try {
        await Promise.allSettled([
          withTimeout(typesStore.fetchTypes()),
          withTimeout(slotsStore.fetchSlots()),
        ]);
      } catch (e) {
        console.error('BookingSelector init failed:', e);
      }
      await runForDate(initDate);
    });

    // Re-fetch when date changes (normalize first!)
    watch(selectedDate, async (val) => {
      const ymd = toYMD(val as any);
      if (!ymd) return; // safeguard
      await runForDate(ymd);
    });

    const onClearDate = () => {
      // Always keep a valid date to avoid edge states
      selectedDate.value = minDate;
    };

    const weekDayName = computed(() => {
      const ymd = toYMD(selectedDate.value as any);
      if (!ymd) return '';
      const d = localDateFromYMD(ymd);
      return d.toLocaleDateString(undefined, { weekday: 'long' });
    });

    // helpers
    const toMinutes = (t?: string) => {
      if (!t) return 0;
      const [hh, mm] = t.split(':').map((n) => parseInt(n, 10));
      return (hh || 0) * 60 + (mm || 0);
    };
    const startInRange = (slotStart?: string, rangeStart?: string, rangeEnd?: string) => {
      if (!slotStart || !rangeStart || !rangeEnd) return false;
      const s = toMinutes(slotStart);
      const r1 = toMinutes(rangeStart);
      const r2 = toMinutes(rangeEnd);
      return s >= r1 && s < r2;
    };
    const norm = (s?: string) => (s ?? '').toLowerCase().trim();

    const slotsForDate = computed(() => {
      const iso = toYMD(selectedDate.value as any);
      if (!iso || loading.value) return [];

      const date = localDateFromYMD(iso);
      const dow = date.getDay();

      const todaysOverrides = overridesStore.overrides;

      // 1) CLOSED DAY — nothing is available
      const hasClosedDay = todaysOverrides.some(o => norm(o.override_type) === 'closed_day');
      if (hasClosedDay) return [];

      // 2) Prepare closed ranges and custom slots
      const closedRanges = todaysOverrides.filter(o => norm(o.override_type) === 'closed_slot');
      const customSlots  = todaysOverrides.filter(o => norm(o.override_type) === 'custom_slot');

      const isToday = iso === toYMD(new Date());
      const now = new Date();

      const results: any[] = [];

      // Weekly slots
      slotsStore.slots
        .filter(s => s.day_of_week === dow)
        .forEach((s) => {
          const isClosedByRange = closedRanges.some(cr => {
            if (cr.slot_id && cr.slot_id !== s.id) return false;
            return startInRange(s.start_time, cr.custom_start_time, cr.custom_end_time);
          });
          if (isClosedByRange) return;

          const booked = apptStore.bookedCountFor(s.id, s.start_time, s.end_time);
          const bookedOut = booked >= s.capacity;

          if (isToday) {
            const [h, m] = s.start_time.split(':').map(Number);
            const slotDateTime = new Date(date); slotDateTime.setHours(h, m, 0, 0);
            if (slotDateTime <= now) return;
          }

          results.push({
            ...s,
            start_time: s.start_time,
            end_time: s.end_time,
            booked,
            bookedOut,
          });
        });

      // Custom slots
      customSlots.forEach(cs => {
        const base = cs.slot_id ? slotsStore.slots.find(s => s.id === cs.slot_id) : undefined;
        const capacity = (cs as any).capacity ?? base?.capacity ?? 1;
        const appointment_type_id = (cs as any).appointment_type_id ?? base?.appointment_type_id ?? null;

        const blockedByClosedRange = closedRanges.some(cr => {
          if (cr.slot_id && base && cr.slot_id !== base.id) return false;
          return startInRange(cs.custom_start_time, cr.custom_start_time, cr.custom_end_time);
        });
        if (blockedByClosedRange) return;

        const booked = apptStore.bookedCountFor(
          cs.slot_id ?? null,
          cs.custom_start_time!,
          cs.custom_end_time!
        );

        const bookedOut = booked >= capacity;

        if (isToday) {
          const [h, m] = (cs.custom_start_time ?? '00:00').split(':').map(Number);
          const slotDateTime = new Date(date); slotDateTime.setHours(h, m, 0, 0);
          if (slotDateTime <= now) return;
        }

        results.push({
          id: base?.id ?? -(cs.id as number),
          day_of_week: dow,
          start_time: cs.custom_start_time!,
          end_time: cs.custom_end_time!,
          capacity,
          appointment_type_id,
          booked,
          bookedOut,
        });
      });

      return results.sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    function appointmentTypeName(id: string|number) {
      const type = typesStore.types.find(t => t.id === id);
      return type ? type.name : `Type ${id}`;
    }

    function openBooking(slot: any) {
      selectedSlot.value = slot;
      dialog.value = true;
    }

    const book = async (slot: any) => {
      if (!auth.user) return;
      const ymd = toYMD(selectedDate.value as any);
      bookingSlotId.value = slot.id;
      await apptStore.bookSlot({
        user_id: auth.user.id,
        slot_id: slot.id > 0 ? slot.id : null,
        date: ymd,
        start_time: slot.start_time,
        end_time: slot.end_time,
        appointment_type_id: slot.appointment_type_id,
        status: 'booked'
      });
      await Promise.allSettled([
        apptStore.fetchAppointmentsRange(auth.user.id, 14),
        apptStore.fetchBookedCountsForDate(ymd),
      ]);
      bookingSlotId.value = null;
      dialog.value = false;
      snackbar.value = true;
    };

    return {
      selectedDate, minDate, maxDate, slotsForDate, book, weekDayName,
      appointmentTypeName, bookingSlotId, loading, dialog, selectedSlot, openBooking, snackbar,
      mdiClock, mdiAccountGroup, dateMenu, selectedDateDisplay, onClearDate
    };
  }
});
</script>
