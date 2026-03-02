import { Controller, Post, Body, HttpCode, HttpStatus, Get, Query, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ResendVerificationDto,
  GoogleAuthDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';

/** Shape returned by auth methods that include tokens */
interface AuthTokenResult {
  accessToken?: string;
  refreshToken?: string;
  [key: string]: unknown;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  // 5 tentatives par minute pour register
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'];
    const result = (await this.authService.register(dto, { ip, userAgent })) as AuthTokenResult;
    if (result?.accessToken && result?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    return this.filterAuthResponse(result);
  }

  // 10 tentatives par minute pour login (anti brute-force)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip;
    const userAgent = req.headers['user-agent'];
    const result = (await this.authService.login(dto, { ip, userAgent })) as AuthTokenResult;
    if (result?.accessToken && result?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    return this.filterAuthResponse(result);
  }

  // 15 tentatives par minute pour refresh
  @Throttle({ default: { ttl: 60000, limit: 15 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenFromCookie = req?.cookies?.refreshToken as string | undefined;
    const refreshToken = dto.refreshToken || tokenFromCookie || '';
    const result = (await this.authService.refreshToken(refreshToken)) as AuthTokenResult;
    if (result?.accessToken && result?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    return this.filterAuthResponse(result);
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

  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Post('google')
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = (await this.authService.googleAuth(dto)) as AuthTokenResult;
    if (result?.accessToken && result?.refreshToken) {
      setAuthCookies(res, this.configService, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      });
    }
    // Return tokens in body — the NextAuth server-side callback needs them
    // (cookies are only useful for browser requests, not server-to-server)
    return result;
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

  private filterAuthResponse(result: Record<string, unknown>) {
    if (result?.accessToken || result?.refreshToken) {
      const { accessToken, refreshToken, ...rest } = result;
      return rest;
    }
    return result;
  }
}
