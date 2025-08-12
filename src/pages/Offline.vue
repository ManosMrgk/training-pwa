<template>
  <v-container class="offline-wrap fill-height d-flex align-center justify-center">
    <v-card class="offline-card text-center elevation-3">
      <!-- Icon ring -->
      <div class="icon-ring mx-auto mb-6">
        <v-icon :icon="icons.wifi" size="84" class="text-accent" />
      </div>

      <h2 class="mb-1">You’re offline</h2>
      <p class="mb-6 text-medium-emphasis">
        Please reconnect to continue. I’ll auto-retry when you’re back online.
      </p>

      <div class="d-flex justify-center ga-3">
        <v-btn color="accent" @click="retry" :prepend-icon="icons.refresh">
          Retry
        </v-btn>
      </div>

      <div class="mt-6 tiny-hint text-disabled">
        Tip: if you just reconnected, a quick refresh usually does the trick.
      </div>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
// ⬇️ import SVG paths from @mdi/js
import { mdiWifiOff, mdiRefresh } from '@mdi/js'

const router = useRouter()
const route = useRoute()

// ⬇️ bind the actual path strings
const icons = {
  wifi: mdiWifiOff,
  refresh: mdiRefresh,
}

function retry() {
  router.replace('/')
}

function handleOnline() {
  const redirect = (route.query.redirect as string) || '/'
  router.replace(redirect)
}

onMounted(() => window.addEventListener('online', handleOnline))
onBeforeUnmount(() => window.removeEventListener('online', handleOnline))
</script>


<style scoped>
.offline-wrap {
  /* subtle dark gradient that fits your gym palette */
  background: radial-gradient(1200px 600px at 50% -10%, rgba(234, 179, 8, 0.09), transparent 60%),
              linear-gradient(180deg, #0f1115 0%, #0b0f19 100%);
  padding: 24px;
}

.offline-card {
  max-width: 520px;
  width: 100%;
  padding: 32px 28px;
  border-radius: 18px;
  background: rgba(17, 24, 39, 0.9); /* near your dark surface */
  backdrop-filter: saturate(120%) blur(6px);
}

/* Icon ring with soft pulse */
.icon-ring {
  position: relative;
  width: 128px;
  height: 128px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  background: radial-gradient(64px 64px at 50% 50%, rgba(250, 204, 21, 0.08), rgba(250, 204, 21, 0.02));
  box-shadow:
    0 0 0 1px rgba(250, 204, 21, 0.15) inset,
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 24px rgba(250, 204, 21, 0.06);
  animation: ringPulse 2.4s ease-in-out infinite;
}

@keyframes ringPulse {
  0%, 100% { box-shadow:
    0 0 0 1px rgba(250, 204, 21, 0.18) inset,
    0 8px 24px rgba(0,0,0,0.4),
    0 0 18px rgba(250, 204, 21, 0.07);
  }
  50% { box-shadow:
    0 0 0 1px rgba(250, 204, 21, 0.28) inset,
    0 8px 24px rgba(0,0,0,0.4),
    0 0 26px rgba(250, 204, 21, 0.12);
  }
}

/* Second icon layered on top for the “no connection” vibe */
.overlay-icon {
  position: absolute;
  bottom: 18px;
  right: 18px;
  opacity: 0.9;
}

/* Small helper text */
.tiny-hint {
  font-size: 0.82rem;
}
</style>
