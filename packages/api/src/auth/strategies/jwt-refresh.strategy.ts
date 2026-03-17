import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as bcrypt from 'bcrypt';
import type { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtRefreshPayload } from '../types/jwt-payload.type';
import type { RefreshRequestUser } from '../types/request-user.type';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtRefreshPayload): Promise<RefreshRequestUser> {
    const authHeader = req.headers.authorization ?? '';
    const refreshToken = authHeader.replace('Bearer ', '');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, refreshTokenHash: true },
    });

    if (!user?.refreshTokenHash) {
      throw new ForbiddenException('Acceso denegado');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!tokenMatches) {
      throw new ForbiddenException('Acceso denegado');
    }

    return { userId: user.id };
  }
}
