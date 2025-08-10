import { defineStore } from 'pinia';
import { supabase } from '@/supabase/client';
import type { Override } from '@/supabase/types';

/**
 * Overrides store: loads date-specific overrides for weekly slots
 */
export const useOverridesStore = defineStore('overrides', {
  state: () => ({
    overrides: [] as Override[]
  }),
  actions: {
    /**
     * Fetch overrides for a single date (YYYY-MM-DD).
     */
    async fetchOverridesByDate(date: string | Date) {
      const toYMD = (v: string | Date) => {
        if (v instanceof Date) {
          const y = v.getFullYear();
          const m = String(v.getMonth() + 1).padStart(2, '0');
          const d = String(v.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;        // local date, no TZ shift
        }
        return String(v).slice(0, 10);    // assume "YYYY-MM-DD..."
      };

      const day = toYMD(date);

      const { data, error } = await supabase
        .from<Override>('overrides')
        .select('*')
        .eq('date', day);                  // DATE column expects "YYYY-MM-DD"
      if (error) throw error;

      this.overrides = data ?? [];
    },
    
    /**
     * Fetch all overrides within the next N days (default 14) or entire table
     * @param daysAhead number of days from today to include
     */
    async fetchOverrides(daysAhead: number = 14) {
      const today = new Date();
      const start = today.toISOString().slice(0, 10);
      const endDate = new Date();
      endDate.setDate(today.getDate() + daysAhead);
      const end = endDate.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from<Override>('overrides')
        .select('*')
        .gte('date', start)
        .lte('date', end);
      if (error) throw error;
      this.overrides = data;
    }
  }
});