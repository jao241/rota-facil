import { createApp } from 'vue';
import { Quasar } from 'quasar';
import '@quasar/extras/material-icons/material-icons.css';
import 'quasar/src/css/index.sass';
import 'maplibre-gl/dist/maplibre-gl.css';
import router from './router';
import App from './App.vue';

createApp(App).use(Quasar, { plugins: {} }).use(router).mount('#app');
