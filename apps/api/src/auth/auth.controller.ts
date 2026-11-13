import {
  Body, Controller, ForbiddenException, Get, Post, Req, Res, UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { AuthenticatedRequest } from './auth.types';
import { CredentialsDto, RegisterDto } from './auth.dto';
import { readSessionToken, SESSION_COOKIE, sessionCookieOptions } from './session.util';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() credentials: RegisterDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertTrustedOrigin(request);
    const result = await this.auth.register(credentials.name, credentials.cpf, credentials.email, credentials.password);
    this.setSessionCookie(response, result.session.token, result.session.expiresAt);
    return result.user;
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() credentials: CredentialsDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertTrustedOrigin(request);
    const result = await this.auth.login(credentials.email, credentials.password);
    this.setSessionCookie(response, result.session.token, result.session.expiresAt);
    return result.user;
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    this.assertTrustedOrigin(request);
    await this.auth.revoke(readSessionToken(request.headers.cookie));
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
    return { status: 'ok' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.authUser;
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(SESSION_COOKIE, token, { ...sessionCookieOptions(), expires: expiresAt });
  }

  private assertTrustedOrigin(request: Request) {
    const origin = request.headers.origin;
    const trustedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:9000';
    if (origin && origin !== trustedOrigin) throw new ForbiddenException('Origem não autorizada.');
  }
}
