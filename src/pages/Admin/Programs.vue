<template>
  <DefaultLayout>
    <v-container>
      <h2 class="mb-4 text-accent">Program Builder</h2>

      <v-card class="mb-6">
        <v-card-text>
          <v-form ref="formRef">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.title" label="Program Title" required />
              </v-col>
              <v-col cols="12" md="3">
                <v-text-field v-model="form.client_name" label="Client Name" />
              </v-col>

              <v-col cols="12">
                <v-textarea v-model="form.notes" label="General Notes (optional)" rows="3" />
              </v-col>
            </v-row>

            <v-divider class="my-4" />

            <div v-for="(block, bIdx) in form.blocks" :key="bIdx" class="mb-6">
              <v-row class="align-center">
                <v-col cols="12" md="6">
                  <v-text-field v-model="block.section" label="Section title (e.g., Day 1 – Push)" />
                </v-col>
                <v-col cols="12" md="6" class="text-right">
                  <v-btn variant="text" color="error" @click="removeBlock(bIdx)" v-if="form.blocks.length > 1">
                    <v-icon :icon="mdiDelete" class="mr-1" /> Remove Section
                  </v-btn>
                </v-col>
              </v-row>

              <v-table class="ex-table" density="compact">
            <colgroup>
                <col style="width:42%">
                <col style="width:10%">
                <col style="width:10%">
                <col style="width:14%">
                <col style="width:20%">
                <col style="width:4%">
            </colgroup>

            <thead>
                <tr>
                    <th class="text-left col-exercise">Exercise</th>
                    <th class="text-left">Sets</th>
                    <th class="text-left">Reps</th>
                    <th class="text-left">Rest</th>
                    <th class="text-left col-notes">Notes</th>
                    <th></th>
                </tr>
            </thead>

            <tbody>
                <tr v-for="(ex, eIdx) in block.exercises" :key="eIdx">
                <td class="col-exercise">
                    <v-text-field
                    v-model="ex.name"
                    placeholder="e.g., Barbell Bench Press"
                    variant="underlined"
                    density="compact"
                    hide-details="auto"
                    class="py-0 my-0"
                    />
                </td>
                <td>
                    <v-text-field v-model="ex.sets" variant="underlined" density="compact" hide-details="auto" class="py-0 my-0" />
                </td>
                <td>
                    <v-text-field v-model="ex.reps" variant="underlined" density="compact" hide-details="auto" class="py-0 my-0" />
                </td>
                <td>
                    <v-text-field v-model="ex.rest" placeholder="e.g., 90s" variant="underlined" density="compact" hide-details="auto" class="py-0 my-0" />
                </td>
                <td class="col-notes">
                    <v-text-field v-model="ex.notes" variant="underlined" density="compact" hide-details="auto" class="py-0 my-0" />
                </td>
                <td class="text-right">
                    <v-btn icon variant="text" color="error" @click="removeExercise(bIdx, eIdx)">
                    <v-icon :icon="mdiDelete" />
                    </v-btn>
                </td>
                </tr>
            </tbody>
            </v-table>



              <div class="mt-2">
                <v-btn size="small" color="accent" @click="addExercise(bIdx)">
                  <v-icon :icon="mdiPlus" class="mr-1" /> Add Exercise
                </v-btn>
              </div>
            </div>

            <v-btn variant="outlined" color="accent" class="mr-2" @click="addBlock">
              <v-icon :icon="mdiPlus" class="mr-1" /> Add Section
            </v-btn>

            <v-divider class="my-6" />

            <div class="d-flex flex-wrap ga-2">
              <v-btn :loading="busy" color="accent" @click="generatePdf">
                <v-icon :icon="mdiFilePdfBox" class="mr-2" /> Generate PDF
              </v-btn>

              <v-btn :disabled="!pdfBlob" variant="text" @click="downloadPdf">
                <v-icon :icon="mdiTrayArrowDown" class="mr-2" /> Download
              </v-btn>

              <v-btn :disabled="!shareSupported" variant="text" @click="sharePdf">
                <v-icon :icon="mdiShareVariant" class="mr-2" /> Share
              </v-btn>
            </div>
          </v-form>
        </v-card-text>
      </v-card>

      <v-alert v-if="!pdfBlob" type="info" variant="tonal">
        Fill in details, then click <strong>Generate PDF</strong>.
      </v-alert>
      <v-alert v-else type="success" variant="tonal">
        PDF ready. You can download or share it now.
      </v-alert>
    </v-container>
  </DefaultLayout>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, computed } from 'vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import { makeProgramPdf, type ProgramBlock, type ProgramPayload } from '@/lib/makeProgramPdf'
