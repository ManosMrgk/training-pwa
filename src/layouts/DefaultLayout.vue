<template>
  <v-app>
    <v-app-bar app color="surface">
      <v-app-bar-nav-icon :style="{ color: appTitleColor }" @click="drawer = !drawer" />
      <v-toolbar-title
        :style="{ color: appTitleColor, fontWeight: appTitleWeight }"
      >
        {{ appTitle }}
      </v-toolbar-title>
      <v-spacer />
    </v-app-bar>

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
          v-if="showDashboardButton"
          link
          @click="goToDashboard"
        >
          <template #prepend>
            <v-icon :icon="mdiViewDashboard" color="accent" />
          </template>
          <v-list-item-title class="text-accent">Dashboard</v-list-item-title>
        </v-list-item>

        <v-list-item
          v-if="showProgramsButton"
          link
          @click="goToPrograms"
        >
          <template #prepend>
            <v-icon :icon="mdiCalendarEdit" color="accent" />
          </template>
          <v-list-item-title class="text-accent">Programs</v-list-item-title>
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

    <v-main class="bg-background layout-main">
      <div class="scroll-area">
        <v-container fluid class="fill-height">
          <slot />
        </v-container>
      </div>
    </v-main>

    <v-footer app padless color="surface">
      <v-col class="text-center py-3" cols="12">
        © {{ year }} {{ appTitle }}
      </v-col>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { mdiLogout, mdiViewDashboard, mdiShieldCrown, mdiCalendarEdit } from '@mdi/js';
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
    const isOnAdmin = computed(() => route.path === '/admin');
    const isOnDashboard = computed(() => route.path === '/');
    const isOnPrograms = computed(() => route.path === '/admin/programs');

    const showAdminButton = computed(() => isAdmin.value && !isOnAdmin.value);
    const showProgramsButton = computed(() => isAdmin.value && !isOnPrograms.value);
    const showDashboardButton = computed(() => (!isOnDashboard.value));

    function goToDashboard() { router.push('/'); }
    function goToAdmin() { router.push('/admin'); }
    function goToPrograms() { router.push('/admin/programs'); }
    async function logout() { await auth.logout(); router.push('/login'); }

    const year = new Date().getFullYear();

    return {
      drawer,
      goToDashboard,
      goToAdmin,
      goToPrograms,
      logout,
      showAdminButton,
      showProgramsButton,
      showDashboardButton,
      mdiLogout,
      mdiViewDashboard,
      mdiShieldCrown,
      mdiCalendarEdit,
      appTitle,
      appTitleWeight,
      appTitleColor,
      year,
    };
  }
});
</script>

<style scoped>
.layout-main {
  height: 100dvh; /* Use 100dvh for more accurate mobile sizing */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.scroll-area {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto; /* This is where the scrollbar is */
  -webkit-overflow-scrolling: touch;
  padding-bottom: env(safe-area-inset-bottom);
}

.fill-height {
  height: 100%;
}
</style>