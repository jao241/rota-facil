import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMapDto, UpdateMapDto } from './maps.dto';
import { CreateMapPointDto, ReorderMapPointsDto, UpdateMapPointDto } from './map-points.dto';
import { RoutingService } from './routing.service';

const mapFields = {
  id: true,
  name: true,
  description: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class MapsService {
  constructor(private readonly prisma: PrismaService, private readonly routing: RoutingService) {}

  create(userId: string, input: CreateMapDto) {
    return this.prisma.map.create({
      data: {
        userId,
        name: this.normalizeName(input.name),
        description: this.normalizeDescription(input.description),
      },
      select: mapFields,
    });
  }

  async list(userId: string) {
    const maps = await this.prisma.map.findMany({ where: { OR: [{ userId }, { access: { some: { userId } } }] }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], select: { ...mapFields, userId: true } });
    return maps.map(({ userId: ownerId, ...map }) => ({ ...map, isOwner: ownerId === userId }));
  }

  async get(userId: string, id: string) {
    const map = await this.prisma.map.findFirst({ where: { id, OR: [{ userId }, { access: { some: { userId } } }] }, select: { ...mapFields, userId: true } });
    if (!map) throw new NotFoundException('Mapa não encontrado.');
    const { userId: ownerId, ...details } = map;
    return { ...details, isOwner: ownerId === userId };
  }

  async requireOwner(userId: string, id: string) {
    const map = await this.prisma.map.findFirst({ where: { id, userId }, select: { id: true } });
    if (!map) throw new NotFoundException('Mapa não encontrado.');
  }

  async listAccess(userId: string, mapId: string) {
    await this.requireOwner(userId, mapId);
    const entries = await this.prisma.mapAccess.findMany({ where: { mapId }, select: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: 'asc' } });
    return entries.map(({ user }) => user);
  }

  async grantAccess(userId: string, mapId: string, email: string) {
    await this.requireOwner(userId, mapId);
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() }, select: { id: true, name: true, email: true } });
    if (!user) throw new NotFoundException('Usuário cadastrado não encontrado.');
    if (user.id === userId) throw new BadRequestException('O criador já possui acesso ao mapa.');
    await this.prisma.mapAccess.upsert({ where: { mapId_userId: { mapId, userId: user.id } }, create: { mapId, userId: user.id }, update: {} });
    return user;
  }

  async revokeAccess(userId: string, mapId: string, targetId: string) {
    await this.requireOwner(userId, mapId);
    const result = await this.prisma.mapAccess.deleteMany({ where: { mapId, userId: targetId } });
    if (!result.count) throw new NotFoundException('Acesso não encontrado.');
    return { status: 'ok' };
  }

  async update(userId: string, id: string, input: UpdateMapDto) {
    const data: { name?: string; description?: string | null } = {};
    if (input.name !== undefined) data.name = this.normalizeName(input.name);
    if (input.description !== undefined) data.description = this.normalizeDescription(input.description);
    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Informe pelo menos um campo para atualizar.');
    }

    const result = await this.prisma.map.updateMany({ where: { id, userId }, data });
    if (result.count === 0) throw new NotFoundException('Mapa não encontrado.');
    return this.get(userId, id);
  }

  async delete(userId: string, id: string) {
    const result = await this.prisma.map.deleteMany({ where: { id, userId } });
    if (result.count === 0) throw new NotFoundException('Mapa não encontrado.');
    return { status: 'ok' };
  }

  async listPoints(userId: string, mapId: string) {
    await this.get(userId, mapId);
    return this.prisma.mapPoint.findMany({
      where: { mapId },
      orderBy: [{ position: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true, latitude: true, longitude: true, position: true, visitedAt: true, createdAt: true, updatedAt: true },
    });
  }

  async createPoint(userId: string, mapId: string, input: CreateMapPointDto) {
    await this.requireOwner(userId, mapId);
    const last = await this.prisma.mapPoint.aggregate({ where: { mapId }, _max: { position: true } });
    const point = await this.prisma.mapPoint.create({
      data: { mapId, latitude: input.latitude, longitude: input.longitude, position: (last._max.position ?? 0) + 1 },
      select: { id: true, name: true, latitude: true, longitude: true, position: true, visitedAt: true, createdAt: true, updatedAt: true },
    });
    await this.routing.recalculate(mapId);
    return point;
  }

  async updatePoint(userId: string, mapId: string, pointId: string, input: UpdateMapPointDto) {
    await this.get(userId, mapId);
    if (input.name === undefined) throw new BadRequestException('Informe o nome do ponto ou null para removê-lo.');
    const result = await this.prisma.mapPoint.updateMany({
      where: { id: pointId, mapId },
      data: { name: input.name?.trim() || null },
    });
    if (result.count === 0) throw new NotFoundException('Ponto não encontrado.');
    return this.prisma.mapPoint.findFirstOrThrow({
      where: { id: pointId, mapId },
      select: { id: true, name: true, latitude: true, longitude: true, position: true, visitedAt: true, createdAt: true, updatedAt: true },
    });
  }

  async deletePoint(userId: string, mapId: string, pointId: string) {
    await this.requireOwner(userId, mapId);
    const result = await this.prisma.$transaction(async (tx) => {
      const point = await tx.mapPoint.findFirst({ where: { id: pointId, mapId }, select: { position: true } });
      if (!point) throw new NotFoundException('Ponto não encontrado.');
      await tx.mapPoint.delete({ where: { mapId_position: { mapId, position: point.position } } });
      const laterPoints = await tx.mapPoint.findMany({
        where: { mapId, position: { gt: point.position } }, orderBy: { position: 'asc' }, select: { id: true, position: true },
      });
      for (const laterPoint of laterPoints) {
        await tx.mapPoint.update({ where: { id: laterPoint.id }, data: { position: laterPoint.position - 1 } });
      }
      return { status: 'ok' };
    });
    await this.routing.recalculate(mapId);
    return result;
  }

  async setPointVisited(userId: string, mapId: string, pointId: string, visited: boolean) {
    await this.get(userId, mapId);
    const result = await this.prisma.mapPoint.updateMany({
      where: { id: pointId, mapId },
      data: { visitedAt: visited ? new Date() : null },
    });
    if (result.count === 0) throw new NotFoundException('Ponto não encontrado.');
    return this.prisma.mapPoint.findFirstOrThrow({
      where: { id: pointId, mapId },
      select: { id: true, name: true, latitude: true, longitude: true, position: true, visitedAt: true, createdAt: true, updatedAt: true },
    });
  }

  async reorderPoints(userId: string, mapId: string, input: ReorderMapPointsDto) {
    await this.requireOwner(userId, mapId);
    const existing = await this.prisma.mapPoint.findMany({ where: { mapId }, select: { id: true } });
    const requested = input.pointIds;
    if (new Set(requested).size !== requested.length || requested.length !== existing.length || existing.some(({ id }) => !requested.includes(id))) {
      throw new BadRequestException('A lista precisa incluir cada ponto do mapa exatamente uma vez.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < requested.length; index += 1) {
        await tx.mapPoint.update({ where: { id: requested[index] }, data: { position: -(index + 1) } });
      }
      for (let index = 0; index < requested.length; index += 1) {
        await tx.mapPoint.update({ where: { id: requested[index] }, data: { position: index + 1 } });
      }
    });
    await this.routing.recalculate(mapId);
    return this.listPoints(userId, mapId);
  }

  async getRoute(userId: string, mapId: string) {
    await this.get(userId, mapId);
    return (await this.routing.getRoute(mapId)) ?? { geometry: null, costing: 'auto', calculatedAt: null, error: null };
  }

  private normalizeName(value: string) {
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name) throw new BadRequestException('O nome do mapa é obrigatório.');
    if (name.length > 120) throw new BadRequestException('O nome deve ter até 120 caracteres.');
    return name;
  }

  private normalizeDescription(value?: string | null) {
    const description = value?.trim() ?? '';
    if (description.length > 1000) throw new BadRequestException('A descrição deve ter até 1000 caracteres.');
    return description || null;
  }
}
