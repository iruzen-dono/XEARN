import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HealthController } from '../src/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';

describe('HealthController', () => {
  let app: INestApplication;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  const getBaseUrl = () => {
    const address = app.getHttpServer().address();
    if (!address || typeof address === 'string') {
      throw new Error('HTTP server is not listening on a numeric port');
    }
    return `http://127.0.0.1:${address.port}`;
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
    await app.listen(0);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
    jest.clearAllMocks();
  });

  it('returns 200 when the database is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ ok: 1 }]);

    const response = await fetch(`${getBaseUrl()}/health`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });

  it('returns 503 when the database is unreachable', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('db down'));

    const response = await fetch(`${getBaseUrl()}/health`);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('disconnected');
  });
});
