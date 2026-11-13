import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { hashSessionToken } from './session.util';
import { hashCpf, isValidCpf, normalizeCpf } from './cpf.util';

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(nameInput: string, cpfInput: string, emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    const name = nameInput.trim().replace(/\s+/g, ' ');
    if (name.length < 2 || name.length > 120) {
      throw new BadRequestException({ code: 'invalid_name', message: 'Informe seu nome completo.' });
    }
    if (!isValidCpf(cpfInput)) {
      throw new BadRequestException({ code: 'invalid_cpf', message: 'Confira o CPF informado.' });
    }
    this.validatePassword(password);
    const passwordHash = await hash(password, 12);
    try {
      const user = await this.prisma.user.create({
        data: { name, email, cpfHash: hashCpf(normalizeCpf(cpfInput)), passwordHash },
      });
      return { user: this.publicUser(user), session: await this.createSession(user.id) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException({ code: 'account_already_registered', message: 'Não foi possível criar uma conta com esses dados.' });
      }
      throw error;
    }
  }

  async login(emailInput: string, password: string) {
    this.validatePassword(password);
    const user = await this.prisma.user.findUnique({ where: { email: emailInput.trim().toLowerCase() } });
    const matches = user ? await compare(password, user.passwordHash) : false;
    if (!user || !matches) {
      throw new UnauthorizedException({ code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' });
    }
    return { user: this.publicUser(user), session: await this.createSession(user.id) };
  }

  async revoke(token?: string) {
    if (token) await this.prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }

  async findActiveUser(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    if (!session) return null;
    if (session.expiresAt <= new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    return session.user;
  }

  private async createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await this.prisma.session.create({
      data: { tokenHash: hashSessionToken(token), userId, expiresAt },
    });
    return { token, expiresAt };
  }

  private validatePassword(password: string) {
    if (Buffer.byteLength(password, 'utf8') > 72) {
      throw new BadRequestException({ code: 'password_too_long', message: 'A senha deve ter no máximo 72 bytes.' });
    }
  }

  private publicUser(user: { id: string; email: string; name?: string | null }) {
    return { id: user.id, email: user.email, name: user.name ?? null };
  }
}
