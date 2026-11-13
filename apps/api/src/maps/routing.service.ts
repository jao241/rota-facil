import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

type Coordinate = [number, number];

@Injectable()
export class RoutingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoute(mapId: string) {
    return this.prisma.mapRoute.findUnique({
      where: { mapId },
      select: { geometry: true, costing: true, calculatedAt: true, error: true },
    });
  }

  async recalculate(mapId: string) {
    const points = await this.prisma.mapPoint.findMany({
      where: { mapId }, orderBy: { position: 'asc' }, select: { latitude: true, longitude: true },
    });
    if (points.length < 2) {
      return this.persist(mapId, { geometry: Prisma.DbNull, calculatedAt: null, error: null });
    }

    try {
      const baseUrl = (process.env.VALHALLA_URL ?? 'http://localhost:8002').replace(/\/+$/, '');
      const response = await fetch(`${baseUrl}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          locations: points.map(({ latitude, longitude }) => ({ lat: latitude, lon: longitude })),
          costing: 'auto',
          units: 'kilometers',
        }),
      });
      const result = await response.json().catch(() => ({})) as {
        trip?: { legs?: Array<{ shape?: string }> };
        error?: string;
        error_message?: string;
      };
      if (!response.ok) throw new Error(result.error_message || result.error || `Valhalla respondeu HTTP ${response.status}.`);
      const legs = result.trip?.legs;
      if (!legs?.length || legs.some((leg) => typeof leg.shape !== 'string')) {
        throw new Error('O Valhalla não retornou a geometria do trajeto.');
      }
      const coordinates = legs.flatMap((leg) => this.decodePolyline(leg.shape!));
      if (coordinates.length < 2) throw new Error('A geometria retornada pelo Valhalla está incompleta.');
      return this.persist(mapId, {
        geometry: { type: 'LineString', coordinates } as Prisma.InputJsonValue,
        calculatedAt: new Date(),
        error: null,
      });
    } catch (error) {
      const message = (error instanceof Error ? error.message : 'Falha ao calcular o trajeto.').slice(0, 500);
      return this.persist(mapId, { geometry: Prisma.DbNull, calculatedAt: null, error: message });
    }
  }

  private persist(mapId: string, data: {
    geometry: Prisma.InputJsonValue | Prisma.NullTypes.DbNull;
    calculatedAt: Date | null;
    error: string | null;
  }) {
    return this.prisma.mapRoute.upsert({
      where: { mapId },
      create: { mapId, ...data },
      update: data,
      select: { geometry: true, costing: true, calculatedAt: true, error: true },
    });
  }

  private decodePolyline(encoded: string): Coordinate[] {
    const coordinates: Coordinate[] = [];
    const factor = 1_000_000;
    let index = 0;
    let latitude = 0;
    let longitude = 0;
    while (index < encoded.length) {
      let result = 0;
      let shift = 0;
      let byte: number;
      do {
        if (index >= encoded.length) throw new Error('Geometria inválida retornada pelo Valhalla.');
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      latitude += (result & 1) ? ~(result >> 1) : result >> 1;

      result = 0;
      shift = 0;
      do {
        if (index >= encoded.length) throw new Error('Geometria inválida retornada pelo Valhalla.');
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      longitude += (result & 1) ? ~(result >> 1) : result >> 1;
      coordinates.push([longitude / factor, latitude / factor]);
    }
    return coordinates;
  }
}
