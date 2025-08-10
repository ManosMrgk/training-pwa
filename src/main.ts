import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createPinia } from 'pinia';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { registerSW } from 'virtual:pwa-register';
import { useAuthStore } from './store/auth';
import { VCalendar } from 'vuetify/labs/VCalendar'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import appConfig from '@/config/app';

const light = { dark: false, colors: appConfig.theme.light };
const dark  = { dark: true,  colors: appConfig.theme.dark };

const vuetify = createVuetify({ 
  theme: {
    defaultTheme: appConfig.theme.default,
    themes: { light, dark },
  },
  components: {
    VCalendar,
    ...components
  }, directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    },
  }
});
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);

async function bootstrap() {
  // Initialize your auth store (v2) before mounting
  const authStore = useAuthStore();
  await authStore.init();

  // Now install router & Vuetify and mount
  app.use(router).use(vuetify).mount('#app');

  // Finally, register the PWA service worker
  registerSW({
    onOfflineReady() {},
    onNeedRefresh() {}
  });
}

// Kick things off without top-level await
bootstrap();