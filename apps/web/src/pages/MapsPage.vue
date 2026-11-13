<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { currentUser, fetchWithTimeout, logout } from '../auth';

interface MapSummary {
  id: string;
  isOwner: boolean;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const router = useRouter();
const maps = ref<MapSummary[]>([]);
const loading = ref(true);
const saving = ref(false);
const errorMessage = ref('');
const dialogOpen = ref(false);
const dialogMode = ref<'create' | 'edit'>('create');
const activeMapId = ref<string | null>(null);
const name = ref('');
const description = ref('');
const pendingDelete = ref<MapSummary | null>(null);

async function errorFrom(response: Response) {
  const body = await response.json().catch(() => ({}));
  return Array.isArray(body.message) ? body.message.join(' ') : body.message || 'Não foi possível concluir a operação.';
}

async function loadMaps() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const response = await fetchWithTimeout(`${apiUrl}/maps`, { credentials: 'include' });
    if (!response.ok) throw new Error(await errorFrom(response));
    maps.value = await response.json() as MapSummary[];
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha de conexão com a API.';
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  dialogMode.value = 'create';
  activeMapId.value = null;
  name.value = '';
  description.value = '';
  dialogOpen.value = true;
}

function openEdit(map: MapSummary) {
  dialogMode.value = 'edit';
  activeMapId.value = map.id;
  name.value = map.name;
  description.value = map.description || '';
  dialogOpen.value = true;
}

async function saveMap() {
  saving.value = true;
  errorMessage.value = '';
  try {
    const editing = dialogMode.value === 'edit' && activeMapId.value;
    const response = await fetchWithTimeout(`${apiUrl}/maps${editing ? `/${activeMapId.value}` : ''}`, {
      method: editing ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.value, description: description.value }),
    });
    if (!response.ok) throw new Error(await errorFrom(response));
    dialogOpen.value = false;
    await loadMaps();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha ao salvar o mapa.';
  } finally {
    saving.value = false;
  }
}

