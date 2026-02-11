import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AntiCheatService } from './anti-cheat.service';
import { RegisterDto, LoginDto, ResendVerificationDto, GoogleAuthDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private notificationsService: NotificationsService,
    private antiCheatService: AntiCheatService,
  ) {}

  async register(dto: RegisterDto, ctx?: RequestContext) {
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

    // Notification de bienvenue
    try {
      await this.notificationsService.notifyWelcome(user.id);
    } catch (err) { /* ignore */ }

    // Notifier le parrain
    if (referredById) {
      try {
        await this.notificationsService.notifyNewReferral(referredById, `${user.firstName} ${user.lastName}`);
      } catch (err) { /* ignore */ }
    }

    // Anti-triche : enregistrer l'empreinte
    if (dto.fingerprint) {
      try {
        await this.antiCheatService.recordFingerprint(user.id, {
          fingerprint: dto.fingerprint,
          ipAddress: ctx?.ip,
          userAgent: ctx?.userAgent,
        });
      } catch (err) { /* ignore */ }
    }

    // Si email fourni, exiger confirmation
    if (user.email) {
      try {
        await this.sendVerificationEmail(user.id, user.email, user.firstName);
      } catch (err) {
        console.error('Erreur envoi email de vérification:', err);
      }
      return {
        message: 'Compte créé. Vérifiez votre email pour activer le compte.',
        requiresEmailVerification: true,
      };
    }

    // Sinon, login direct
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

  async login(dto: LoginDto, ctx?: RequestContext) {
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
    if (!user.password) {
      throw new UnauthorizedException('Ce compte utilise Google. Connectez-vous avec Google.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    if (dto.email && !user.emailVerifiedAt) {
      throw new UnauthorizedException('Email non vérifié. Vérifiez votre boîte mail.');
    }

    // Vérifier que le compte n'est pas suspendu
    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      throw new UnauthorizedException('Compte suspendu');
    }

    const tokens = await this.generateTokens(user.id, user.role);

    // Anti-triche : enregistrer l'empreinte
    if (dto.fingerprint) {
      try {
        await this.antiCheatService.recordFingerprint(user.id, {
          fingerprint: dto.fingerprint,
          ipAddress: ctx?.ip,
          userAgent: ctx?.userAgent,
        });
      } catch (err) { /* ignore */ }
    }

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

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.email) {
      throw new BadRequestException('Utilisateur introuvable');
    }
    if (user.emailVerifiedAt) {
      return { message: 'Email déjà vérifié' };
    }
    await this.sendVerificationEmail(user.id, user.email, user.firstName);
    return { message: 'Email de vérification renvoyé' };
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Token manquant');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Lien invalide ou expiré');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return { message: 'Email vérifié avec succès' };
  }

  async googleAuth(dto: GoogleAuthDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });

    const user = existing
      ? await this.prisma.user.update({
          where: { id: existing.id },
          data: {
            provider: 'GOOGLE',
            googleId: existing.googleId || dto.googleId,
            avatarUrl: existing.avatarUrl || dto.avatarUrl,
            emailVerifiedAt: existing.emailVerifiedAt || new Date(),
          },
        })
      : await this.prisma.user.create({
          data: {
            email: dto.email,
            password: null,
            firstName: dto.firstName,
            lastName: dto.lastName,
            avatarUrl: dto.avatarUrl,
            provider: 'GOOGLE',
            googleId: dto.googleId,
            emailVerifiedAt: new Date(),
            wallet: {
              create: {},
            },
          },
        });

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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Toujours répondre "ok" pour ne pas révéler si l'email existe
    if (!user || !user.email || user.provider === 'GOOGLE') {
      return { message: 'Si cette adresse existe, un email de réinitialisation a été envoyé.' };
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    });

    try {
      await this.sendPasswordResetEmail(user.email, user.firstName, token);
    } catch (err) {
      console.error('Erreur envoi email reset password:', err);
    }

    return { message: 'Si cette adresse existe, un email de réinitialisation a été envoyé.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Lien de réinitialisation invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'Mot de passe modifié avec succès' };
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

  private async sendVerificationEmail(userId: string, email: string, firstName: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerificationToken: token,
        emailVerificationExpiresAt: expiresAt,
      },
    });

    const webUrl = this.configService.get('WEB_URL') || 'http://localhost:3000';
    const verifyUrl = `${webUrl}/verify-email?token=${token}`;

    const transporter = this.getMailTransporter();

    const from = this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER');

    await transporter.sendMail({
      from: `"XEARN" <${from}>`,
      to: email,
      subject: 'Confirmez votre adresse e-mail — XEARN',
      text: [
        `Bonjour ${firstName},`,
        '',
        'Merci de vous être inscrit(e) sur XEARN !',
        '',
        'Pour activer votre compte et accéder à la plateforme, veuillez confirmer votre adresse e-mail en cliquant sur le lien ci-dessous :',
        '',
        verifyUrl,
        '',
        'Ce lien est valable pendant 24 heures. Passé ce délai, vous devrez demander un nouveau lien de vérification.',
        '',
        'Si vous n\'avez pas créé de compte sur XEARN, vous pouvez ignorer cet e-mail en toute sécurité.',
        '',
        'Cordialement,',
        'L\'équipe XEARN',
      ].join('\n'),
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background-color:#6366f1;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">XEARN</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">Bienvenue sur XEARN, ${firstName} !</h2>
            <p style="margin:0 0 16px;color:#4a4a68;font-size:15px;line-height:1.6;">
              Merci de vous être inscrit(e) sur notre plateforme. Pour activer votre compte et commencer à utiliser XEARN, veuillez confirmer votre adresse e-mail.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td align="center">
                <a href="${verifyUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:6px;">
                  Confirmer mon adresse e-mail
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#4a4a68;font-size:14px;line-height:1.6;">
              Ou copiez-collez ce lien dans votre navigateur :
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${verifyUrl}" style="color:#6366f1;font-size:13px;">${verifyUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e5e5ef;margin:24px 0;">
            <p style="margin:0 0 8px;color:#8b8ba3;font-size:13px;line-height:1.5;">
              Ce lien est valable pendant <strong>24 heures</strong>. Passé ce délai, vous devrez demander un nouveau lien de vérification.
            </p>
            <p style="margin:0;color:#8b8ba3;font-size:13px;line-height:1.5;">
              Si vous n'avez pas créé de compte sur XEARN, ignorez simplement cet e-mail.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background-color:#f9f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e5e5ef;">
            <p style="margin:0;color:#8b8ba3;font-size:12px;">
              &copy; ${new Date().getFullYear()} XEARN — Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  }

  private async sendPasswordResetEmail(email: string, firstName: string, token: string) {
    const webUrl = this.configService.get('WEB_URL') || 'http://localhost:3000';
    const resetUrl = `${webUrl}/reset-password?token=${token}`;

    const transporter = this.getMailTransporter();

    const from = this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER');

    await transporter.sendMail({
      from: `"XEARN" <${from}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe — XEARN',
      text: [
        `Bonjour ${firstName},`,
        '',
        'Vous avez demandé la réinitialisation de votre mot de passe sur XEARN.',
        '',
        'Cliquez sur le lien ci-dessous pour choisir un nouveau mot de passe :',
        '',
        resetUrl,
        '',
        'Ce lien est valable pendant 1 heure.',
        '',
        'Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email.',
        '',
        'Cordialement,',
        'L\'équipe XEARN',
      ].join('\n'),
      html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background-color:#6366f1;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:1px;">XEARN</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1a1a2e;font-size:22px;font-weight:600;">Réinitialisation du mot de passe</h2>
            <p style="margin:0 0 16px;color:#4a4a68;font-size:15px;line-height:1.6;">
              Bonjour ${firstName}, vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
              <tr><td align="center">
                <a href="${resetUrl}" style="display:inline-block;background-color:#6366f1;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:6px;">
                  Réinitialiser mon mot de passe
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#4a4a68;font-size:14px;line-height:1.6;">
              Ou copiez-collez ce lien dans votre navigateur :
            </p>
            <p style="margin:0 0 24px;word-break:break-all;">
              <a href="${resetUrl}" style="color:#6366f1;font-size:13px;">${resetUrl}</a>
            </p>
            <hr style="border:none;border-top:1px solid #e5e5ef;margin:24px 0;">
            <p style="margin:0 0 8px;color:#8b8ba3;font-size:13px;line-height:1.5;">
              Ce lien est valable pendant <strong>1 heure</strong>.
            </p>
            <p style="margin:0;color:#8b8ba3;font-size:13px;line-height:1.5;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet e-mail.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f9f9fb;padding:24px 40px;text-align:center;border-top:1px solid #e5e5ef;">
            <p style="margin:0;color:#8b8ba3;font-size:12px;">
              &copy; ${new Date().getFullYear()} XEARN — Tous droits réservés.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });
  }

  /** Shared mail transporter — avoids duplicating SMTP config */
  private getMailTransporter() {
    return nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST') || 'smtp.gmail.com',
      port: Number(this.configService.get('SMTP_PORT') || 465),
      secure: String(this.configService.get('SMTP_SECURE') || 'true') === 'true',
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

}
