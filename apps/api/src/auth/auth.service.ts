import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email ou numéro de téléphone requis');
    }

    // Vérifier si l'utilisateur existe déjà
    if (dto.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Email déjà utilisé');
    }
    if (dto.phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
      if (existing) throw new ConflictException('Numéro de téléphone déjà utilisé');
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Trouver le parrain si code fourni
    let referredById: string | undefined;
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Créer l'utilisateur
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        referredById,
        wallet: {
          create: {},
        },
      },
    });

    // Générer les tokens
    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        referralCode: user.referralCode,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email ou numéro de téléphone requis');
    }

    // Trouver l'utilisateur
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          dto.email ? { email: dto.email } : {},
          dto.phone ? { phone: dto.phone } : {},
        ].filter((condition) => Object.keys(condition).length > 0),
      },
    });

    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    // Vérifier que le compte n'est pas suspendu
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new UnauthorizedException('Compte suspendu');
    }

    const tokens = await this.generateTokens(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
        referralCode: user.referralCode,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) throw new UnauthorizedException('Utilisateur introuvable');

      if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
        throw new UnauthorizedException('Compte suspendu ou banni');
      }

      const tokens = await this.generateTokens(user.id, user.role);

      return {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          referralCode: user.referralCode,
        },
        ...tokens,
      };
    } catch {
      throw new UnauthorizedException('Token invalide');
    }
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRATION') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

}