async function deleteMap() {
  if (!pendingDelete.value) return;
  const map = pendingDelete.value;
  saving.value = true;
  errorMessage.value = '';
  try {
    const response = await fetchWithTimeout(`${apiUrl}/maps/${map.id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw new Error(await errorFrom(response));
    pendingDelete.value = null;
    await loadMaps();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha ao excluir o mapa.';
  } finally {
    saving.value = false;
  }
}

async function signOut() {
  await logout();
  await router.replace('/login');
}

onMounted(loadMaps);
</script>

<template>
  <q-layout view="hHh Lpr fFf" class="maps-layout">
    <q-header class="topbar">
      <q-toolbar>
        <q-avatar square class="brand-mark"><q-icon name="route" size="22px" /></q-avatar>
        <q-toolbar-title class="brand-title">rota fácil<span class="brand-dot">.</span></q-toolbar-title>
        <q-space />
        <span class="user-email">{{ currentUser?.name || currentUser?.email }}</span>
        <q-btn flat round icon="logout" aria-label="Sair" @click="signOut" />
      </q-toolbar>
    </q-header>
    <q-page-container>
      <q-page class="maps-page">
        <section class="page-heading">
          <div>
            <div class="eyebrow">SUA ÁREA DE TRABALHO</div>
            <h1>Seus mapas.</h1>
            <p>Crie mapas personalizados e mantenha seus lugares organizados.</p>
          </div>
          <q-btn unelevated rounded color="primary" icon="add" label="Novo mapa" @click="openCreate" />
        </section>

        <q-banner v-if="errorMessage" rounded class="error-banner" role="alert">{{ errorMessage }}</q-banner>
        <div v-if="loading" class="state-message"><q-spinner color="primary" size="28px" /> Carregando seus mapas…</div>
        <div v-else-if="maps.length" class="map-grid">
          <q-card v-for="map in maps" :key="map.id" flat bordered class="map-card">
            <q-card-section>
              <div class="card-topline">
                <div class="map-icon"><q-icon name="map" size="22px" /></div>
                <q-btn v-if="map.isOwner" flat round dense icon="more_horiz" aria-label="Ações do mapa">
                  <q-menu>
                    <q-list dense style="min-width: 140px">
                      <q-item v-close-popup clickable @click="openEdit(map)"><q-item-section avatar><q-icon name="edit" /></q-item-section><q-item-section>Editar</q-item-section></q-item>
                      <q-item v-close-popup clickable class="delete-action" @click="pendingDelete = map"><q-item-section avatar><q-icon name="delete_outline" /></q-item-section><q-item-section>Excluir</q-item-section></q-item>
                    </q-list>
                  </q-menu>
                </q-btn>
              </div>
              <h2>{{ map.name }}</h2><q-badge v-if="!map.isOwner" color="primary" label="Compartilhado" />
              <p class="description">{{ map.description || 'Sem descrição.' }}</p>
              <div class="card-date">Atualizado em {{ new Date(map.updatedAt).toLocaleDateString('pt-BR') }}</div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn flat rounded color="primary" label="Abrir mapa" :to="`/workspace/maps/${map.id}`" />
              <q-btn v-if="map.isOwner" flat round dense icon="edit" aria-label="Editar mapa" @click="openEdit(map)" />
            </q-card-actions>
          </q-card>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon"><q-icon name="map" size="30px" /></div>
          <h2>Seu primeiro mapa começa aqui.</h2>
          <p>Crie um mapa para reunir os lugares que quer visitar.</p>
          <q-btn unelevated rounded color="primary" icon="add" label="Criar meu primeiro mapa" @click="openCreate" />
        </div>
      </q-page>
    </q-page-container>

    <q-dialog v-model="dialogOpen">
      <q-card class="map-dialog">
        <q-card-section>
          <div class="dialog-title">{{ dialogMode === 'create' ? 'Criar mapa' : 'Editar mapa' }}</div>
          <div class="dialog-subtitle">Dê um nome para organizar seus lugares.</div>
        </q-card-section>
        <q-form @submit.prevent="saveMap">
          <q-card-section class="dialog-fields">
            <q-input v-model.trim="name" outlined autofocus label="Nome do mapa" maxlength="120" counter lazy-rules :rules="[(value: string) => value.trim().length > 0 || 'Informe um nome.']" />
            <q-input v-model="description" outlined type="textarea" label="Descrição (opcional)" maxlength="1000" counter autogrow />
          </q-card-section>
          <q-card-actions align="right" class="dialog-actions">
            <q-btn flat rounded label="Cancelar" v-close-popup />
            <q-btn unelevated rounded color="primary" type="submit" :loading="saving" :label="dialogMode === 'create' ? 'Criar mapa' : 'Salvar alterações'" />
          </q-card-actions>
        </q-form>
      </q-card>
    </q-dialog>

    <q-dialog :model-value="Boolean(pendingDelete)" @update:model-value="value => { if (!value) pendingDelete = null }">
      <q-card class="delete-dialog">
        <q-card-section>
          <div class="dialog-title">Excluir mapa?</div>
          <div class="dialog-subtitle">“{{ pendingDelete?.name }}” será removido da sua lista.</div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat rounded label="Cancelar" @click="pendingDelete = null" />
          <q-btn unelevated rounded color="negative" label="Excluir" :loading="saving" @click="deleteMap" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<style scoped>
.maps-layout { min-height:100vh; background:#f7f8f6; color:#1f2b29; }
.topbar { background:#f7f8f6; color:#1f2b29; border-bottom:1px solid #e5e9e5; }
.q-toolbar { max-width:1200px; margin:auto; min-height:72px; padding:0 28px; }
.brand-mark { background:#155e57; color:#fff; border-radius:12px; }.brand-title { margin-left:12px; font:800 21px 'Manrope',sans-serif; letter-spacing:-1px; }.brand-dot { color:#d69554; }
.user-email { color:#75827c; font-size:12px; margin-right:8px; }
.maps-page { max-width:1160px; margin:auto; padding:64px 28px; }
.page-heading { display:flex; justify-content:space-between; align-items:end; gap:20px; margin-bottom:30px; }
.page-heading .q-btn { min-height:46px; padding:0 18px; text-transform:none; font-weight:600; }
.eyebrow { color:#608176; font-size:10px; font-weight:700; letter-spacing:.16em; }
h1 { margin:12px 0 7px; font:700 42px 'Manrope',sans-serif; letter-spacing:-1.5px; }
.page-heading p { color:#75827c; margin:0; }
.map-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:16px; }
.map-card { border-color:#e2e9e3; border-radius:17px; background:#fff; transition:transform .16s ease,box-shadow .16s ease; }
.map-card:hover { transform:translateY(-2px); box-shadow:0 12px 28px #26392f10; }
.map-card .q-card__section { min-height:190px; padding:20px; }
.card-topline { display:flex; justify-content:space-between; align-items:center; }
.map-icon,.empty-icon { display:grid; place-items:center; width:44px;height:44px;border-radius:13px;background:#e8f0eb;color:#155e57; }
.map-card h2 { margin:18px 0 7px; font:700 18px 'Manrope',sans-serif; letter-spacing:-.4px; }
.description { color:#75827c; font-size:12px; line-height:1.5; min-height:18px; margin:0; overflow-wrap:anywhere; }
.card-date { margin-top:17px; color:#97a19c; font-size:10px; }
.map-card .q-card__actions { min-height:54px; padding:6px 12px; }.map-card .q-btn { text-transform:none; }
.delete-action { color:#a94435; }
.empty-state,.state-message { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:330px; text-align:center; color:#718078; }
.empty-state { border:1px dashed #cbd8cf; border-radius:20px; background:#fbfcfa; padding:30px; }
.empty-state h2 { margin:17px 0 6px; color:#283732; font:700 20px 'Manrope',sans-serif; }.empty-state p { margin:0 0 20px; font-size:13px; }
.empty-state .q-btn { text-transform:none; }.state-message { flex-direction:row; gap:12px; font-size:13px; }
.error-banner { margin-bottom:20px; background:#fff0ed; color:#943e30; font-size:13px; }
.map-dialog,.delete-dialog { width:min(100%,480px); border-radius:18px; padding:8px; }
.dialog-title { color:#24332d; font:700 21px 'Manrope',sans-serif; letter-spacing:-.5px; }.dialog-subtitle { margin-top:6px; color:#7b8882; font-size:12px; }
.dialog-fields { display:grid; gap:8px; padding-top:4px; }.dialog-actions { padding:12px 16px 16px; }
@media(max-width:650px) { .maps-page { padding:46px 17px; }.page-heading { align-items:start; flex-direction:column; } h1 { font-size:35px; }.page-heading .q-btn { align-self:stretch; } }
</style>
