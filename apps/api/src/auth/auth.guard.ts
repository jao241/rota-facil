import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './auth.types';
import { readSessionToken } from './session.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionToken(request.headers.cookie);
    if (!token) throw new UnauthorizedException();
    const user = await this.auth.findActiveUser(token);
    if (!user) throw new UnauthorizedException();
    request.authUser = user;
    return true;
  }
}
