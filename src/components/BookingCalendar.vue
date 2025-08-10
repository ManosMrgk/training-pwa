<template>
  <v-sheet height="700">
    <v-calendar
      v-model="focus"
      :events="events"
      :weekdays="[...Array(7).keys()]"
      :first-day-of-week="1"
      @click:event="selectEvent"
    />
    <BookingDialog
      :visible.sync="dialogVisible"
      :event="selectedEvent"
    />
  </v-sheet>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useSlotsStore } from '@/store/slots';
import { useOverridesStore } from '@/store/overrides';
import { useAppointmentsStore } from '@/store/appointments';
import type { WeeklySlot } from '@/supabase/types';
import BookingDialog from './BookingDialog.vue';

export default defineComponent({
  name: 'BookingCalendar',
  components: { BookingDialog },
  setup() {
    const focus = ref<string>(new Date().toISOString().substr(0, 10));
    const slotsStore = useSlotsStore();
    const overridesStore = useOverridesStore();  // implement fetching overrides
    const apptStore = useAppointmentsStore();

    const dialogVisible = ref(false);
    const selectedEvent = ref<any>(null);

    onMounted(async () => {
      await slotsStore.fetchSlots();
      await overridesStore.fetchOverrides();
      // fetch existing appointments for the next 14 days
      const user = await import('@/store/auth').then(m => m.useAuthStore().user);
      if (user) await apptStore.fetchAppointmentsRange(user.id, 14);
    });

    const events = computed(() => {
      const today = new Date();
      const daysAhead = [...Array(15).keys()]; // 0 to 14
      const generated: any[] = [];

      daysAhead.forEach((offset) => {
        const date = new Date();
        date.setDate(today.getDate() + offset);
        const dow = date.getDay();
        const isoDate = date.toISOString().substr(0, 10);

        // find weekly slots for this day
        slotsStore.slots
          .filter(s => s.day_of_week === dow)
          .forEach((s: WeeklySlot) => {
            // apply overrides: skip if closed override, or use custom times
            const ov = overridesStore.overrides.find(o => o.date === isoDate && o.slot_id === s.id);
            if (ov?.override_type === 'closed') return;
            const start = ov?.override_type === 'custom_slot'
              ? `${isoDate}T${ov.custom_start_time}`
              : `${isoDate}T${s.start_time}`;
            const end = ov?.override_type === 'custom_slot'
              ? `${isoDate}T${ov.custom_end_time}`
              : `${isoDate}T${s.end_time}`;

            // count existing bookings
            const bookedCount = apptStore.appointments.filter(a => a.date === isoDate && a.slot_id === s.id && a.status === 'booked').length;
            if (bookedCount >= s.capacity) return;

            generated.push({ name: `Slot ${s.id}`, start, end, slot: s });
          });
      });

      return generated;
    });

    function selectEvent({ event }: any) {
      selectedEvent.value = event;
      dialogVisible.value = true;
    }

    return { focus, events, selectEvent, dialogVisible, selectedEvent };
  }
});
</script>