<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title>Register</v-card-title>
          <v-card-text>
            <!-- Errors -->
            <v-alert
              v-if="errorMsg"
              type="error"
              variant="tonal"
              class="mb-3"
              :text="errorMsg"
            />

            <!-- Success -->
            <v-alert
              v-if="successMsg"
              type="success"
              variant="tonal"
              class="mb-3"
            >
              {{ successMsg }}
              <div class="mt-2">
                <RouterLink to="/login" class="text-accent">Go to Login</RouterLink>
              </div>
            </v-alert>

            <v-form @submit.prevent="onSubmit">
              <v-text-field
                v-model.trim="email"
                label="Email"
                type="email"
                :disabled="loading || !!successMsg"
                required
              />
              <v-text-field
                v-model="pwd"
                label="Password"
                :type="showPw ? 'text' : 'password'"
                :append-inner-icon="showPw ? 'mdi-eye-off' : 'mdi-eye'"
                @click:append-inner="showPw = !showPw"
                :disabled="loading || !!successMsg"
                required
              />
              <v-btn
                type="submit"
                color="accent"
                block
                :loading="loading"
                :disabled="!!successMsg"
              >
                Create Account
              </v-btn>
            </v-form>
          </v-card-text>

          <v-card-actions v-if="!successMsg">
            <v-spacer />
            <RouterLink to="/login" class="text-accent">Already have an account?</RouterLink>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/store/auth'

const email = ref('')
const pwd = ref('')
const showPw = ref(false)
const loading = ref(false)
const errorMsg = ref<string | null>(null)
const successMsg = ref<string | null>(null)

const auth = useAuthStore()

function prettyErr(err: any): string {
  const msg = err?.message || ''
  if (/password/i.test(msg) && /weak|length|short/i.test(msg)) return 'Password is too weak.'
  if (/user already registered|duplicate|exists/i.test(msg)) return 'This email is already registered.'
  if (/rate limit|too many/i.test(msg)) return 'Too many attempts. Please try again later.'
  return msg || 'Registration failed. Please try again.'
}

async function onSubmit() {
  errorMsg.value = null
  successMsg.value = null
  loading.value = true
  try {
    await auth.register(email.value, pwd.value)
    // Do NOT log in automatically. Ask user to verify email.
    successMsg.value = 'Registration successful. Please check your email and click the confirmation link to activate your account.'
  } catch (e: any) {
    console.error(e)
    errorMsg.value = prettyErr(e)
  } finally {
    loading.value = false
  }
}
</script>
