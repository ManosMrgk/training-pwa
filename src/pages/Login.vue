<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="6" md="4">
        <v-card>
          <v-card-title>Log In</v-card-title>
          <v-card-text>
            <v-form @submit.prevent="submit">
              <v-text-field
                v-model="email"
                label="Email"
                required
              />
              <v-text-field
                v-model="password"
                label="Password"
                type="password"
                required
              />
              <v-btn type="submit" color="accent" block>Log In</v-btn>
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
import { defineComponent, ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';

export default defineComponent({
  setup() {
    const email = ref('');
    const password = ref('');
    const auth = useAuthStore();
    const router = useRouter();

    async function submit() {
      await auth.login(email.value, password.value);
      router.push('/');
    }

    return { email, password, submit };
  }
});
</script>