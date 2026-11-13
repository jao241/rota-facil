import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaService } from './prisma.service';
import { AuthController } from './auth/auth.controller';
import { AuthGuard } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { MapsController } from './maps/maps.controller';
import { MapsService } from './maps/maps.service';
import { RoutingService } from './maps/routing.service';
import { AddressSearchService } from './maps/address-search.service';

@Module({
  imports: [ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }])],
  controllers: [AppController, AuthController, MapsController],
  providers: [PrismaService, AuthService, AuthGuard, MapsService, RoutingService, AddressSearchService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
