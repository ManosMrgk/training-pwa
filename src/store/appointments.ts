import { defineStore } from 'pinia';
import { supabase } from '@/supabase/client';
import type { Appointment } from '@/supabase/types';

type BookedCountsMap = Record<string, number>;

// --- time helpers (normalize everything to HH:MM) ---
const toHHMMSS = (t?: string) => {
  if (!t) return '';
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}:00` : t;
};

const normTime = (t?: string) => (t ?? '').slice(0, 5);
const inWindow = (start: string, winStart: string, winEnd: string) => {
  const s = normTime(start);
  const a = normTime(winStart);
  const b = normTime(winEnd);
  return s >= a && s < b; // [a, b)
};

const key = (slotId: number | null, start: string, end: string) =>
  `${slotId ?? 'null'}|${toHHMMSS(start)}|${toHHMMSS(end)}`;

export const useAppointmentsStore = defineStore('appointments', {
  state: () => ({
    // user-scoped list
    appointments: [] as Appointment[],

    // global counts for capacity checks
    bookedCountsMap: {} as BookedCountsMap,
  }),

  getters: {
    /**
     * Exact count for a specific (slot_id,start,end) triple.
     * Use for weekly slots and custom slots that insert with exact start/end.
     */
    bookedCountFor: (state) => (slotId: number | null, start: string, end: string) =>
      state.bookedCountsMap[key(slotId, start, end)] ?? 0,

    /**
     * Window count for custom slots with no slot_id:
     * sums all rows where slot_id is null and the booking start falls in [start,end).
     */
    bookedCountForCustomWindow: (state) => (start: string, end: string) =>
      state.bookedCountsMap[key(null, start, end)] ?? 0,
  },

  actions: {
    async cancelAppointment(appointmentId: number, userId?: string) {
      let query = supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (userId) query = query.eq('user_id', userId);

      // grab fields to update local counts optimistically
      const { data, error } = await query
        .select('id,status,date,start_time,end_time,slot_id')
        .single();
      if (error) throw error;

      // Update user list
      const idx = this.appointments.findIndex(a => a.id === appointmentId);
      if (idx !== -1) this.appointments[idx].status = 'cancelled';

      // Optimistic decrement (safe-guard at 0)
      if (data?.start_time && data?.end_time) {
        const k = key(data.slot_id ?? null, data.start_time, data.end_time);
        if (this.bookedCountsMap[k]) {
          this.bookedCountsMap[k] = Math.max(0, this.bookedCountsMap[k] - 1);
        }
      }

      return data;
    },

    async fetchUserUpcoming(userId: string, limit = 20) {
      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const nowTime = now.toTimeString().slice(0, 8); // HH:MM:SS

      const { data, error } = await supabase
        .from<Appointment>('appointments')
        .select('id,date,start_time,end_time,appointment_type_id,status,slot_id')
        .eq('user_id', userId)
        .or(`date.gt.${today},and(date.eq.${today},end_time.gt.${nowTime})`)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(limit);

      if (error) throw error;
      this.appointments = data ?? [];
    },

    async fetchUserAppointmentsByDate(userId: string, date: string) {
      const { data, error } = await supabase
        .from<Appointment>('appointments')
        .select('id,date,start_time,end_time,appointment_type_id,status,slot_id')
        .eq('user_id', userId)
        .eq('date', date)
        .order('start_time', { ascending: true });

      if (error) throw error;
      this.appointments = data ?? [];
    },

    /**
     * Global booked rows grouped into a map keyed by (slot_id,start,end).
     */
    async fetchBookedCountsForDate(date: string | Date) {
      const toYMD = (v: string | Date) => {
        if (v instanceof Date) {
          const y=v.getFullYear(), m=String(v.getMonth()+1).padStart(2,'0'), d=String(v.getDate()).padStart(2,'0');
          return `${y}-${m}-${d}`;
        }
        const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[1]}-${m[2]}-${m[3]}` : String(v).slice(0,10);
      };
      const ymd = toYMD(date);

      const { data, error } = await supabase
        .from('appointments')
        .select('slot_id,start_time,end_time')
        .eq('date', ymd)
        .eq('status', 'booked');

      if (error) throw error;

      const map: Record<string, number> = {};
      for (const row of (data ?? []) as { slot_id: number | null; start_time: string; end_time: string }[]) {
        // key() already normalizes, so just pass through
        const k = key(row.slot_id, row.start_time, row.end_time);
        map[k] = (map[k] ?? 0) + 1;
      }
      this.bookedCountsMap = map;
    },

    async fetchUserAppointments(userId: string) {
      const { data, error } = await supabase
        .from<Appointment>('appointments')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      this.appointments = data ?? [];
    },

    async fetchAppointmentsRange(userId: string, daysAhead: number) {
      const today = new Date();
      const start = today.toISOString().slice(0, 10);
      const endDate = new Date();
      endDate.setDate(today.getDate() + daysAhead);
      const end = endDate.toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from<Appointment>('appointments')
        .select('*')
        .eq('user_id', userId)
        .gte('date', start)
        .lte('date', end);
      if (error) throw error;
      this.appointments = data ?? [];
    },

    async bookSlot(appointment: Appointment) {
      const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select('date,start_time,end_time,slot_id')
        .single();
      if (error) throw error;

      // bump in-memory count using normalized key
      if (data?.date && data?.start_time && data?.end_time) {
        const k = key(data.slot_id ?? null, data.start_time, data.end_time);
        this.bookedCountsMap[k] = (this.bookedCountsMap[k] ?? 0) + 1;
      }
      return data;
    },
  },
});
