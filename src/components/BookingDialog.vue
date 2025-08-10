<template>
  <v-dialog v-model="visible" max-width="400px">
    <v-card>
      <v-card-title>Confirm Booking</v-card-title>
      <v-card-text>
        <p><strong>Date:</strong> {{ formattedDate }}</p>
        <p><strong>Time:</strong> {{ timeRange }}</p>
        <p><strong>Type:</strong> {{ slot.appointment_type_id }}</p>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn text @click="cancel">Cancel</v-btn>
        <v-btn color="primary" @click="confirm" :loading="loading">
          Confirm
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { defineComponent, computed, PropType, ref, watch } from 'vue';
import type { WeeklySlot } from '@/supabase/types';
import { supabase } from '@/supabase/client';
import { useAuthStore } from '@/store/auth';
import { useAppointmentsStore } from '@/store/appointments';

export default defineComponent({
  name: 'BookingDialog',
  props: {
    visible: { type: Boolean, required: true },
    event: {
      type: Object as PropType<{ slot: WeeklySlot; start: string; end: string }>,
      required: true
    }
  },
  emits: ['update:visible'],
  setup(props, { emit }) {
    const loading = ref(false);
    const auth = useAuthStore();
    const apptStore = useAppointmentsStore();

    const formattedDate = computed(() => props.event.start.slice(0, 10));
    const timeRange = computed(() => {
      const start = props.event.start.substr(11, 5);
      const end = props.event.end.substr(11, 5);
      return `${start} - ${end}`;
    });

    async function confirm() {
      loading.value = true;
      try {
        const user = auth.user;
        if (!user) throw new Error('Not authenticated');
        await supabase
          .from('appointments')
          .insert({
            user_id: user.id,
            slot_id: props.event.slot.id,
            date: formattedDate.value,
            start_time: props.event.start.substr(11, 8),
            end_time: props.event.end.substr(11, 8),
            appointment_type_id: props.event.slot.appointment_type_id,
            status: 'booked'
          });
        // refresh user's appointments
        await apptStore.fetchUserAppointments(user.id);
        emit('update:visible', false);
      } catch (e: any) {
        console.error('Booking failed:', e.message);
        loading.value = false;
      }
    }

    function cancel() {
      emit('update:visible', false);
    }

    // Reset loading when dialog reopens
    watch(
      () => props.visible,
      (v) => {
        if (v === true) loading.value = false;
      }
    );

    return { formattedDate, timeRange, confirm, cancel, loading };
  }
});
</script>