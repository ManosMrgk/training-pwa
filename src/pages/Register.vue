<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title>Register</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="onSubmit">
              <v-text-field label="Email" v-model="email" required />
              <v-text-field label="Password" v-model="pwd" type="password" required />
              <v-btn type="submit" color="accent" block>Register</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useRouter } from 'vue-router'

const email = ref('')
const pwd = ref('')
const auth = useAuthStore()
const router = useRouter()

async function onSubmit() {
  await auth.register(email.value, pwd.value)
  router.push('/')
}
</script>