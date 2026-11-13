<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { LngLatBounds, Map, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource } from 'maplibre-gl';
import type { Feature, FeatureCollection, LineString } from 'geojson';
import { fetchWithTimeout } from '../auth';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

setWorkerUrl(mapWorkerUrl);

interface MapDetails { isOwner: boolean; id: string; name: string; description: string | null; createdAt: string; updatedAt: string }
interface MapPoint { id: string; name: string | null; latitude: number; longitude: number; position: number; visitedAt: string | null; createdAt: string; updatedAt: string }
interface MapRoute { geometry: LineString | null; costing: string; calculatedAt: string | null; error: string | null }
interface AddressSuggestion { id: string; label: string; latitude: number; longitude: number; resultType: string | null; confidence: number | null }

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const route = useRoute();
const mapDetails = ref<MapDetails | null>(null);
interface MapResponsible { id: string; name: string | null; email: string }
const accessDialogOpen = ref(false);
const responsibleEmail = ref('');
const responsibleUsers = ref<MapResponsible[]>([]);
const accessError = ref('');
const accessSaving = ref(false);

const points = ref<MapPoint[]>([]);
const savedRoute = ref<MapRoute | null>(null);
const selectedPointId = ref<string | null>(null);
const draggedPointId = ref<string | null>(null);
const loading = ref(true);
const saving = ref(false);
const addingPoint = ref(false);
const mapReady = ref(false);
const addressSearchOpen = ref(false);
const addressQuery = ref('');
const addressSuggestions = ref<AddressSuggestion[]>([]);
const searchingAddress = ref(false);
const addressSearchMessage = ref('');
const renameDialogOpen = ref(false);
const renameValue = ref('');
const renamingPoint = ref<MapPoint | null>(null);
const renaming = ref(false);
const pendingAddress = ref<AddressSuggestion | null>(null);
const previewCoordinates = ref('');
const locationTracking = ref(false);
const locationStatus = ref('');
const locationError = ref('');
const errorMessage = ref('');
const mapStatus = ref('Carregando mapa…');
const pointCountLabel = computed(() => `${points.value.length} ${points.value.length === 1 ? 'ponto' : 'pontos'}`);
const routeMessage = computed(() => savedRoute.value?.error || (points.value.length < 2 ? 'Adicione pelo menos dois pontos para calcular a rota.' : savedRoute.value?.calculatedAt ? 'Rota calculada e salva.' : 'Calculando rota…'));
let map: Map | undefined;
let mapLoaded = false;
let markers: Marker[] = [];
let previewMarker: Marker | undefined;
let addressSearchController: AbortController | undefined;
let locationWatchId: number | undefined;
let deviceLocationMarker: Marker | undefined;
let currentDevicePosition: [number, number] | undefined;