import { mdiDelete, mdiPlus, mdiFilePdfBox, mdiTrayArrowDown, mdiShareVariant } from '@mdi/js'

export default defineComponent({
  name: 'ProgramBuilder',
  components: { DefaultLayout },
  setup() {
    const formRef = ref<any>(null)
    const pdfBlob = ref<Blob | null>(null)
    const busy = ref(false)

    const form = reactive<ProgramPayload>({
      title: 'BRILS GYM - Training Program',
      client_name: '',
      notes: '',
      blocks: [
        {
          section: 'Day 1 – Push',
          exercises: [
            { name: 'Barbell Bench Press', sets: 4, reps: '6–8', rest: '2:00', notes: '' },
            { name: 'Incline DB Press', sets: 3, reps: '8–10', rest: '90s', notes: '' },
          ]
        }
      ]
      // no logoDataUrl (we don't use images)
    })

    function addBlock() {
      form.blocks.push({ section: `Section ${form.blocks.length + 1}`, exercises: [{ name: '', sets: '', reps: '', rest: '', notes: '' }] })
    }
    function removeBlock(idx: number) {
      form.blocks.splice(idx, 1)
    }
    function addExercise(blockIdx: number) {
      form.blocks[blockIdx].exercises.push({ name: '', sets: '', reps: '', rest: '', notes: '' })
    }
    function removeExercise(blockIdx: number, exIdx: number) {
      form.blocks[blockIdx].exercises.splice(exIdx, 1)
    }

    const shareSupported = computed(() => {
      return !!(navigator.share && navigator.canShare)
    })

    async function generatePdf() {
      busy.value = true
      try {
        pdfBlob.value = await makeProgramPdf(form)
      } catch (e) {
        console.error(e)
        pdfBlob.value = null
      } finally {
        busy.value = false
      }
    }

    function downloadPdf() {
      if (!pdfBlob.value) return
      const url = URL.createObjectURL(pdfBlob.value)
      const a = document.createElement('a')
      a.href = url
      a.download = (form.title || 'program').replace(/\s+/g, '_') + '.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }

    async function sharePdf() {
      if (!pdfBlob.value || !shareSupported.value) return
      try {
        const file = new File([pdfBlob.value], (form.title || 'program') + '.pdf', { type: 'application/pdf' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Training Program',
            text: `${form.title}${form.client_name ? ' for ' + form.client_name : ''}`,
            files: [file],
          })
        } else {
          downloadPdf()
        }
      } catch (e) {
        console.warn('Share failed, downloading instead', e)
        downloadPdf()
      }
    }

    return {
      formRef, form, pdfBlob, busy,
      addBlock, removeBlock, addExercise, removeExercise,
      generatePdf, downloadPdf, sharePdf,
      shareSupported,
      mdiDelete, mdiPlus, mdiFilePdfBox, mdiTrayArrowDown, mdiShareVariant
    }
  }
})
</script>

<style scoped>
.v-table thead tr {
  background: #111827;
  color: #f3f4f6;
}
.v-table tbody tr:nth-child(even) {
  background: #0b0f19;
}

.ex-table {
  overflow-x: auto;
}

.ex-table :deep(th),
.ex-table :deep(td) {
  padding: 6px 8px; 
}

.ex-table :deep(.v-field__input) {
  padding-top: 4px;
  padding-bottom: 4px;
  min-height: 34px;
}

.ex-table :deep(.v-field.v-field--variant-underlined .v-field__outline) {
}

/* Make the table horizontally scrollable on small screens */
.ex-table :deep(.v-table__wrapper) {
  overflow-x: auto;
}

/* Don't let the table collapse below this width (adjust to taste) */
.ex-table :deep(table) {
  min-width: 880px; /* try 820–960px depending on your preference */
}

/* Column minimums so inputs stay usable */
.ex-table :deep(th.col-exercise),
.ex-table :deep(td.col-exercise) { min-width: 280px; }

.ex-table :deep(th.col-notes),
.ex-table :deep(td.col-notes) { min-width: 240px; }

.ex-table :deep(th:nth-child(2)),
.ex-table :deep(td:nth-child(2)) { min-width: 72px; }  /* Sets */

.ex-table :deep(th:nth-child(3)),
.ex-table :deep(td:nth-child(3)) { min-width: 72px; }  /* Reps */

.ex-table :deep(th:nth-child(4)),
.ex-table :deep(td:nth-child(4)) { min-width: 90px; }  /* Rest */

.ex-table :deep(th:last-child),
.ex-table :deep(td:last-child) { min-width: 44px; }     /* Delete icon */

/* Optional: on very narrow phones, give a bit more room */
@media (max-width: 400px) {
  .ex-table :deep(table) { min-width: 940px; }
}

</style>
