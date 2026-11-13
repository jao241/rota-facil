import { Body, Controller, ForbiddenException, Get, Post, Req, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth/auth.guard';
import { RouteRequestDto } from './route.dto';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    try {
      const [database] = await this.prisma.$queryRaw<Array<{ postgis_version: string }>>`
        SELECT PostGIS_Full_Version() AS postgis_version
      `;
      return { status: 'ok', database: 'connected', postgis: database.postgis_version };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'unavailable' });
    }
  }

  @Post('route')
  @UseGuards(AuthGuard)
  async route(
    @Body() body: RouteRequestDto,
    @Req() request: Request,
  ) {
    const origin = request.headers.origin;
    if (origin && origin !== (process.env.WEB_ORIGIN ?? 'http://localhost:9000')) {
      throw new ForbiddenException('Origem não autorizada.');
    }
    const valhallaUrl = process.env.VALHALLA_URL ?? 'http://localhost:8002';
    try {
      const response = await fetch(`${valhallaUrl}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({ ...body, costing: body.costing ?? 'auto', units: 'kilometers' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(`Valhalla respondeu HTTP ${response.status}`);
      return result;
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        service: 'valhalla',
        message: error instanceof Error ? error.message : 'Serviço de rotas indisponível',
      });
    }
  }
}