function authFetch(path: string, init: RequestInit = {}) {
  return fetchWithTimeout(`${apiUrl}${path}`, { ...init, credentials: 'include', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
}

watch(addressQuery, () => {
  addressSearchController?.abort();
  addressSearchController = undefined;
  searchingAddress.value = false;
  addressSuggestions.value = [];
  addressSearchMessage.value = '';
});

async function searchAddress() {
  const text = addressQuery.value.trim();
  if (text.length < 4 || searchingAddress.value) {
    if (text.length < 4) addressSearchMessage.value = 'Digite pelo menos 4 caracteres para buscar.';
    return;
  }
  addressSearchController?.abort();
  const controller = new AbortController();
  addressSearchController = controller;
  addressSuggestions.value = [];
  addressSearchMessage.value = '';
  searchingAddress.value = true;
  try {
    const results = await readJson(await authFetch(
      `/maps/${encodeURIComponent(String(route.params.id))}/address-suggestions?text=${encodeURIComponent(text)}`,
      { signal: controller.signal },
    ));
    if (!controller.signal.aborted) addressSuggestions.value = results as AddressSuggestion[];
    if (!controller.signal.aborted && addressSuggestions.value.length === 0) addressSearchMessage.value = 'Nenhuma sugestão encontrada. Tente acrescentar cidade e UF.';
  } catch (error) {
    if (!controller.signal.aborted) addressSearchMessage.value = error instanceof Error ? error.message : 'Não foi possível buscar esse endereço.';
  } finally {
    if (!controller.signal.aborted) searchingAddress.value = false;
  }
}

async function loadAccess() {
  const result = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/access`));
  responsibleUsers.value = result as MapResponsible[];
}
async function openAccess() {
  accessError.value = '';
  responsibleEmail.value = '';
  accessDialogOpen.value = true;
  try { await loadAccess(); } catch (error) { accessError.value = error instanceof Error ? error.message : 'Não foi possível carregar responsáveis.'; }
}
async function grantAccess() {
  if (accessSaving.value || !responsibleEmail.value.trim()) return;
  accessSaving.value = true; accessError.value = '';
  try {
    await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/access`, { method: 'POST', body: JSON.stringify({ email: responsibleEmail.value.trim() }) }));
    responsibleEmail.value = '';
    await loadAccess();
  } catch (error) { accessError.value = error instanceof Error ? error.message : 'Não foi possível conceder acesso.'; }
  finally { accessSaving.value = false; }
}
async function revokeAccess(user: MapResponsible) {
  if (accessSaving.value) return;
  accessSaving.value = true; accessError.value = '';
  try {
    await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/access/${encodeURIComponent(user.id)}`, { method: 'DELETE' }));
    await loadAccess();
  } catch (error) { accessError.value = error instanceof Error ? error.message : 'Não foi possível remover acesso.'; }
  finally { accessSaving.value = false; }
}

function openAddressSearch() {
  addingPoint.value = false;
  addressQuery.value = '';
  addressSuggestions.value = [];
  addressSearchMessage.value = '';
  addressSearchOpen.value = true;
}

function closeAddressSearch() {
  addressSearchOpen.value = false;
  addressSearchController?.abort();
  searchingAddress.value = false;
}

function stopLocationTracking() {
  if (locationWatchId !== undefined && navigator.geolocation) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = undefined;
  }
  locationTracking.value = false;
  deviceLocationMarker?.remove();
  deviceLocationMarker = undefined;
  currentDevicePosition = undefined;
  locationStatus.value = 'Acompanhamento da localização encerrado';
}

function startLocationTracking() {
  if (locationTracking.value) {
    stopLocationTracking();
    return;
  }
  if (!window.isSecureContext) {
    locationError.value = 'A localização exige uma conexão segura (HTTPS). Em desenvolvimento, use localhost.';
    return;
  }
  if (!navigator.geolocation) {
    locationError.value = 'Este navegador não disponibiliza localização do dispositivo.';
    return;
  }
  if (!map || !mapReady.value) return;

  errorMessage.value = '';
  locationError.value = '';
  locationStatus.value = 'Aguardando posição do dispositivo…';
  locationTracking.value = true;
  locationWatchId = navigator.geolocation.watchPosition((position) => {
    const coordinates: [number, number] = [position.coords.longitude, position.coords.latitude];
    const firstPosition = !currentDevicePosition;
    currentDevicePosition = coordinates;
    if (!deviceLocationMarker) {
      const element = document.createElement('div');
      element.className = 'device-location-marker';
      element.setAttribute('role', 'img');
      element.setAttribute('aria-label', 'Localização atual do dispositivo');
      element.title = 'Sua localização atual';
      deviceLocationMarker = new Marker({ element, anchor: 'center' }).setLngLat(coordinates).addTo(map!);
    } else {
      deviceLocationMarker.setLngLat(coordinates);
    }
    if (firstPosition) map?.flyTo({ center: coordinates, zoom: Math.max(map.getZoom(), 15) });
    locationStatus.value = `Localização atualizada · precisão aproximada de ${Math.round(position.coords.accuracy)} m`;
  }, (error) => {
    if (locationWatchId !== undefined) navigator.geolocation.clearWatch(locationWatchId);
    locationTracking.value = false;
    locationWatchId = undefined;
    deviceLocationMarker?.remove();
    deviceLocationMarker = undefined;
    currentDevicePosition = undefined;
    locationStatus.value = '';
    locationError.value = error.code === error.PERMISSION_DENIED
      ? 'Permissão de localização negada. Libere o acesso à localização nas configurações do navegador.'
      : error.code === error.POSITION_UNAVAILABLE
        ? 'O dispositivo não conseguiu determinar a localização. Verifique o GPS ou os serviços de localização.'
        : 'A localização demorou demais para responder. Tente novamente.';
  }, { enableHighAccuracy: true, maximumAge: 1_000, timeout: 20_000 });
}

function centerOnDevice() {
  if (currentDevicePosition) map?.flyTo({ center: currentDevicePosition, zoom: Math.max(map.getZoom(), 15) });
}

function openRenamePoint(point: MapPoint) {
  renamingPoint.value = point;
  renameValue.value = point.name ?? '';
  renameDialogOpen.value = true;
}

async function savePointName() {
  const point = renamingPoint.value;
  if (!point || renaming.value) return;
  renaming.value = true;
  errorMessage.value = '';
  try {
    const updated = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/points/${encodeURIComponent(point.id)}`, {
      method: 'PATCH', body: JSON.stringify({ name: renameValue.value.trim() || null }),
    })) as MapPoint;
    points.value = points.value.map((item) => item.id === updated.id ? updated : item);
    renderMarkers();
    renameDialogOpen.value = false;
    mapStatus.value = updated.name ? 'Nome do ponto atualizado' : 'Nome do ponto removido';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível renomear o ponto.';
  } finally {
    renaming.value = false;
  }
}

