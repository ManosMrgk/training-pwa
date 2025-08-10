<template>
  <v-app>
    <!-- Top bar -->
    <v-app-bar app color="surface">
      <v-app-bar-nav-icon :style="{ color: appTitleColor }" @click="drawer = !drawer" />
      <v-toolbar-title
        :style="{ color: appTitleColor, fontWeight: appTitleWeight }"
      >
        {{ appTitle }}
      </v-toolbar-title>
      <v-spacer />

      <!-- <v-btn
        v-if="showAdminButton"
        variant="text"
        color="accent"
        @click="goToAdmin"
      >
        <v-icon :icon="mdiShieldCrown" class="mr-1" />
        Admin
      </v-btn>

      <v-btn
        v-if="showDashboardButton"
        variant="text"
        color="accent"
        @click="goToDashboard"
      >
        <v-icon :icon="mdiViewDashboard" class="mr-1" />
        Dashboard
      </v-btn>

      <v-btn variant="text" color="accent" @click="logout">Logout</v-btn> -->
    </v-app-bar>

    <!-- Drawer on surface -->
    <v-navigation-drawer app v-model="drawer" temporary color="surface">
      <v-list nav density="compact">
        <v-list-item
          v-if="showAdminButton"
          link
          @click="goToAdmin"
        >
          <template #prepend>
            <v-icon :icon="mdiShieldCrown" color="accent" />
          </template>
          <v-list-item-title class="text-accent">Admin</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-else-if="showDashboardButton"
          link
          @click="goToDashboard"
        >
          <template #prepend>
            <v-icon :icon="mdiViewDashboard" color="accent" />
          </template>
          <v-list-item-title class="text-accent">Dashboard</v-list-item-title>
        </v-list-item>
      </v-list>

      <template #append>
        <v-list nav density="compact">
          <v-list-item link @click="logout">
            <template #prepend>
              <v-icon :icon="mdiLogout" color="accent" />
            </template>
            <v-list-item-title class="text-accent">Logout</v-list-item-title>
          </v-list-item>
        </v-list>
      </template>
    </v-navigation-drawer>

    <!-- Gray page body -->
    <v-main class="bg-background">
      <v-container fluid>
        <slot />
      </v-container>
    </v-main>

    <!-- Footer -->
    <v-footer app padless color="surface">
      <v-col class="text-center py-4" cols="12">
        © {{ year }} {{ appTitle }}
      </v-col>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { mdiLogout, mdiViewDashboard, mdiShieldCrown } from '@mdi/js';
import appConfig from '@/config/app';

export default defineComponent({
  name: 'DefaultLayout',
  setup() {
    const appTitle = appConfig.title;
    const appTitleWeight = appConfig.ui.titleWeight;
    const appTitleColor = appConfig.ui.titleColor;

    const drawer = ref(false);
    const router = useRouter();
    const route = useRoute();
    const auth = useAuthStore();

    const isAdmin = computed(() => auth.user?.role === 'admin');
    const isOnAdmin = computed(() => route.path.startsWith('/admin'));

    const showAdminButton = computed(() => isAdmin.value && !isOnAdmin.value);
    const showDashboardButton = computed(() => (isAdmin.value && isOnAdmin.value) || !isAdmin.value);

    function goToDashboard() { router.push('/'); }
    function goToAdmin() { router.push('/admin'); }
    async function logout() { await auth.logout(); router.push('/login'); }

    const year = new Date().getFullYear();

    return {
      drawer,
      goToDashboard,
      goToAdmin,
      logout,
      showAdminButton,
      showDashboardButton,
      mdiLogout,
      mdiViewDashboard,
      mdiShieldCrown,
      appTitle,
      appTitleWeight,
      appTitleColor,
      year,
    };
  }
});
</script>
