import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, ResendVerificationDto, GoogleAuthDto, ForgotPasswordDto, ResetPasswordDto } from './dto/auth.dto';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // 5 tentatives par minute pour register
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.register(dto, { ip, userAgent });
    if ((result as any)?.accessToken && (result as any)?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: (result as any).accessToken,
        refreshToken: (result as any).refreshToken,
      });
    }
    return this.filterAuthResponse(result, req);
  }

  // 10 tentatives par minute pour login (anti brute-force)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, { ip, userAgent });
    if ((result as any)?.accessToken && (result as any)?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: (result as any).accessToken,
        refreshToken: (result as any).refreshToken,
      });
    }
    return this.filterAuthResponse(result, req);
  }

  // 15 tentatives par minute pour refresh
  @Throttle({ default: { ttl: 60000, limit: 15 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const tokenFromCookie = (req as any)?.cookies?.refreshToken as string | undefined;
    const refreshToken = dto.refreshToken || tokenFromCookie || '';
    const result = await this.authService.refreshToken(refreshToken);
    if ((result as any)?.accessToken && (result as any)?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: (result as any).accessToken,
        refreshToken: (result as any).refreshToken,
      });
    }
    return this.filterAuthResponse(result, req);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('resend-verification')
  async resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('google')
  async googleAuth(@Body() dto: GoogleAuthDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.googleAuth(dto);
    if ((result as any)?.accessToken && (result as any)?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: (result as any).accessToken,
        refreshToken: (result as any).refreshToken,
      });
    }
    return this.filterAuthResponse(result, req);
  }

  // 3 tentatives par minute pour forgot-password (anti-spam)
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookies(res);
    return { success: true };
  }

  private filterAuthResponse(result: any, req: Request) {
    const wantsTokens = String(req.headers['x-auth-raw-tokens'] || '').toLowerCase() === 'true';
    if (wantsTokens) return result;

    if (result?.accessToken || result?.refreshToken) {
      return { user: result.user };
    }
    return result;
  }
}
