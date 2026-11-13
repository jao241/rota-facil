<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { currentUser, fetchWithTimeout } from '../auth';

const props = defineProps<{ mode: 'login' | 'register' }>();
const router = useRouter();
const route = useRoute();
const name = ref('');
const cpf = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const busy = ref(false);
const errorMessage = ref('');
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function isValidCpf(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  const checkDigit = (base: string, factor: number) => {
    const sum = [...base].reduce((total, digit, index) => total + Number(digit) * (factor - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return checkDigit(digits.slice(0, 9), 10) === Number(digits[9])
    && checkDigit(digits.slice(0, 10), 11) === Number(digits[10]);
}

async function submit() {
  if (props.mode === 'register' && password.value !== confirmPassword.value) {
    errorMessage.value = 'As senhas não coincidem.';
    return;
  }
  if (props.mode === 'register' && !isValidCpf(cpf.value)) {
    errorMessage.value = 'Confira o CPF informado.';
    return;
  }
  busy.value = true;
  errorMessage.value = '';
  try {
    const response = await fetchWithTimeout(`${apiUrl}/auth/${props.mode}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(props.mode === 'register'
        ? { name: name.value, cpf: cpf.value, email: email.value, password: password.value }
        : { email: email.value, password: password.value }),
    });
    const result = await response.json();
    if (!response.ok) {
      const message = result.message;
      throw new Error(Array.isArray(message) ? message.join(' ') : message || 'Não foi possível autenticar.');
    }
    currentUser.value = result;
    const redirect = route.query.redirect;
    await router.replace(typeof redirect === 'string' && redirect.startsWith('/workspace') ? redirect : '/workspace');
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha de conexão com a API.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <q-layout view="lHh Lpr lFf" class="auth-layout">
    <q-page-container>
      <q-page class="auth-page">
        <main class="auth-card">
          <div class="auth-brand"><q-avatar square><q-icon name="route" /></q-avatar><span>rota fácil<span class="brand-dot">.</span></span></div>
          <div class="eyebrow">SEU PRÓXIMO CAMINHO</div>
          <h1>{{ mode === 'register' ? 'Crie sua conta.' : 'Que bom ter você de volta.' }}</h1>
          <p class="subtitle">{{ mode === 'register' ? 'Organize seus mapas e trajetos em um só lugar.' : 'Entre para continuar seus mapas e trajetos.' }}</p>

          <q-banner v-if="errorMessage" rounded class="error-banner" role="alert">{{ errorMessage }}</q-banner>
          <q-form class="auth-form" @submit.prevent="submit">
            <q-input v-if="mode === 'register'" v-model.trim="name" outlined label="Nome completo" autocomplete="name" lazy-rules :rules="[(value: string) => value.trim().length >= 2 || 'Informe seu nome completo.']" />
            <q-input v-if="mode === 'register'" v-model="cpf" outlined label="CPF" mask="###.###.###-##" inputmode="numeric" autocomplete="off" lazy-rules :rules="[(value: string) => isValidCpf(value) || 'Confira o CPF informado.']" />
            <q-input v-model.trim="email" outlined label="E-mail" type="email" autocomplete="email" lazy-rules :rules="[(value: string) => /.+@.+\..+/.test(value) || 'Informe um e-mail válido.']" />
            <q-input v-model="password" outlined label="Senha" type="password" :autocomplete="mode === 'register' ? 'new-password' : 'current-password'" :hint="mode === 'register' ? 'Use ao menos 12 caracteres.' : undefined" :rules="mode === 'register' ? [(value: string) => value.length >= 12 || 'Use ao menos 12 caracteres.'] : []" />
            <q-input v-if="mode === 'register'" v-model="confirmPassword" outlined label="Verificar senha" type="password" autocomplete="new-password" lazy-rules :rules="[(value: string) => value === password || 'As senhas não coincidem.']" />
            <q-btn class="submit-button full-width" unelevated rounded color="primary" type="submit" :loading="busy" :label="mode === 'register' ? 'Criar conta' : 'Entrar'" />
          </q-form>
          <div class="switch-mode">
            {{ mode === 'register' ? 'Já tem uma conta?' : 'Ainda não tem conta?' }}
            <router-link :to="mode === 'register' ? '/login' : '/register'">{{ mode === 'register' ? 'Entrar' : 'Criar conta' }}</router-link>
          </div>
          <div class="security-note"><q-icon name="lock" /> Sessão protegida neste dispositivo</div>
        </main>
        <aside class="auth-aside">
          <div class="aside-orb orb-one"></div><div class="aside-orb orb-two"></div>
          <div class="aside-copy"><div class="eyebrow">MENOS DESVIO. MAIS DESTINO.</div><h2>Seus lugares.<br />Sua ordem.<br /><em>Seu caminho.</em></h2><p>Crie mapas personalizados e organize seus pontos de visita do seu jeito.</p></div>
          <div class="route-art"><div class="route-line"></div><span class="route-pin pin-start">A</span><span class="route-pin pin-end">B</span></div>
          <div class="aside-footer">MAPAS QUE ACOMPANHAM SEU PLANO</div>
        </aside>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.auth-layout { min-height: 100vh; background: #f6f8f5; }
.auth-page { display: grid; grid-template-columns: minmax(400px, 1fr) minmax(380px, .9fr); min-height: 100vh; padding: 24px; gap: 24px; }
.auth-card { width: min(100%, 440px); margin: auto; padding: 28px 12px; }
.auth-brand { display:flex; align-items:center; gap:12px; font:800 20px 'Manrope',sans-serif; letter-spacing:-.8px; margin-bottom:56px; }
.auth-brand .q-avatar { background:#155e57; color:white; border-radius:12px; }
.brand-dot { color:#d69554; }
.eyebrow { color:#608176; font-size:10px; font-weight:700; letter-spacing:.16em; }
h1 { margin:12px 0 8px; font:700 34px 'Manrope',sans-serif; letter-spacing:-1.4px; color:#1f2b29; }
.subtitle { color:#77847e; font-size:14px; margin:0 0 28px; }
.auth-form { display:grid; gap:12px; }
.submit-button { min-height:48px; margin-top:6px; text-transform:none; font-weight:600; }
.switch-mode { text-align:center; margin-top:22px; color:#78857f; font-size:13px; }
.switch-mode a { color:#155e57; font-weight:700; text-decoration:none; margin-left:4px; }
.security-note { display:flex; align-items:center; justify-content:center; gap:7px; margin-top:48px; color:#88958e; font-size:11px; }
.error-banner { margin-bottom:18px; background:#fff0ed; color:#943e30; font-size:13px; }
.auth-aside { position:relative; overflow:hidden; min-height:calc(100vh - 48px); border-radius:24px; background:#155e57; color:white; padding:52px; display:flex; flex-direction:column; justify-content:space-between; }
.auth-aside .eyebrow { color:#acd0bf; }
.aside-copy { z-index:1; margin-top:70px; }
.aside-copy h2 { font:700 clamp(40px,5vw,62px) 'Manrope',sans-serif; letter-spacing:-2.6px; line-height:1.12; margin:18px 0; }
.aside-copy em { font-style:normal; color:#e6ad73; }
.aside-copy p { max-width:340px; color:#d1e3da; font-size:15px; line-height:1.7; }
.route-art { position:relative; height:175px; margin-left:10%; }
.route-line { position:absolute; left:25px; top:35px; width:75%; height:100px; border-top:2px dashed #b3d2c3; border-radius:50%; transform:rotate(-15deg); }
.route-pin { position:absolute; display:grid; place-items:center; width:38px; height:38px; border:3px solid #d8eadf; border-radius:50% 50% 50% 0; transform:rotate(-45deg); background:#d69554; font-weight:700; color:white; box-shadow:0 6px 18px #0e413a66; }
.route-pin::first-letter { transform:rotate(45deg); }
.pin-start { left:10%; top:78px; }.pin-end { right:14%; top:5px; background:#e6ad73; }
.aside-footer { z-index:1; color:#acd0bf; font-size:9px; font-weight:700; letter-spacing:.17em; }
.aside-orb { position:absolute; border:1px solid #ffffff1c; border-radius:50%; }.orb-one { width:500px;height:500px;right:-180px;top:5%; }.orb-two { width:350px;height:350px;right:-90px;top:20%; }
@media(max-width:850px) { .auth-page { grid-template-columns:1fr; padding:20px; }.auth-aside { display:none; }.auth-card { width:min(100%,440px); }.auth-brand { margin-bottom:46px; } }
</style>
