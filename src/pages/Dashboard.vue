<template>
  <DefaultLayout>
    <v-container>
      <h2 class="text-accent">Your Appointments</h2>

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

      <!-- BookingSelector now manages its own fetching & loading -->
      <BookingSelector />

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
import { useAppointmentsStore } from '@/store/appointments';
import { useAuthStore } from '@/store/auth';
import { useAppointmentTypesStore } from '@/store/appointmentTypes';
import type { Appointment } from '@/supabase/types';

export default defineComponent({
  name: 'Dashboard',
  components: { DefaultLayout, BookingSelector },
  setup() {
    const typesStore = useAppointmentTypesStore();
    const apptStore = useAppointmentsStore();
    const auth = useAuthStore();

    const apptHeaders = [
      { title: 'Date', key: 'date' },
      { title: 'Start', key: 'start_time' },
      { title: 'End', key: 'end_time' },
      { title: 'Type', key: 'appointment_type_id' },
      { title: 'Status', key: 'status' },
      { title: 'Actions', key: 'actions', sortable: false },
    ];

    onMounted(async () => {
      // Upcoming list
      if (auth.user) {
        await apptStore.fetchAppointmentsRange(auth.user.id, 14);
      }
      await typesStore.fetchTypes();
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

    const reloadAppointments = async () => {
      if (auth.user) await apptStore.fetchAppointmentsRange(auth.user.id, 14);
    };

    // Cancel dialog
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
      apptHeaders,
      appointments,
      // dialog + feedback
      cancelDialog,
      isCancelling,
      openCancelDialog,
      closeCancelDialog,
      confirmCancel,
      snack,
      // icons & helpers
      mdiAlertCircleOutline,
      appointmentTypeName,
    };
  }
});
</script>
