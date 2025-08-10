<template>
  <v-row dense>
    <v-col
      v-for="evt in events"
      :key="`${evt.date}-${evt.start_time}`"
      cols="12" sm="6" md="4"
    >
      <v-card outlined>
        <v-card-title>{{ evt.date }} • {{ evt.start_time }}–{{ evt.end_time }}</v-card-title>
        <v-card-text>Type: {{ evt.slot.appointment_type_id }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            color="primary"
            small
            @click="book(evt)"
          >
            Book
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>

    <v-col v-if="events.length === 0" cols="12">
      <p class="text-center">No available slots in the next 14 days.</p>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import type { WeeklySlot } from '@/supabase/types';
import { supabase } from '@/supabase/client';
import { useAuthStore } from '@/store/auth';

export default defineComponent({
  name: 'AvailableSlotsList',
  props: {
    events: {
      type: Array as PropType<Array<{
        date: string;
        start_time: string;
        end_time: string;
        slot: WeeklySlot;
      }>>,
      required: true
    }
  },
  emits: ['booked'],
  setup(props, { emit }) {
    const auth = useAuthStore();

    const book = async (evt: any) => {
      if (!auth.user) return alert('Please log in first.');
      const { error } = await supabase
        .from('appointments')
        .insert({
          user_id: auth.user.id,
          slot_id: evt.slot.id,
          date: evt.date,
          start_time: evt.start_time + ':00',
          end_time: evt.end_time + ':00',
          appointment_type_id: evt.slot.appointment_type_id,
          status: 'booked'
        });
      if (error) return alert('Booking failed: ' + error.message);
      alert('Booked '+ evt.date +' at '+ evt.start_time);
      emit('booked');
    };

    return { book };
  }
});
</script>