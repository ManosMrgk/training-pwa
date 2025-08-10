<template>
  <v-card class="ma-2" outlined>
    <v-card-title>
      {{ formattedTime }}
    </v-card-title>
    <v-card-text>
      <div>Type: {{ slot.appointment_type_id }}</div>
      <div>Capacity: {{ slot.capacity }}</div>
    </v-card-text>
    <v-card-actions>
      <v-btn text small :disabled="disabled" @click="$emit('book', slot)">
        {{ disabled ? 'Full' : 'Book' }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue';
import type { WeeklySlot } from '@/supabase/types';

export default defineComponent({
  name: 'SlotCard',
  props: {
    slot: { type: Object as PropType<WeeklySlot>, required: true },
    disabled: { type: Boolean, default: false }
  },
  emits: ['book'],
  setup(props) {
    const formattedTime = computed(() => {
      return `${props.slot.start_time.slice(0,5)} - ${props.slot.end_time.slice(0,5)}`;
    });
    return { formattedTime };
  }
});
</script>