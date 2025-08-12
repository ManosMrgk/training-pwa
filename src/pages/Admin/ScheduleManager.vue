<template>
  <DefaultLayout>
    <v-container>
      <h2 class="mb-4 text-accent">Admin Dashboard</h2>
      <v-tabs v-model="tab" color="accent" align-tabs="center">
        <v-tab value="bookings">Upcoming Bookings</v-tab>
        <v-tab value="overrides">Schedule Overrides</v-tab>
        <v-tab value="weekly">Weekly Schedule</v-tab>
      </v-tabs>

      <v-window v-model="tab" class="mt-4">
        <!-- BOOKINGS -->
        <v-window-item value="bookings">
          <v-card class="elevation-2">
            <v-card-title class="d-flex align-center">
              Upcoming Bookings
              <v-spacer />
              <!-- <v-btn icon @click="loadAllAppointments">
                <v-icon :icon="mdiRefresh" />
              </v-btn> -->
            </v-card-title>

            <v-card-text>
              <v-expansion-panels v-if="Object.keys(groupedAppointments).length > 0">
                <v-expansion-panel
                  v-for="(group, date) in groupedAppointments"
                  :key="date"
                >
                  <v-expansion-panel-title>
                    {{ formatDate(date) }} ({{ group.length }} booking{{ group.length > 1 ? 's' : '' }})
                  </v-expansion-panel-title>

                  <v-expansion-panel-text>
                    <v-list density="compact">
                      <v-list-item
                        v-for="appt in group"
                        :key="appt.id"
                        class="border-b"
                      >
                        <template #title>
                          <div class="d-flex align-center">
                            <span class="font-weight-bold">
                              {{ appt.start_time.slice(0, 5) }} - {{ appt.end_time.slice(0, 5) }}
                            </span>
                            <span class="ml-4 text-medium-emphasis">
                              {{ getAppointmentTypeName(appt.appointment_type_id) }}
                            </span>
                          </div>
                        </template>

                        <template #subtitle>
                          {{ appt.user_display_name }}
                        </template>

                        <template #append>
                          <v-btn
                            color="error"
                            variant="text"
                            size="small"
                            @click="cancelBooking(appt.id)"
                          >
                            Cancel
                          </v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>

              <v-alert v-else type="info" prominent>
                No upcoming bookings found.
              </v-alert>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- OVERRIDES -->
        <v-window-item value="overrides">
          <v-card class="elevation-2">
            <v-card-title>
              Schedule Overrides
              <!-- <v-btn icon @click="loadOverrides" class="ml-2">
                <v-icon :icon="mdiRefresh" />
              </v-btn> -->
              <v-spacer />
              <v-btn color="accent" @click="openOverrideDialog()">New Override</v-btn>
            </v-card-title>

            <v-card-text>
              <v-data-table
                :headers="overrideHeaders"
                :items="overrides"
                :items-per-page="5"
                :sort-by="[{ key: 'date', order: 'asc' }]"
              >
                <template #item.override_type="{ item }">
                  <v-chip :color="getOverrideTypeColor(item.override_type)">
                    {{ getOverrideTypeLabel(item.override_type) }}
                  </v-chip>
                </template>

                <template #item.date="{ item }">
                  {{ formatDate(item.date) }}
                </template>

                <template #item.custom_start_time="{ item }">
                  <span v-if="item.override_type !== 'closed_day'">
                    {{ item.custom_start_time ? item.custom_start_time.slice(0, 5) : '—' }}
                  </span>
                  <span v-else>—</span>
                </template>

                <template #item.custom_end_time="{ item }">
                  <span v-if="item.override_type !== 'closed_day'">
                    {{ item.custom_end_time ? item.custom_end_time.slice(0, 5) : '—' }}
                  </span>
                  <span v-else>—</span>
                </template>

                <template #item.capacity="{ item }">
                  <span v-if="item.override_type === 'custom_slot'">
                    {{ item.capacity ?? '—' }}
                  </span>
                  <span v-else>—</span>
                </template>

                <template #item.actions="{ item }">
                  <v-btn
                    icon size="small" color="primary" variant="text"
                    @click="openOverrideDialog(item)"
                  >
                    <v-icon :icon="mdiPencil" />
                  </v-btn>
                  <v-btn
                    icon size="small" color="error" variant="text"
                    @click="deleteOverride(item.id)"
                  >
                    <v-icon :icon="mdiDelete" />
                  </v-btn>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-window-item>

        <!-- WEEKLY -->
        <v-window-item value="weekly">
          <v-card class="elevation-2">
            <v-card-title>
              Weekly Schedule
              <!-- <v-btn icon @click="loadSlots" class="ml-2">
                <v-icon :icon="mdiRefresh" />
              </v-btn> -->
              <v-spacer />
              <v-btn color="accent" @click="openSlotDialog()">New Slot</v-btn>
            </v-card-title>

            <v-card-text>
              <v-expansion-panels>
                <v-expansion-panel v-for="day in daysOfWeek" :key="day.value">
                  <v-expansion-panel-title>
                    {{ day.text }} ({{ getSlotsForDay(day.value).length }} slot{{ getSlotsForDay(day.value).length > 1 ? 's' : '' }})
                  </v-expansion-panel-title>

                  <v-expansion-panel-text>
                    <v-list density="compact">
                      <v-list-item
                        v-for="slot in getSlotsForDay(day.value)"
                        :key="slot.id"
                        class="border-b"
                      >
                        <template #title>
                          <div class="d-flex align-center">
                            <span class="font-weight-bold">
                              {{ slot.start_time.slice(0, 5) }} - {{ slot.end_time.slice(0, 5) }}
                            </span>
                            <span class="ml-4 text-medium-emphasis">
                              Type: {{ getAppointmentTypeName(slot.appointment_type_id) }}
                            </span>
                            <span class="ml-4 text-medium-emphasis">
                              Capacity: {{ slot.capacity }}
                            </span>
                          </div>
                        </template>

                        <template #append>
                          <v-btn icon size="small" color="primary" variant="text" @click="openSlotDialog(slot)">
                            <v-icon :icon="mdiPencil" />
                          </v-btn>
                          <v-btn icon size="small" color="error" variant="text" @click="deleteSlot(slot.id)">
                            <v-icon :icon="mdiDelete" />
                          </v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                  </v-expansion-panel-text>
                </v-expansion-panel>
              </v-expansion-panels>
            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </v-container>

    <!-- OVERRIDE DIALOG -->
    <v-dialog v-model="overrideDialog" max-width="520">
      <v-card>
        <v-card-title>
          <span class="text-h5 text-accent">{{ editingOverride.id ? 'Edit Override' : 'New Override' }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="overrideForm">
            <v-text-field
              v-model="editingOverride.date"
              label="Date"
              type="date"
              :rules="[v => !!v || 'Date is required']"
            />

            <v-select
              v-model="editingOverride.override_type"
              :items="overrideTypes"
              item-title="title"
              item-value="value"
              label="Override Type"
              :rules="[v => !!v || 'Override Type is required']"
            />

            <!-- Time fields required for custom_slot and closed_slot -->
            <div v-if="editingOverride.override_type === 'custom_slot' || editingOverride.override_type === 'closed_slot'">
              <!-- START TIME -->
              <v-menu
                v-model="menus.overrideStart"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                max-width="320"
              >
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="editingOverride.custom_start_time"
                    label="Start Time"
                    readonly
                    color="accent"
                    clearable
                    @click:clear="editingOverride.custom_start_time = null"
                  />
                </template>
                <div class="tp-contrast pa-2">
                  <v-time-picker
                    v-model="editingOverride.custom_start_time"
                    color="accent"
                    @update:model-value="menus.overrideStart = false"
                  />
                </div>
              </v-menu>

              <!-- END TIME -->
              <v-menu
                v-model="menus.overrideEnd"
                :close-on-content-click="false"
                transition="scale-transition"
                offset-y
                max-width="320"
              >
                <template #activator="{ props }">
                  <v-text-field
                    v-bind="props"
                    :model-value="editingOverride.custom_end_time"
                    label="End Time"
                    readonly
                    color="accent"
                    clearable
                    @click:clear="editingOverride.custom_end_time = null"
                  />
                </template>
                <div class="tp-contrast pa-2">
                  <v-time-picker
                    v-model="editingOverride.custom_end_time"
                    color="accent"
                    @update:model-value="menus.overrideEnd = false"
                  />
                </div>
              </v-menu>
            </div>

            <!-- Custom slot only: appointment type + capacity -->
            <v-select
              v-if="editingOverride.override_type === 'custom_slot'"
              v-model="(editingOverride as any).appointment_type_id"
              :items="appointmentTypes"
              item-title="name"
              item-value="id"
              label="Appointment Type"
              :rules="[v => !!v || 'Appointment Type is required']"
            />
            <v-text-field
              v-if="editingOverride.override_type === 'custom_slot'"
              v-model.number="(editingOverride as any).capacity"
              label="Capacity"
              type="number"
              min="1"
              step="1"
              :rules="[
                v => v !== null && v !== undefined || 'Capacity is required',
                v => Number(v) > 0 || 'Capacity must be greater than 0'
              ]"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="closeOverrideDialog">Cancel</v-btn>
          <v-btn color="accent" variant="text" @click="saveOverride">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- SLOT DIALOG -->
    <v-dialog v-model="slotDialog" max-width="500px">
      <v-card>
        <v-card-title>
          <span class="text-h5 text-accent">{{ editingSlot.id ? 'Edit Slot' : 'New Slot' }}</span>
        </v-card-title>
        <v-card-text>
          <v-form ref="slotForm">
            <v-select
              v-model="editingSlot.day_of_week"
              :items="daysOfWeek"
              item-title="text"
              item-value="value"
              label="Day of Week"
              :rules="[v => v !== null || 'Day is required']"
            />

            <!-- START TIME -->
            <v-menu
              v-model="menus.slotStart"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              max-width="320"
            >
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="editingSlot.start_time"
                  label="Start Time"
                  readonly
                  color="accent"
                  clearable
                  @click:clear="editingSlot.start_time = '09:00'"
                />
              </template>
              <div class="tp-contrast pa-2">
                <v-time-picker
                  v-model="editingSlot.start_time"
                  color="accent"
                  @update:model-value="menus.slotStart = false"
                />
              </div>
            </v-menu>

            <!-- END TIME -->
            <v-menu
              v-model="menus.slotEnd"
              :close-on-content-click="false"
              transition="scale-transition"
              offset-y
              max-width="320"
            >
              <template #activator="{ props }">
                <v-text-field
                  v-bind="props"
                  :model-value="editingSlot.end_time"
                  label="End Time"
                  readonly
                  color="accent"
                  clearable
                  @click:clear="editingSlot.end_time = '10:00'"
                />
              </template>
              <div class="tp-contrast pa-2">
                <v-time-picker
                  v-model="editingSlot.end_time"
                  color="accent"
                  @update:model-value="menus.slotEnd = false"
                />
              </div>
            </v-menu>

            <v-text-field
              v-model.number="editingSlot.capacity"
              label="Capacity"
              type="number"
              min="1"
              step="1"
              :rules="[v => v > 0 || 'Capacity must be greater than 0']"
            />
            <v-select
              v-model="editingSlot.appointment_type_id"
              :items="appointmentTypes"
              item-title="name"
              item-value="id"
              label="Appointment Type"
              :rules="[v => !!v || 'Appointment Type is required']"
            />
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" variant="text" @click="closeSlotDialog">Cancel</v-btn>
          <v-btn color="accent" variant="text" @click="saveSlot">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-dialog v-model="confirm.show" max-width="440" persistent>
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon :icon="mdiAlert" class="mr-2" color="warning" />
          <span class="text-h6">{{ confirm.title }}</span>
        </v-card-title>

        <v-card-text class="text-medium-emphasis">
          {{ confirm.message }}
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" color="primary" @click="onConfirm(false)">
            {{ confirm.cancelText || 'Never mind' }}
          </v-btn>
          <v-btn :color="confirm.confirmColor || 'error'" @click="onConfirm(true)">
            {{ confirm.confirmText || 'Confirm' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </DefaultLayout>
</template>

<script lang="ts">
import { mdiRefresh, mdiPencil, mdiDelete, mdiEmail, mdiAlert } from '@mdi/js';
import { defineComponent, ref, computed, onMounted, watch } from 'vue';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import { useAppointmentsStore } from '@/store/appointments';
import { useOverridesStore } from '@/store/overrides';
import { useSlotsStore } from '@/store/slots';
import { useAppointmentTypesStore } from '@/store/appointmentTypes';
import { supabase } from '@/supabase/client';
import type { Appointment, Override, WeeklySlot } from '@/supabase/types';
import { groupBy } from 'lodash';

interface AdminAppointment extends Appointment {
  user_display_name: string;
}
interface AdminOverride extends Override {
  appointment_type_id?: number | null;
  capacity?: number | null;
}

export default defineComponent({
  name: 'AdminScheduleManager',
  components: { DefaultLayout },
  setup() {
    const tab = ref('bookings');
    const apptStore = useAppointmentsStore();
    const ovStore = useOverridesStore();
    const slotsStore = useSlotsStore();
    const apptTypeStore = useAppointmentTypesStore();

    const appointments = ref<AdminAppointment[]>([]);
    const overrides = ref<AdminOverride[]>([]);
    const slots = ref<WeeklySlot[]>([]);
    const appointmentTypes = ref<{ id: number; name: string }[]>([]);

    const menus = ref({
      overrideStart: false,
      overrideEnd: false,
      slotStart: false,
      slotEnd: false,
    });

    const overrideDialog = ref(false);
    const editingOverride = ref<Partial<AdminOverride>>({});
    const overrideForm = ref<any>(null);

    const slotDialog = ref(false);
    const editingSlot = ref<Partial<WeeklySlot>>({});
    const slotForm = ref<any>(null);

    const overrideHeaders = [
      { title: 'Date', key: 'date' },
      { title: 'Type', key: 'override_type' },
      { title: 'Start', key: 'custom_start_time' },
      { title: 'End', key: 'custom_end_time' },
      { title: 'Capacity', key: 'capacity' },
      { title: 'Actions', key: 'actions', sortable: false },
    ];

    const daysOfWeek = [
      { text: 'Monday', value: 1 },
      { text: 'Tuesday', value: 2 },
      { text: 'Wednesday', value: 3 },
      { text: 'Thursday', value: 4 },
      { text: 'Friday', value: 5 },
      { text: 'Saturday', value: 6 },
      { text: 'Sunday', value: 0 },
    ];

    const overrideTypes = [
      { title: 'Closed Day', value: 'closed_day' },
      { title: 'Closed Slot', value: 'closed_slot' },
      { title: 'Custom Slot', value: 'custom_slot' },
    ];

    type ConfirmOpts = {
      title: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
      confirmColor?: string; // e.g., 'error', 'accent'
      icon?: string;
    };

    const confirm = ref<ConfirmOpts & { show: boolean; resolve?: (v: boolean) => void }>({
      show: false,
      title: '',
    });

    function askConfirm(opts: ConfirmOpts) {
      return new Promise<boolean>((resolve) => {
        confirm.value = {
          show: true,
          resolve,
          cancelText: 'Cancel',
          confirmText: 'Confirm',
          ...opts,
        };
      });
    }

    function onConfirm(answer: boolean) {
      confirm.value.resolve?.(answer);
      confirm.value.show = false;
      confirm.value.resolve = undefined;
    }

    const groupedAppointments = computed(() => {
      const byDate = groupBy(appointments.value, 'date');
      return Object.keys(byDate)
        .sort()
        .reduce<Record<string, AdminAppointment[]>>((acc, key) => {
          acc[key] = byDate[key].slice().sort((a, b) => a.start_time.localeCompare(b.start_time));
          return acc;
        }, {});
    });

    watch(
      () => editingOverride.value.override_type,
      (type) => {
        if (!type) return;
        if (type === 'closed_day') {
          editingOverride.value.custom_start_time = null as any;
          editingOverride.value.custom_end_time = null as any;
          editingOverride.value.appointment_type_id = null as any;
          (editingOverride.value as any).capacity = null;
        } else if (type === 'closed_slot') {
          editingOverride.value.appointment_type_id = null as any;
          (editingOverride.value as any).capacity = null;
          if (!editingOverride.value.custom_start_time) editingOverride.value.custom_start_time = '09:00' as any;
          if (!editingOverride.value.custom_end_time) editingOverride.value.custom_end_time = '10:00' as any;
        } else if (type === 'custom_slot') {
          if (!editingOverride.value.custom_start_time) editingOverride.value.custom_start_time = '09:00' as any;
          if (!editingOverride.value.custom_end_time) editingOverride.value.custom_end_time = '10:00' as any;
          if ((editingOverride.value as any).capacity == null) (editingOverride.value as any).capacity = 1;
        }
      },
      { immediate: false }
    );

    const loadAllAppointments = async () => {
      const today = new Date();
      const from_date = today.toISOString().slice(0, 10);
      const from_time = today.toTimeString().slice(0, 8);
      const { data, error } = await supabase.rpc('get_upcoming_appointments_with_users', {
        from_date,
        from_time,
        days_ahead: 60,
        only_status: ['booked']
      });
      if (error) {
        console.error('Error fetching upcoming appointments:', error);
        return;
      }
      appointments.value = (data ?? []) as AdminAppointment[];
    };
    
    const loadOverrides = async () => {
      await ovStore.fetchOverrides(365);
      overrides.value = ovStore.overrides as AdminOverride[];
    };

    const loadSlots = async () => {
      await slotsStore.fetchSlots();
      slots.value = slotsStore.slots;
    };

    const loadAppointmentTypes = async () => {
      await apptTypeStore.fetchTypes();
      appointmentTypes.value = apptTypeStore.types;
    };

    const getSlotsForDay = (day: number) => {
      return slots.value
        .filter(slot => slot.day_of_week === day)
        .sort((a, b) => {
          const startCmp = a.start_time.localeCompare(b.start_time);
          if (startCmp !== 0) return startCmp;
          return a.end_time.localeCompare(b.end_time);
        });
    };

    const getAppointmentTypeName = (id: number) => {
      return appointmentTypes.value.find(type => type.id === id)?.name || 'N/A';
    };

    const getOverrideTypeColor = (type: string) => {
      switch (type) {
        case 'closed_day': return 'error';
        case 'closed_slot': return 'warning';
        case 'custom_slot': return 'info';
        default: return 'primary';
      }
    };

    const getOverrideTypeLabel = (type: string) => {
      return overrideTypes.find(o => o.value === type)?.title || type;
    };

    const formatDate = (date: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const openOverrideDialog = (item?: AdminOverride) => {
      if (item) {
        editingOverride.value = { ...item };
      } else {
        editingOverride.value = {
          override_type: 'closed_day',
          date: new Date().toISOString().slice(0, 10),
          custom_start_time: null as any,
          custom_end_time: null as any,
          appointment_type_id: null,
          capacity: null
        };
      }
      overrideDialog.value = true;
    };

    const closeOverrideDialog = () => {
      overrideDialog.value = false;
      editingOverride.value = {};
      overrideForm.value?.reset();
      menus.value.overrideStart = false;
      menus.value.overrideEnd = false;
    };

    const saveOverride = async () => {
      const { valid } = await overrideForm.value.validate();
      if (!valid) return;

      const payload: any = { ...editingOverride.value };

      if (payload.override_type === 'closed_day') {
        payload.custom_start_time = null;
        payload.custom_end_time = null;
        payload.appointment_type_id = null;
        payload.capacity = null;
      }

      if (payload.override_type === 'closed_slot') {
        if (!payload.custom_start_time || !payload.custom_end_time) return;
        payload.appointment_type_id = null;
        payload.capacity = null;
      }

      if (payload.override_type === 'custom_slot') {
        if (!payload.custom_start_time || !payload.custom_end_time) return;
        if (!payload.appointment_type_id) return;
        if (!(Number(payload.capacity) > 0)) return;
      }

      try {
        if (payload.id) {
          const { error } = await supabase
            .from('overrides')
            .update(payload)
            .eq('id', payload.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('overrides')
            .insert([payload]);
          if (error) throw error;
        }
        await loadOverrides();
        closeOverrideDialog();
      } catch (error) {
        console.error('Error saving override:', error);
      }
    };

    const deleteOverride = async (id: number) => {
      const ok = await askConfirm({
        title: 'Delete override?',
        message: 'This will remove the selected override. This action cannot be undone.',
        confirmText: 'Delete',
        confirmColor: 'error',
      });
      if (!ok) return;
      try {
        const { error } = await supabase.from('overrides').delete().eq('id', id);
        if (error) throw error;
        await loadOverrides();
      } catch (error) {
        console.error('Error deleting override:', error);
      }
      
    };

    const openSlotDialog = (item?: WeeklySlot) => {
      if (item) {
        editingSlot.value = { ...item };
      } else {
        editingSlot.value = {
          day_of_week: 0,
          start_time: '09:00',
          end_time: '10:00',
          capacity: 1,
          appointment_type_id: appointmentTypes.value[0]?.id || null,
        };
      }
      slotDialog.value = true;
    };

    const closeSlotDialog = () => {
      slotDialog.value = false;
      editingSlot.value = {};
      slotForm.value?.reset();
      menus.value.slotStart = false;
      menus.value.slotEnd = false;
    };

    const saveSlot = async () => {
      const { valid } = await slotForm.value.validate();
      if (!valid) return;
      try {
        if (editingSlot.value.id) {
          const { error } = await supabase
            .from('weekly_program_slots')
            .update(editingSlot.value)
            .eq('id', editingSlot.value.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('weekly_program_slots')
            .insert([editingSlot.value]);
          if (error) throw error;
        }
        await loadSlots();
        closeSlotDialog();
      } catch (error) {
        console.error('Error saving slot:', error);
      }
    };

    const deleteSlot = async (id: number) => {
      const ok = await askConfirm({
        title: 'Delete slot?',
        message: 'This will remove the weekly slot from your schedule.',
        confirmText: 'Delete',
        confirmColor: 'error',
      });
      if (!ok) return;
      try {
        const { error } = await supabase.from('weekly_program_slots').delete().eq('id', id);
        if (error) throw error;
        await loadSlots();
      } catch (error) {
        console.error('Error deleting slot:', error);
      }

    };

    const cancelBooking = async (appointmentId: number) => {
      const ok = await askConfirm({
        title: 'Cancel booking?',
        message: 'The booking will be marked as cancelled.',
        confirmText: 'Cancel booking',
        confirmColor: 'error',
      });
      if (!ok) return;
      try {
        const { error } = await supabase
          .from('appointments')
          .update({ status: 'cancelled' })
          .eq('id', appointmentId);
        if (error) throw error;
        await loadAllAppointments();
      } catch (error) {
        console.error('Error canceling appointment:', error);
      }
    };

    onMounted(async () => {
      await loadAppointmentTypes();
      await loadAllAppointments();
      await loadOverrides();
      await loadSlots();
    });

    return {
      tab,
      appointments,
      groupedAppointments,
      overrides,
      slots,
      appointmentTypes,
      daysOfWeek,
      overrideTypes,
      overrideHeaders,
      overrideDialog,
      editingOverride,
      overrideForm,
      slotDialog,
      editingSlot,
      slotForm,
      menus,
      loadAllAppointments,
      loadOverrides,
      loadSlots,
      getSlotsForDay,
      getAppointmentTypeName,
      getOverrideTypeColor,
      getOverrideTypeLabel,
      formatDate,
      openOverrideDialog,
      closeOverrideDialog,
      saveOverride,
      deleteOverride,
      openSlotDialog,
      closeSlotDialog,
      saveSlot,
      deleteSlot,
      cancelBooking,
      mdiRefresh, 
      mdiPencil, 
      mdiDelete,
      mdiEmail,
      mdiAlert,
      confirm,
      onConfirm,
    };
  },
});
</script>

<style scoped>
/* High-contrast Vuetify time-picker on dark */
.tp-contrast {
  --tp-accent: #eab308; /* yellow-600-ish */
  --tp-dial: #1f232b;
  --tp-number: #f3f4f6;
  --tp-muted: #9ca3af;
}

.tp-contrast :deep(.v-picker-title) { color: var(--tp-accent) !important; }

.tp-contrast :deep(.v-time-picker-clock),
.tp-contrast :deep(.v-time-picker-clock__container) {
  background-color: var(--tp-dial) !important;
}

.tp-contrast :deep(.v-time-picker-clock__item) {
  color: var(--tp-number) !important;
  opacity: 0.95 !important;
  font-weight: 600;
}

.tp-contrast :deep(.v-time-picker-clock__item--active),
.tp-contrast :deep(.v-time-picker-title__time .v-btn--active) {
  background-color: color-mix(in oklab, var(--tp-accent) 24%, transparent) !important;
  color: var(--tp-accent) !important;
}

.tp-contrast :deep(.v-time-picker-clock__hand),
.tp-contrast :deep(.v-time-picker-clock__hand-dot) {
  background-color: var(--tp-accent) !important;
  border-color: var(--tp-accent) !important;
}
</style>
