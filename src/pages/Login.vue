<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title>Log In</v-card-title>
          <v-card-text>
            <v-alert
              v-if="errorMsg"
              type="error"
              variant="tonal"
              class="mb-3"
              :text="errorMsg"
            />
            <v-form @submit.prevent="submit">
              <v-text-field
                v-model.trim="email"
                label="Email"
                type="email"
                :disabled="loading"
                required
              />
              <v-text-field
                v-model="password"
                label="Password"
                :type="showPw ? 'text' : 'password'"
                :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPw = !showPw"
                :disabled="loading"
                required
              />
              <v-btn
                type="submit"
                color="accent"
                block
                :loading="loading"
              >
                Log In
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <RouterLink to="/register" class="text-accent">Sign Up</RouterLink>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useRouter, useRoute } from 'vue-router'
// CHANGE: Remove the import statements for the icons
// import { mdiEye, mdiEyeOff } from '@mdi/js'

export default defineComponent({
  setup() {
    const email = ref('')
    const password = ref('')
    const showPw = ref(false)
    const loading = ref(false)
    const errorMsg = ref<string | null>(null)

    const auth = useAuthStore()
    const router = useRouter()
    const route = useRoute()

    function prettyErr(err: any): string {
      const msg = err?.message || ''
      if (/Invalid login credentials/i.test(msg)) return 'Invalid email or password.'
      if (/Email not confirmed|Email not verified/i.test(msg)) return 'Please verify your email before logging in.'
      return msg || 'Login failed. Please try again.'
    }

    async function submit() {
      errorMsg.value = null
      loading.value = true
      try {
        await auth.login(email.value, password.value)
        // optional redirect support: /login?redirect=/admin
        const redirect = (route.query.redirect as string) || '/'
        router.push(redirect)
      } catch (e: any) {
        console.error(e)
        errorMsg.value = prettyErr(e)
      } finally {
        loading.value = false
      }
    }

    // CHANGE: Remove the icons from the return statement
    return { email, password, showPw, loading, errorMsg, submit }
  }
})
</script>