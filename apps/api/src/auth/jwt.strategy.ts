import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_TOKEN_COOKIE } from './auth.cookies';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET must be defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.[ACCESS_TOKEN_COOKIE] || null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: { sub: string; role: string; tokenVersion?: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        tier: true,
        tokenVersion: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      throw new UnauthorizedException();
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new UnauthorizedException('Compte suspendu ou banni');
    }

    if (payload.tokenVersion === undefined || payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      tier: user.tier,
    };
  }
}
