import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AntiCheatService } from '../src/auth/anti-cheat.service';

// --- Mocks ---
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
  verifyAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string): string | undefined => {
    const map: Record<string, string> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRES_IN: '15m',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_REFRESH_EXPIRES_IN: '7d',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '587',
      SMTP_USER: 'test@test.com',
      SMTP_PASS: 'password',
      FRONTEND_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'test-client-id',
    };
    return map[key] ?? undefined;
  }),
};

const mockNotifications = {
  notifyWelcome: jest.fn(),
  notifyNewReferral: jest.fn(),
};

const mockAntiCheat = {
  recordFingerprint: jest.fn().mockResolvedValue({ suspicious: false, matchedAccounts: [] }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: AntiCheatService, useValue: mockAntiCheat },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── register ──────────────────────────────────────
  describe('register', () => {
    it('should throw if neither email nor phone is provided', async () => {
      await expect(
        service.register({ password: 'Test1234', firstName: 'A', lastName: 'B' } as any),
      ).rejects.toThrow('Email ou numéro de téléphone requis');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'a@b.com',
          password: 'Test1234',
          firstName: 'A',
          lastName: 'B',
        } as any),
      ).rejects.toThrow('Email déjà utilisé');
    });

    it('should create user and wallet on valid registration', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        firstName: 'A',
        lastName: 'B',
      });

      const result = await service.register({
        email: 'new@test.com',
        password: 'Test1234',
        firstName: 'A',
        lastName: 'B',
      } as any);

      expect(mockPrisma.user.create).toHaveBeenCalled();
      const createArgs = mockPrisma.user.create.mock.calls[0][0];
      expect(createArgs.data.email).toBe('new@test.com');
      expect(createArgs.data.wallet).toEqual({ create: {} });
    });

    it('should link referrer if referralCode is valid', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ id: 'referrer-123', referralCode: 'ABC' }); // referrer lookup
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'x@y.com',
        firstName: 'A',
        lastName: 'B',
      });

      await service.register({
        email: 'x@y.com',
        password: 'Test1234',
        firstName: 'A',
        lastName: 'B',
        referralCode: 'ABC',
      } as any);

      const createArgs = mockPrisma.user.create.mock.calls[0][0];
      expect(createArgs.data.referredById).toBe('referrer-123');
    });
  });

  // ─── login ─────────────────────────────────────────
  describe('login', () => {
    it('should throw if user not found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@test.com', password: 'Test1234' } as any),
      ).rejects.toThrow();
    });

    it('should throw if password is incorrect', async () => {
      const hashed = await bcrypt.hash('correctPassword', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        password: hashed,
        status: 'FREE',
        emailVerifiedAt: new Date(),
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'wrongPassword' } as any),
      ).rejects.toThrow();
    });

    it('should throw for suspended users', async () => {
      const hashed = await bcrypt.hash('Test1234', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        password: hashed,
        status: 'SUSPENDED',
        emailVerifiedAt: new Date(),
      });

      await expect(
        service.login({ email: 'user@test.com', password: 'Test1234' } as any),
      ).rejects.toThrow();
    });

    it('should return tokens on valid login', async () => {
      const hashed = await bcrypt.hash('Test1234', 10);
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'u1',
        email: 'user@test.com',
        password: hashed,
        firstName: 'A',
        lastName: 'B',
        role: 'USER',
        status: 'FREE',
        emailVerifiedAt: new Date(),
      });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.login({ email: 'user@test.com', password: 'Test1234' } as any);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('user@test.com');
    });
  });

  // ─── Google OAuth ──────────────────────────────────
  describe('googleAuth', () => {
    // Mock the Google OAuth client on the service instance
    const mockVerifyIdToken = jest.fn();

    beforeEach(() => {
      (service as any).googleClient = { verifyIdToken: mockVerifyIdToken };
    });

    it('should create a new user for unknown Google account', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'google@test.com',
          sub: 'gid123',
          given_name: 'G',
          family_name: 'User',
          picture: undefined,
        }),
      });

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'g-user',
        email: 'google@test.com',
        firstName: 'G',
        lastName: 'User',
        role: 'USER',
        status: 'FREE',
        provider: 'GOOGLE',
      });

      const result = await service.googleAuth({ idToken: 'valid-google-id-token' });

      expect(result).toHaveProperty('accessToken');
      expect(mockPrisma.user.create).toHaveBeenCalled();
      expect(mockVerifyIdToken).toHaveBeenCalledWith({
        idToken: 'valid-google-id-token',
        audience: 'test-client-id',
      });
    });

    it('should login existing Google user', async () => {
      mockVerifyIdToken.mockResolvedValue({
        getPayload: () => ({
          email: 'google@test.com',
          sub: 'gid123',
          given_name: 'G',
          family_name: 'User',
        }),
      });

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'g-user',
        email: 'google@test.com',
        firstName: 'G',
        lastName: 'User',
        role: 'USER',
        status: 'FREE',
        provider: 'GOOGLE',
        googleId: 'gid123',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'g-user',
        email: 'google@test.com',
        firstName: 'G',
        lastName: 'User',
        role: 'USER',
        status: 'FREE',
        provider: 'GOOGLE',
        googleId: 'gid123',
      });

      const result = await service.googleAuth({ idToken: 'valid-google-id-token' });

      expect(result).toHaveProperty('accessToken');
      expect(mockPrisma.user.update).toHaveBeenCalled();
    });

    it('should reject invalid Google token', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      await expect(service.googleAuth({ idToken: 'invalid-token' })).rejects.toThrow(
        'Token Google invalide ou expiré',
      );
    });

    it('should throw if idToken is missing', async () => {
      await expect(service.googleAuth({ idToken: '' })).rejects.toThrow();
    });
  });
});
