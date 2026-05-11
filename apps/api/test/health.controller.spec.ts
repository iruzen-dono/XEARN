import { HealthController } from '../src/health.controller';
import { PrismaService } from '../src/prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrisma = {
    $queryRaw: jest.fn(),
  };

  beforeEach(() => {
    controller = new HealthController(mockPrisma as unknown as PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 when the database is reachable', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([{ ok: 1 }]);

    const response = {
      status: jest.fn(),
    } as any;

    const body = await controller.check(response);

    expect(response.status).not.toHaveBeenCalled();
    expect(body.status).toBe('ok');
    expect(body.db).toBe('connected');
  });

  it('returns 503 when the database is unreachable', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('db down'));

    const response = {
      status: jest.fn().mockReturnThis(),
    } as any;

    const body = await controller.check(response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(body.status).toBe('degraded');
    expect(body.db).toBe('disconnected');
  });
});
