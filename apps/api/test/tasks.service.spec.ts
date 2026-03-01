import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TasksService } from '../src/tasks/tasks.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReferralsService } from '../src/referrals/referrals.service';
import { NotificationsService } from '../src/notifications/notifications.service';

const mockPrisma = {
  task: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  taskCompletion: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  taskSession: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  wallet: { update: jest.fn() },
  transaction: { create: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockReferrals = {
  distributeCommissions: jest.fn(),
};

const mockNotifications = {
  notifyTaskCompleted: jest.fn(),
};

describe('TasksService', () => {
  let service: TasksService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ReferralsService, useValue: mockReferrals },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  // ─── findAll ───────────────────────────────────────
  describe('findAll', () => {
    it('should return paginated active tasks', async () => {
      const tasks = [{ id: 't1', title: 'Task 1', status: 'ACTIVE' }];
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', tier: 'NORMAL' });
      mockPrisma.task.findMany.mockResolvedValue(tasks);
      mockPrisma.task.count.mockResolvedValue(1);

      const result = await service.findAll('u1', 1, 20);
      expect(result.tasks).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'ACTIVE' }) }),
      );
    });
  });

  // ─── create ────────────────────────────────────────
  describe('create', () => {
    it('should create a new task', async () => {
      const taskData = { title: 'Test Task', type: 'VIDEO_AD' as const, reward: 100 };
      mockPrisma.task.create.mockResolvedValue({ id: 'new-task', ...taskData });

      const result = await service.create(taskData);
      expect(result.id).toBe('new-task');
      expect(mockPrisma.task.create).toHaveBeenCalledWith({ data: taskData });
    });
  });

  // ─── completeTask ──────────────────────────────────
  describe('completeTask', () => {
    it('should throw NotFoundException if task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.completeTask('u1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw if task is not active', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', status: 'INACTIVE' });

      await expect(service.completeTask('u1', 't1')).rejects.toThrow('Tâche non disponible');
    });

    it('should throw if user is not activated', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', status: 'ACTIVE', requiredTier: 'NORMAL' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'FREE', tier: 'NORMAL' });

      await expect(service.completeTask('u1', 't1')).rejects.toThrow('Compte non activé');
    });

    it('should throw if task already completed by user', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', status: 'ACTIVE', requiredTier: 'NORMAL' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVATED', tier: 'NORMAL' });
      mockPrisma.taskCompletion.findUnique.mockResolvedValue({ id: 'tc1' });

      await expect(service.completeTask('u1', 't1')).rejects.toThrow('Tâche déjà complétée');
    });

    it('should throw if task was not started (no session)', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', status: 'ACTIVE', type: 'VIDEO_AD', requiredTier: 'NORMAL' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVATED', tier: 'NORMAL' });
      mockPrisma.taskCompletion.findUnique.mockResolvedValue(null);
      mockPrisma.taskSession.findUnique.mockResolvedValue(null);

      await expect(service.completeTask('u1', 't1')).rejects.toThrow('démarrer la tâche');
    });

    it('should throw if elapsed time is less than minimum', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 't1', status: 'ACTIVE', type: 'VIDEO_AD', completionCount: 0, maxCompletions: 100, requiredTier: 'NORMAL',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', status: 'ACTIVATED', tier: 'NORMAL' });
      mockPrisma.taskCompletion.findUnique.mockResolvedValue(null);
      mockPrisma.taskSession.findUnique.mockResolvedValue({
        userId: 'u1', taskId: 't1', startedAt: new Date(), completed: false,
      });
      mockPrisma.taskCompletion.findFirst.mockResolvedValue(null);

      await expect(service.completeTask('u1', 't1')).rejects.toThrow('Temps insuffisant');
    });
  });

  // ─── startTask ─────────────────────────────────────
  describe('startTask', () => {
    it('should throw NotFoundException if task does not exist', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(service.startTask('u1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw if task is not active', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 't1', status: 'INACTIVE' });

      await expect(service.startTask('u1', 't1')).rejects.toThrow();
    });
  });
});
