import { defineStore } from 'pinia';
import { supabase } from '@/supabase/client';
import type { WeeklySlot } from '@/supabase/types';

export const useSlotsStore = defineStore('slots', {
  state: () => ({ slots: [] as WeeklySlot[] }),
  actions: {
    async fetchSlots() {
      if (this.slots.length) return; // load once
      const { data, error } = await supabase.from('weekly_program_slots').select('*');
      if (error) throw error;
      this.slots = data ?? []
    }
  }
});