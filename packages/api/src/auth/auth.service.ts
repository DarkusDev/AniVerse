import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { AuthTokensDto } from './dto/auth-tokens.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
      select: { email: true, username: true },
    });

    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email ya está en uso' : 'Username ya está en uso',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: { email: dto.email, username: dto.username, passwordHash },
      select: { id: true, email: true },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, passwordHash: true },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(userId: string): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.issueTokens(user.id, user.email);
  }

  private async issueTokens(userId: string, email: string): Promise<AuthTokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId, email),
      this.signRefreshToken(userId),
    ]);

    await this.storeRefreshToken(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  private signAccessToken(userId: string, email: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
  }

  private signRefreshToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const hash = await bcrypt.hash(token, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: hash },
    });
  }
}
