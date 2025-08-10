import { defineStore } from 'pinia';
import { supabase } from '@/supabase/client';

export interface AppointmentType {
  id: number;
  name: string;
}

export const useAppointmentTypesStore = defineStore('appointmentTypes', {
  state: () => ({
    types: [] as AppointmentType[]
  }),
  actions: {
    async fetchTypes() {
      const { data, error } = await supabase
        .from<AppointmentType>('appointment_types')
        .select('*');
      if (error) throw error;
      this.types = data || [];
    }
  }
});