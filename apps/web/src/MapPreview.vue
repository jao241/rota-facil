<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { Map, Marker, NavigationControl, setWorkerUrl, type GeoJSONSource, type LngLatLike } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { fetchWithTimeout } from './auth';

setWorkerUrl(mapWorkerUrl);

const mapElement = ref<HTMLElement | null>(null);
const status = ref('Iniciando mapa…');
const routeStatus = ref('');
let map: Map | undefined;
const markers: Marker[] = [];

const start: LngLatLike = [-40.8394, -14.8661]; // Vitória da Conquista
const finish: LngLatLike = [-40.8448, -14.8582];

onMounted(() => {
  if (!mapElement.value) return;
  map = new Map({
    container: mapElement.value,
    style: import.meta.env.VITE_MAP_STYLE_URL || 'https://tiles.openfreemap.org/styles/liberty',
    center: start,
    zoom: 13,
  });
  map.addControl(new NavigationControl(), 'top-right');
  map.on('load', () => {
    status.value = 'Mapa carregado · Vitória da Conquista';
  });
  map.on('error', () => {
    status.value = 'Não foi possível carregar o mapa. Verifique a conexão e a fonte cartográfica.';
  });
});

async function calculateRoute() {
  routeStatus.value = 'Consultando Valhalla…';
  try {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const points = [start, finish] as [number, number][];
    const response = await fetchWithTimeout(`${apiBase}/route`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: points.map(([lon, lat]) => ({ lat, lon })),
        costing: 'auto',
        units: 'kilometers',
      }),
    });
    if (!response.ok) throw new Error(`Valhalla respondeu HTTP ${response.status}`);
    const result = await response.json();
    const coordinates = decodePolyline(result.trip.legs[0].shape, 6);
    if (!map) throw new Error('Mapa ainda não está pronto.');
    if (map.getSource('route')) {
      (map.getSource('route') as GeoJSONSource).setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
    } else {
      map.addSource('route', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } });
      map.addLayer({ id: 'route-line', type: 'line', source: 'route', paint: { 'line-color': '#155e57', 'line-width': 5, 'line-opacity': 0.9 } });
    }
    markers.splice(0).forEach((marker) => marker.remove());
    [start, finish].forEach((position, index) => {
      markers.push(new Marker({ color: index === 0 ? '#155e57' : '#d69554' }).setLngLat(position).addTo(map!));
    });
    routeStatus.value = `Rota calculada · ${result.trip.summary.length.toFixed(1)} km`;
  } catch (error) {
    routeStatus.value = error instanceof Error ? error.message : 'Falha ao calcular rota.';
  }
}

function decodePolyline(encoded: string, precision: number): [number, number][] {
  const factor = 10 ** precision;
  const points: [number, number][] = [];
  let index = 0; let lat = 0; let lon = 0;
  while (index < encoded.length) {
    let result = 0; let shift = 0; let byte: number;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    result = 0; shift = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lon += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push([lon / factor, lat / factor]);
  }
  return points;
}

onBeforeUnmount(() => map?.remove());
</script>

<template>
  <q-layout view="hHh Lpr fFf" class="app-shell">
    <q-header class="topbar">
      <q-toolbar>
        <q-avatar square class="brand-mark"><q-icon name="route" size="22px" /></q-avatar>
        <q-toolbar-title class="brand-title">rota fácil<span class="brand-dot">.</span></q-toolbar-title>
        <q-badge color="white" text-color="primary" label="PROVA CARTOGRÁFICA" class="proof-badge" />
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="page">
        <section class="intro">
          <div>
            <div class="eyebrow">ETAPA 1 · INFRAESTRUTURA</div>
            <h1>Um lugar para começar.</h1>
            <p>Validando o mapa e o cálculo de rotas em Vitória da Conquista.</p>
          </div>
          <q-btn unelevated rounded color="primary" icon="alt_route" label="Calcular rota de teste" @click="calculateRoute" />
        </section>

        <section class="map-card">
          <div ref="mapElement" class="map"></div>
          <div class="map-caption"><span class="live-dot"></span>{{ status }}</div>
        </section>
        <div v-if="routeStatus" class="route-status"><q-icon name="info" />{{ routeStatus }}</div>
        <footer>Dados cartográficos © OpenStreetMap contributors · mapa por OpenFreeMap · sem serviços do Google</footer>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
:root { font-family: 'DM Sans', sans-serif; color: #1f2b29; background: #f7f8f6; }
* { box-sizing: border-box; }
body { margin: 0; }
.app-shell { min-height: 100vh; background: #f7f8f6; }
.topbar { background: #f7f8f6; color: #1f2b29; border-bottom: 1px solid #e5e9e5; }
.q-toolbar { max-width: 1320px; min-height: 74px; margin: auto; padding: 0 32px; }
.brand-mark { background: #155e57; color: white; border-radius: 12px; }
.brand-title { margin-left: 12px; font: 800 21px 'Manrope', sans-serif; letter-spacing: -1px; }
.brand-dot { color: #d69554; }
.proof-badge { margin-left: 16px; font-size: 10px; letter-spacing: .12em; padding: 7px 10px; border: 1px solid #dce7e1; }
.page { max-width: 1320px; margin: auto; padding: 52px 32px 22px; }
.intro { display: flex; align-items: end; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
.eyebrow { color: #557b6e; font-size: 11px; font-weight: 700; letter-spacing: .16em; }
h1 { margin: 11px 0 7px; font: 700 clamp(30px, 4vw, 42px) 'Manrope', sans-serif; letter-spacing: -1.7px; }
.intro p { margin: 0; color: #71807a; font-size: 15px; }
.intro .q-btn { min-height: 48px; padding: 0 20px; font-weight: 600; text-transform: none; }
.map-card { position: relative; overflow: hidden; height: min(63vh, 620px); min-height: 390px; background: #e7eee8; border: 1px solid #dfe7e1; border-radius: 20px; box-shadow: 0 14px 44px #26392f0c; }
.map { width: 100%; height: 100%; }
.map-caption { position: absolute; z-index: 1; left: 18px; top: 18px; display: flex; align-items: center; gap: 9px; border: 1px solid #e5ebe6; border-radius: 10px; padding: 10px 13px; background: #fff; color: #56655e; font-size: 12px; box-shadow: 0 5px 16px #1c34281a; }
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: #48a16f; }
.route-status { display: flex; align-items: center; gap: 9px; margin-top: 14px; color: #155e57; font-size: 13px; }
footer { padding-top: 18px; color: #84918b; font-size: 11px; }
@media (max-width: 640px) { .q-toolbar { padding: 0 18px; } .page { padding: 34px 16px 18px; } .intro { align-items: start; flex-direction: column; } .map-card { min-height: 480px; height: 62vh; } .proof-badge { font-size: 8px; margin-left: 8px; } }
</style>