function previewAddressSuggestion(suggestion: AddressSuggestion) {
  if (!map || !mapReady.value) return;
  addingPoint.value = false;
  closeAddressSearch();
  pendingAddress.value = suggestion;
  previewMarker?.remove();
  previewMarker = new Marker({ color: '#d69554', draggable: true })
    .setLngLat([suggestion.longitude, suggestion.latitude])
    .addTo(map);
  previewMarker.on('dragend', () => {
    const position = previewMarker?.getLngLat();
    if (position) previewCoordinates.value = `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
  });
  previewCoordinates.value = `${suggestion.latitude.toFixed(5)}, ${suggestion.longitude.toFixed(5)}`;
  map.flyTo({ center: [suggestion.longitude, suggestion.latitude], zoom: Math.max(map.getZoom(), 15) });
}

function cancelAddressPreview() {
  previewMarker?.remove();
  previewMarker = undefined;
  pendingAddress.value = null;
  previewCoordinates.value = '';
}

async function confirmAddressPoint() {
  const position = previewMarker?.getLngLat();
  if (!position) return;
  const created = await createPoint(position.lat, position.lng);
  if (created) cancelAddressPreview();
}

async function readJson(response: Response) {
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(' ') : result.message || 'Não foi possível concluir a operação.');
  return result;
}

async function loadPoints() {
  const result = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/points`));
  points.value = result as MapPoint[];
  renderMarkers();
  await loadRoute();
}

async function loadRoute() {
  const result = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/route`));
  savedRoute.value = result as MapRoute;
  drawRoute();
}

function drawRoute() {
  if (!map || !mapLoaded) return;
  const geometry = savedRoute.value?.geometry;
  const data: Feature<LineString> | FeatureCollection = geometry
    ? { type: 'Feature', properties: {}, geometry }
    : { type: 'FeatureCollection', features: [] };
  const source = map.getSource('saved-route') as GeoJSONSource | undefined;
  if (source) {
    source.setData(data);
  } else {
    map.addSource('saved-route', { type: 'geojson', data });
    map.addLayer({ id: 'saved-route-line', type: 'line', source: 'saved-route', paint: { 'line-color': '#155e57', 'line-width': 5, 'line-opacity': 0.9 } });
  }
}

function renderMarkers() {
  if (!map) return;
  markers.forEach((marker) => marker.remove());
  markers = points.value.map((point) => {
    const element = document.createElement('button');
    const number = document.createElement('span');
    element.type = 'button';
    element.className = `point-marker${point.visitedAt ? ' is-visited' : ''}${selectedPointId.value === point.id ? ' is-selected' : ''}`;
    number.textContent = String(point.position);
    number.className = 'point-marker-number';
    element.append(number);
    element.setAttribute('aria-label', `Selecionar ${point.name || `ponto ${point.position}`}${point.visitedAt ? ', visitado' : ''}`);
    element.title = `${point.name || `Ponto ${point.position}`}${point.visitedAt ? ' · visitado' : ''}`;
    element.addEventListener('click', (event) => { event.stopPropagation(); selectedPointId.value = point.id; renderMarkers(); });
    return new Marker({ element, anchor: 'bottom' }).setLngLat([point.longitude, point.latitude]).addTo(map!);
  });
}

function onMapClick(event: { lngLat: { lat: number; lng: number } }) {
  if (!addingPoint.value || saving.value) return;
  void createPoint(event.lngLat.lat, event.lngLat.lng);
}

async function createPoint(latitude: number, longitude: number) {
  saving.value = true;
  errorMessage.value = '';
  try {
    const result = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/points`, {
      method: 'POST', body: JSON.stringify({ latitude, longitude }),
    }));
    points.value.push(result as MapPoint);
    selectedPointId.value = result.id;
    renderMarkers();
    await loadRoute();
    mapStatus.value = 'Ponto adicionado';
    return true;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível salvar o ponto.';
    return false;
  } finally {
    saving.value = false;
  }
}

async function deleteSelectedPoint() {
  if (!selectedPointId.value || saving.value) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/points/${encodeURIComponent(selectedPointId.value)}`, { method: 'DELETE' }));
    selectedPointId.value = null;
    await loadPoints();
    mapStatus.value = 'Ponto removido';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível remover o ponto.';
  } finally {
    saving.value = false;
  }
}

async function toggleVisitedPoint() {
  const selected = points.value.find((point) => point.id === selectedPointId.value);
  if (!selected || saving.value) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    const updated = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/points/${encodeURIComponent(selected.id)}/visited`, {
      method: 'PATCH', body: JSON.stringify({ visited: !selected.visitedAt }),
    })) as MapPoint;
    points.value = points.value.map((point) => point.id === updated.id ? updated : point);
    renderMarkers();
    mapStatus.value = updated.visitedAt ? 'Ponto marcado como visitado' : 'Ponto marcado como não visitado';
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível atualizar o estado do ponto.';
  } finally {
    saving.value = false;
  }
}

