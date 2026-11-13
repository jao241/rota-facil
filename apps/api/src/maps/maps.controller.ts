import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthenticatedRequest } from '../auth/auth.types';
import { AuthGuard } from '../auth/auth.guard';
import { CreateMapDto, UpdateMapDto, GrantMapAccessDto } from './maps.dto';
import { MapsService } from './maps.service';
import { CreateMapPointDto, ReorderMapPointsDto, SetMapPointVisitedDto, UpdateMapPointDto } from './map-points.dto';
import { AddressSearchQueryDto } from './address-search.dto';
import { AddressSearchService } from './address-search.service';

@Controller('maps')
@UseGuards(AuthGuard)
export class MapsController {
  constructor(private readonly maps: MapsService, private readonly addressSearch: AddressSearchService) {}

  @Post()
  create(@Req() request: AuthenticatedRequest, @Body() body: CreateMapDto) {
    return this.maps.create(request.authUser.id, body);
  }

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.maps.list(request.authUser.id);
  }

  @Get(':id')
  get(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.maps.get(request.authUser.id, id);
  }

  @Patch(':id')
  update(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: UpdateMapDto) {
    return this.maps.update(request.authUser.id, id, body);
  }

  @Delete(':id')
  delete(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.maps.delete(request.authUser.id, id);
  }

  @Get(':id/access')
  listAccess(@Req() request: AuthenticatedRequest, @Param('id') id: string) { return this.maps.listAccess(request.authUser.id, id); }

  @Post(':id/access')
  grantAccess(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: GrantMapAccessDto) { return this.maps.grantAccess(request.authUser.id, id, body.email); }

  @Delete(':id/access/:userId')
  revokeAccess(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('userId') userId: string) { return this.maps.revokeAccess(request.authUser.id, id, userId); }

  @Get(':id/points')
  listPoints(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.maps.listPoints(request.authUser.id, id);
  }

  @Post(':id/points')
  createPoint(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: CreateMapPointDto) {
    return this.maps.createPoint(request.authUser.id, id, body);
  }

  @Patch(':id/points/order')
  reorderPoints(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() body: ReorderMapPointsDto) {
    return this.maps.reorderPoints(request.authUser.id, id, body);
  }

  @Patch(':id/points/:pointId')
  updatePoint(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('pointId') pointId: string, @Body() body: UpdateMapPointDto) {
    return this.maps.updatePoint(request.authUser.id, id, pointId, body);
  }

  @Delete(':id/points/:pointId')
  deletePoint(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('pointId') pointId: string) {
    return this.maps.deletePoint(request.authUser.id, id, pointId);
  }

  @Patch(':id/points/:pointId/visited')
  setPointVisited(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Param('pointId') pointId: string, @Body() body: SetMapPointVisitedDto) {
    return this.maps.setPointVisited(request.authUser.id, id, pointId, body.visited);
  }

  @Get(':id/route')
  getRoute(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.maps.getRoute(request.authUser.id, id);
  }

  @Get(':id/address-suggestions')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async addressSuggestions(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Query() query: AddressSearchQueryDto) {
    await this.maps.requireOwner(request.authUser.id, id);
    return this.addressSearch.search(query.text);
  }
}