async function persistPointOrder(pointIds: string[]) {
  if (saving.value || pointIds.length < 2) return;
  saving.value = true;
  errorMessage.value = '';
  try {
    points.value = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}/points/order`, {
      method: 'PATCH', body: JSON.stringify({ pointIds }),
    })) as MapPoint[];
    renderMarkers();
    await loadRoute();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível salvar a nova ordem.';
    await loadPoints().catch(() => undefined);
  } finally {
    saving.value = false;
  }
}

function movePoint(pointId: string, offset: number) {
  const index = points.value.findIndex((point) => point.id === pointId);
  const target = index + offset;
  if (index < 0 || target < 0 || target >= points.value.length) return;
  const ordered = [...points.value];
  const [point] = ordered.splice(index, 1);
  ordered.splice(target, 0, point);
  points.value = ordered.map((item, position) => ({ ...item, position: position + 1 }));
  renderMarkers();
  void persistPointOrder(points.value.map((item) => item.id));
}

function dropPoint(targetId: string) {
  const sourceId = draggedPointId.value;
  draggedPointId.value = null;
  if (!sourceId || sourceId === targetId) return;
  const ordered = [...points.value];
  const sourceIndex = ordered.findIndex((point) => point.id === sourceId);
  const targetIndex = ordered.findIndex((point) => point.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return;
  const [point] = ordered.splice(sourceIndex, 1);
  ordered.splice(targetIndex, 0, point);
  points.value = ordered.map((item, position) => ({ ...item, position: position + 1 }));
  renderMarkers();
  void persistPointOrder(points.value.map((item) => item.id));
}

function focusPoint(point: MapPoint) {
  selectedPointId.value = point.id;
  map?.flyTo({ center: [point.longitude, point.latitude], zoom: Math.max(map.getZoom(), 14) });
  renderMarkers();
}

onMounted(async () => {
  try {
    const mapResult = await readJson(await authFetch(`/maps/${encodeURIComponent(String(route.params.id))}`));
    mapDetails.value = mapResult as MapDetails;
    await loadPoints();
    loading.value = false;
    await nextTick();
    const mapElement = document.querySelector<HTMLElement>('#interactive-map');
    if (!mapElement) throw new Error('Não foi possível preparar a área do mapa.');
    map = new Map({
      container: mapElement,
      style: import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
      center: points.value.length ? [points.value[0].longitude, points.value[0].latitude] : [-40.8394, -14.8661],
      zoom: points.value.length ? 13 : 12,
    });
    map.addControl(new NavigationControl(), 'top-right');
    map.on('load', () => {
      mapLoaded = true;
      mapReady.value = true;
      mapStatus.value = 'Mapa pronto · clique em “Adicionar ponto” para marcar um local';
      renderMarkers();
      drawRoute();
      if (points.value.length > 1) {
        const bounds = points.value.reduce((box, point) => box.extend([point.longitude, point.latitude]), new LngLatBounds([points.value[0].longitude, points.value[0].latitude], [points.value[0].longitude, points.value[0].latitude]));
        map?.fitBounds(bounds, { padding: 70, maxZoom: 14 });
      }
    });
    map.on('click', onMapClick);
    map.on('error', () => { mapStatus.value = 'Não foi possível carregar o mapa. Verifique sua conexão.'; });
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Falha de conexão com a API.';
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  addressSearchController?.abort();
  stopLocationTracking();
  markers.forEach((marker) => marker.remove());
  previewMarker?.remove();
  map?.remove();
});
</script>

<template>
  <q-layout view="hHh Lpr fFf" class="detail-layout">
    <q-header class="topbar"><q-toolbar>
      <q-avatar square class="brand-mark"><q-icon name="route" size="22px" /></q-avatar>
      <q-toolbar-title class="brand-title">rota fácil<span class="brand-dot">.</span></q-toolbar-title>
      <q-btn flat rounded icon="arrow_back" label="Meus mapas" to="/workspace" class="header-back" />
    </q-toolbar></q-header>
    <q-page-container><q-page class="detail-page">
      <div v-if="loading" class="state"><q-spinner color="primary" size="28px" /> Abrindo mapa…</div>
      <q-banner v-else-if="errorMessage && !mapDetails" rounded class="error-banner" role="alert">{{ errorMessage }}</q-banner>
      <template v-else-if="mapDetails">
        <div class="map-heading">
          <div><div class="eyebrow">MAPA PERSONALIZADO</div><h1>{{ mapDetails.name }}</h1><p class="description">{{ mapDetails.description || 'Adicione pontos para planejar seus lugares.' }}</p></div>
          <div class="map-actions"><q-btn v-if="mapDetails.isOwner" outline rounded color="primary" icon="group_add" label="Responsáveis" @click="openAccess" /><q-btn v-if="mapDetails.isOwner" outline rounded color="primary" icon="search" label="Buscar endereço" :disable="!mapReady || saving" @click="openAddressSearch" /><q-btn outline rounded :color="locationTracking ? 'negative' : 'primary'" :icon="locationTracking ? 'location_disabled' : 'my_location'" :label="locationTracking ? 'Parar localização' : 'Minha localização'" :disable="!mapReady || saving" @click="startLocationTracking" /><q-btn v-if="locationTracking" outline rounded color="primary" icon="center_focus_strong" label="Centralizar" :disable="!currentDevicePosition" @click="centerOnDevice" /><q-btn v-if="mapDetails.isOwner" unelevated rounded :color="addingPoint ? 'orange-8' : 'primary'" :icon="addingPoint ? 'close' : 'add_location_alt'" :label="addingPoint ? 'Cancelar inclusão' : 'Adicionar ponto'" :disable="saving || !mapReady" @click="addingPoint = !addingPoint" /></div>
        </div>
        <q-banner v-if="locationError" rounded class="error-banner inline-error" role="alert">{{ locationError }}</q-banner>
        <q-banner v-if="pendingAddress" rounded class="address-preview" role="status"><div class="address-preview-copy"><strong>Confira a localização antes de incluir</strong><span>{{ pendingAddress.label }}</span><small>Coordenadas: {{ previewCoordinates }} · arraste o marcador para ajustar.</small></div><div class="address-preview-actions"><q-btn flat rounded label="Cancelar" :disable="saving" @click="cancelAddressPreview" /><q-btn unelevated rounded color="primary" icon="add_location_alt" label="Confirmar ponto" :loading="saving" @click="confirmAddressPoint" /></div></q-banner>
        <q-banner v-if="errorMessage" rounded class="error-banner inline-error" role="alert">{{ errorMessage }}</q-banner>
        <div class="workspace-grid">
          <section class="map-card" :class="{ 'is-adding': addingPoint }">
            <div id="interactive-map" class="map-canvas"></div>
            <div class="map-caption"><span class="live-dot" :class="{ 'location-live-dot': locationTracking }"></span>{{ saving ? 'Salvando ponto…' : addingPoint ? 'Modo de inclusão ativo · clique no mapa' : locationTracking && locationStatus ? locationStatus : mapStatus }}</div>
          </section>
          <aside class="points-panel" aria-label="Pontos do mapa">
            <div class="points-heading"><div><div class="eyebrow">SEU TRAJETO</div><h2>Pontos <span>{{ points.length }}</span></h2></div><div v-if="selectedPointId" class="selected-actions"><q-btn round flat dense :color="points.find(point => point.id === selectedPointId)?.visitedAt ? 'grey-7' : 'primary'" :icon="points.find(point => point.id === selectedPointId)?.visitedAt ? 'remove_done' : 'task_alt'" :aria-label="points.find(point => point.id === selectedPointId)?.visitedAt ? 'Marcar ponto como não visitado' : 'Marcar ponto como visitado'" :disable="saving" @click="toggleVisitedPoint"><q-tooltip>{{ points.find(point => point.id === selectedPointId)?.visitedAt ? 'Marcar como não visitado' : 'Marcar como visitado' }}</q-tooltip></q-btn><q-btn round flat dense icon="edit" :aria-label="`Renomear ${points.find(point => point.id === selectedPointId)?.name || 'ponto selecionado'}`" :disable="saving || renaming" @click="openRenamePoint(points.find(point => point.id === selectedPointId)!)"><q-tooltip>Renomear ponto selecionado</q-tooltip></q-btn><q-btn v-if="mapDetails.isOwner" round flat dense color="negative" icon="delete_outline" aria-label="Remover ponto selecionado" :disable="saving" @click="deleteSelectedPoint"><q-tooltip>Remover ponto selecionado</q-tooltip></q-btn></div></div>
            <p v-if="addingPoint" class="hint"><q-icon name="touch_app" /> Clique em qualquer lugar do mapa para incluir um ponto.</p>
            <p v-else-if="mapDetails.isOwner" class="hint">Ative “Adicionar ponto” para marcar um local no mapa.</p><p v-else class="hint">Selecione um ponto para marcar a visita ou alterar seu nome.</p>
            <div class="route-state" :class="{ 'route-error': savedRoute?.error }"><q-icon :name="savedRoute?.error ? 'warning_amber' : 'alt_route'" />{{ routeMessage }}</div>
            <div v-if="points.length" class="point-list">
              <div v-for="point in points" :key="point.id" class="point-item" :draggable="mapDetails.isOwner" @dragstart="draggedPointId = point.id" @dragend="draggedPointId = null" @dragover.prevent @drop="dropPoint(point.id)">
                <button type="button" class="point-row" :class="{ selected: selectedPointId === point.id }" @click="focusPoint(point)">
                  <span class="point-number" :class="{ 'is-visited': point.visitedAt }">{{ point.position }}</span><span class="point-coordinates"><strong>{{ point.name || `Ponto ${point.position}` }} <q-badge v-if="point.visitedAt" color="grey-7" label="Visitado" /></strong><small>{{ point.latitude.toFixed(5) }}, {{ point.longitude.toFixed(5) }}</small></span><q-icon name="drag_indicator" color="grey-6" />
                </button>
                <div v-if="mapDetails.isOwner" class="order-tools"><q-btn round flat dense icon="keyboard_arrow_up" :aria-label="`Mover ponto ${point.position} para cima`" :disable="saving || point.position === 1" @click="movePoint(point.id, -1)" /><q-btn round flat dense icon="keyboard_arrow_down" :aria-label="`Mover ponto ${point.position} para baixo`" :disable="saving || point.position === points.length" @click="movePoint(point.id, 1)" /></div>
              </div>
            </div>
            <div v-else class="empty-points"><q-icon name="location_searching" size="28px" /><strong>Nenhum ponto ainda</strong><span>Seu primeiro lugar começa com um clique no mapa.</span></div>
            <div class="panel-footer"><q-icon name="info_outline" /> {{ pointCountLabel }} · ordem de inclusão</div>
          </aside>
        </div>
        <footer>Dados cartográficos © OpenStreetMap contributors · mapa por OpenFreeMap · busca por <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a></footer>
      </template>
      <q-dialog v-model="addressSearchOpen" @hide="closeAddressSearch"><q-card class="address-dialog"><q-card-section><div class="eyebrow">NOVO PONTO</div><div class="dialog-title">Buscar por endereço</div><p class="dialog-description">Digite um endereço no Brasil. Escolha uma sugestão e confira o marcador no mapa antes de salvar.</p></q-card-section><q-card-section class="q-pt-none"><q-input v-model.trim="addressQuery" outlined autofocus clearable maxlength="200" label="Endereço" placeholder="Rua, número, cidade e UF" @keyup.enter="searchAddress"><template #append><q-btn round flat dense icon="search" aria-label="Pesquisar endereço" :loading="searchingAddress" :disable="addressQuery.trim().length < 4 || searchingAddress" @click="searchAddress" /></template></q-input><div v-if="searchingAddress" class="address-search-state"><q-spinner color="primary" /> Buscando sugestões…</div><div v-else-if="addressSearchMessage" class="address-search-state address-search-error" role="status">{{ addressSearchMessage }}</div><div v-else-if="addressQuery.trim().length < 4" class="address-search-state">Digite pelo menos 4 caracteres para buscar.</div><q-list v-if="addressSuggestions.length" bordered separator class="suggestion-list"><q-item v-for="suggestion in addressSuggestions" :key="suggestion.id" clickable v-ripple @click="previewAddressSuggestion(suggestion)"><q-item-section avatar><q-icon name="location_on" color="primary" /></q-item-section><q-item-section><q-item-label>{{ suggestion.label }}</q-item-label><q-item-label caption>{{ suggestion.resultType || 'Endereço' }}</q-item-label></q-item-section><q-item-section side><q-icon name="chevron_right" /></q-item-section></q-item></q-list></q-card-section><q-card-actions align="right"><q-btn flat rounded label="Fechar" @click="closeAddressSearch" /></q-card-actions></q-card></q-dialog>
      <q-dialog v-model="accessDialogOpen"><q-card class="address-dialog"><q-card-section><div class="dialog-title">Responsáveis pelo mapa</div><p class="dialog-description">Informe o e-mail de um usuário cadastrado para conceder acesso.</p></q-card-section><q-card-section><q-banner v-if="accessError" class="error-banner" role="alert">{{ accessError }}</q-banner><q-form @submit.prevent="grantAccess"><q-input v-model="responsibleEmail" type="email" outlined label="E-mail" maxlength="320" required /><q-btn class="q-mt-sm" color="primary" type="submit" label="Conceder acesso" :loading="accessSaving" /></q-form><q-list separator><q-item v-for="user in responsibleUsers" :key="user.id"><q-item-section><q-item-label>{{ user.name || user.email }}</q-item-label><q-item-label caption>{{ user.email }}</q-item-label></q-item-section><q-item-section side><q-btn flat round icon="person_remove" :aria-label="`Remover acesso de ${user.email}`" :disable="accessSaving" @click="revokeAccess(user)" /></q-item-section></q-item></q-list></q-card-section><q-card-actions align="right"><q-btn flat label="Fechar" v-close-popup /></q-card-actions></q-card></q-dialog>
      <q-dialog v-model="renameDialogOpen"><q-card class="address-dialog"><q-card-section><div class="eyebrow">IDENTIFICAÇÃO DO PONTO</div><div class="dialog-title">Renomear ponto</div><p class="dialog-description">O nome aparece na lista e ao passar o cursor sobre o marcador.</p></q-card-section><q-card-section class="q-pt-none"><q-input v-model="renameValue" outlined autofocus maxlength="80" label="Nome do ponto" placeholder="Ex.: Casa, Cliente ou Farmácia" @keyup.enter="savePointName" /></q-card-section><q-card-actions align="between"><q-btn flat rounded label="Limpar nome" :disable="renaming || !renameValue" @click="renameValue = ''" /><div><q-btn flat rounded label="Cancelar" :disable="renaming" @click="renameDialogOpen = false" /><q-btn unelevated rounded color="primary" label="Salvar nome" :loading="renaming" @click="savePointName" /></div></q-card-actions></q-card></q-dialog>
    </q-page></q-page-container>
  </q-layout>
</template>

<style scoped>
.detail-layout { min-height:100vh; background:#f7f8f6; color:#1f2b29; }.topbar { background:#f7f8f6; color:#1f2b29; border-bottom:1px solid #e5e9e5; }
.q-toolbar { max-width:1440px; margin:auto; min-height:72px; padding:0 28px; }.brand-mark { background:#155e57; color:#fff; border-radius:12px; }.brand-title { margin-left:12px; font:800 21px 'Manrope',sans-serif; letter-spacing:-1px; }.brand-dot { color:#d69554; }.header-back { margin-left:auto; text-transform:none; }
.detail-page { max-width:1440px; margin:auto; padding:34px 28px 24px; }.map-heading { display:flex; justify-content:space-between; align-items:end; gap:20px; margin-bottom:22px; }.map-heading .q-btn { min-height:46px; padding:0 18px; text-transform:none; font-weight:600; white-space:nowrap; }.eyebrow { color:#608176; font-size:10px; font-weight:700; letter-spacing:.16em; }
h1 { margin:8px 0 5px; font:700 34px 'Manrope',sans-serif; letter-spacing:-1.2px; }.description { color:#75827c; margin:0; font-size:14px; }.workspace-grid { display:grid; grid-template-columns:minmax(0,1fr) 320px; gap:18px; align-items:stretch; }.map-card { position:relative; overflow:hidden; height:min(68vh,680px); min-height:430px; background:#e7eee8; border:1px solid #dfe7e1; border-radius:18px; }.map-card.is-adding { cursor:crosshair; }.map-canvas { width:100%;height:100%; }.map-caption { position:absolute; z-index:1; top:15px; left:15px; max-width:calc(100% - 82px); border:1px solid #e5ebe6; border-radius:10px; padding:9px 12px; background:#fff; color:#56655e; font-size:11px; box-shadow:0 5px 16px #1c34281a; }.live-dot { display:inline-block; width:7px;height:7px;border-radius:50%;background:#48a16f;margin-right:8px; }
.points-panel { min-height:430px; height:min(68vh,680px); display:flex; flex-direction:column; padding:18px 14px 12px; border:1px solid #e1e8e2; border-radius:18px; background:#fff; }.points-heading { display:flex;justify-content:space-between;align-items:center;padding:0 4px 14px;border-bottom:1px solid #edf0ed; }.selected-actions { display:flex;align-items:center;gap:2px; }.points-heading h2 { margin:5px 0 0;font:700 19px 'Manrope',sans-serif; }.points-heading h2 span { display:inline-grid;place-items:center;vertical-align:2px;min-width:22px;height:22px;padding:0 5px;margin-left:4px;border-radius:7px;background:#edf4ef;color:#155e57;font:700 11px 'DM Sans',sans-serif; }.hint { min-height:44px;margin:12px 4px 8px;color:#78857e;font-size:11px;line-height:1.5; }.hint .q-icon { margin-right:4px;color:#155e57; }.route-state { display:flex;align-items:flex-start;gap:6px;margin:0 4px 8px;color:#527266;font-size:10px;line-height:1.4; }.route-state .q-icon { flex:none;font-size:14px; }.route-state.route-error { color:#a34536; }.point-list { overflow:auto; }.point-item { display:flex;align-items:center;gap:2px;border-radius:10px; }.point-item[draggable="true"] { cursor:grab; }.point-item:active { cursor:grabbing; }.point-row { flex:1;min-width:0;display:flex;align-items:center;gap:11px;padding:10px 6px;border:0;border-radius:10px;background:transparent;text-align:left;cursor:pointer;color:#26332e; }.point-row:hover,.point-row.selected { background:#f0f6f1; }.point-number { display:grid;place-items:center;flex:none;width:29px;height:29px;border-radius:50%;background:#155e57;color:#fff;font-size:12px;font-weight:700; }.point-number.is-visited { background:#858f8a; }.point-coordinates { display:grid;gap:3px;min-width:0;flex:1; }.point-coordinates strong { font-size:12px;font-weight:600; }.point-coordinates small { color:#829088;font-size:10px;font-variant-numeric:tabular-nums; }.order-tools { display:flex;flex-direction:column; }.order-tools :deep(.q-btn) { width:25px;height:22px;min-height:22px;color:#779087; }.empty-points { flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;text-align:center;color:#779087;padding:18px; }.empty-points strong { color:#43574c;font-size:13px; }.empty-points span { color:#84918b;font-size:11px;line-height:1.5;max-width:200px; }.panel-footer { padding:12px 4px 2px;border-top:1px solid #edf0ed;color:#84918b;font-size:10px; }.panel-footer .q-icon { vertical-align:middle;margin-right:4px; }.inline-error { margin:0 0 15px;background:#fff0ed;color:#943e30; }.error-banner { background:#fff0ed;color:#943e30; }.state { min-height:300px;display:flex;justify-content:center;align-items:center;gap:12px;color:#718078; }footer { padding:14px 2px 0;color:#84918b;font-size:10px; }
:global(.point-marker) { display:grid;place-items:center;width:32px;height:38px;border:2px solid white;border-radius:50% 50% 50% 0;background:#155e57;color:#fff;box-shadow:0 2px 8px #13241f55;font:700 12px 'DM Sans',sans-serif;transform:rotate(-45deg);cursor:pointer; }
:global(.point-marker-number) { transform:rotate(0deg); }
:global(.point-marker.is-selected) { background:#d17d3b;transform:rotate(-45deg) scale(1.12); }
:global(.point-marker.is-visited), :global(.point-marker.is-visited.is-selected) { background:#858f8a; }
:global(.device-location-marker) { width:24px;height:24px;border:3px solid #fff;border-radius:50%;background:#2878df;box-shadow:0 1px 6px #102a4c88;position:relative; }
:global(.device-location-marker::after) { content:"";position:absolute;inset:-9px;border:2px solid #2878df66;border-radius:50%;animation:location-pulse 2s ease-out infinite; }
.location-live-dot { background:#2878df; }
@keyframes location-pulse { 0% { transform:scale(.7);opacity:.9; } 100% { transform:scale(1.6);opacity:0; } }
:global(.point-marker.is-visited.is-selected) { outline:2px solid #d69554; }
@media(max-width:900px) { .map-actions { flex-wrap:wrap; }.workspace-grid { grid-template-columns:minmax(0,1fr) 270px;gap:12px; }.detail-page { padding:28px 18px 20px; } }
.map-actions,.address-preview-actions { display:flex;align-items:center;gap:8px; }.map-actions :deep(.q-btn) { min-height:46px;padding:0 16px;text-transform:none;font-weight:600;white-space:nowrap; }.address-preview { display:flex;align-items:center;justify-content:space-between;gap:18px;margin:-6px 0 18px;background:#edf4ef;color:#29443a; }.address-preview-copy { display:grid;gap:4px;min-width:0; }.address-preview-copy strong { font-size:13px; }.address-preview-copy span { font-size:12px; }.address-preview-copy small { color:#688074;font-size:11px; }.address-preview-actions { flex:none; }.address-dialog { width:min(540px,calc(100vw - 32px));max-width:540px;border-radius:18px; }.dialog-title { margin-top:6px;font:700 22px 'Manrope',sans-serif;color:#26332e; }.dialog-description { margin:7px 0 0;color:#75827c;font-size:13px;line-height:1.5; }.address-search-state { display:flex;align-items:center;gap:8px;padding:15px 2px;color:#75827c;font-size:12px; }.address-search-error { color:#a34536; }.suggestion-list { max-height:270px;overflow:auto;border-radius:10px; }.suggestion-list :deep(.q-item) { min-height:60px; }.suggestion-list :deep(.q-item__label) { white-space:normal;line-height:1.4; }.detail-page footer a { color:#527266; }
@media(max-width:700px) { .q-toolbar { padding:0 16px; }.detail-page { padding:25px 14px 18px; }.map-heading { align-items:start;flex-direction:column; }.map-actions { width:100%;flex-direction:column;align-items:stretch; }.map-actions :deep(.q-btn) { align-self:stretch; }.address-preview { align-items:stretch;flex-direction:column;gap:10px; }.address-preview-actions { justify-content:flex-end; }.workspace-grid { grid-template-columns:1fr; }.map-card { min-height:420px;height:56vh; }.points-panel { min-height:290px;height:auto;max-height:400px; }.point-list { min-height:30px; }.header-back .q-btn__content { font-size:12px; } }
</style>
