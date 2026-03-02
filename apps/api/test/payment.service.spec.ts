import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../src/payment/payment.service';
import { MockPaymentProvider } from '../src/payment/mock-payment.provider';
import { FedaPayProvider } from '../src/payment/fedapay.provider';

describe('PaymentService', () => {
  const mockConfig = { get: jest.fn() };
  const mockMockProvider = {
    name: 'mock',
    collect: jest.fn(),
    disburse: jest.fn(),
    checkStatus: jest.fn(),
  };
  const mockFedapayProvider = {
    name: 'fedapay',
    collect: jest.fn(),
    disburse: jest.fn(),
    checkStatus: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  const buildModule = async (paymentMode: string) => {
    mockConfig.get.mockImplementation((key: string) => {
      if (key === 'PAYMENT_MODE') return paymentMode;
      return undefined;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: MockPaymentProvider, useValue: mockMockProvider },
        { provide: FedaPayProvider, useValue: mockFedapayProvider },
      ],
    }).compile();

    return module.get<PaymentService>(PaymentService);
  };

  describe('provider selection', () => {
    it('should use MockPaymentProvider when PAYMENT_MODE is "mock"', async () => {
      const service = await buildModule('mock');
      expect(service.getProviderName()).toBe('mock');
      expect(service.getProvider()).toBe(mockMockProvider);
    });

    it('should use FedaPayProvider when PAYMENT_MODE is "fedapay"', async () => {
      const service = await buildModule('fedapay');
      expect(service.getProviderName()).toBe('fedapay');
      expect(service.getProvider()).toBe(mockFedapayProvider);
    });

    it('should default to mock when PAYMENT_MODE is undefined', async () => {
      const service = await buildModule('');
      expect(service.getProviderName()).toBe('mock');
    });
  });
});

describe('MockPaymentProvider', () => {
  let provider: MockPaymentProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MockPaymentProvider],
    }).compile();

    provider = module.get<MockPaymentProvider>(MockPaymentProvider);
  });

  it('should have name "mock"', () => {
    expect(provider.name).toBe('mock');
  });

  it('collect should return completed status', async () => {
    const result = await provider.collect({
      amount: 4000,
      description: 'Activation',
      customerEmail: 'user@test.com',
    });

    expect(result.status).toBe('completed');
    expect(result.providerTransactionId).toMatch(/^mock_col_/);
    expect(result.message).toContain('4000');
  });

  it('disburse should return completed status', async () => {
    const result = await provider.disburse({
      amount: 5000,
      method: 'mtn_momo',
      accountInfo: '+228 90123456',
      recipientName: 'Test User',
    });

    expect(result.status).toBe('completed');
    expect(result.providerTransactionId).toMatch(/^mock_dis_/);
    expect(result.message).toContain('5000');
  });

  it('checkStatus should always return completed', async () => {
    const status = await provider.checkStatus('mock_col_123');
    expect(status).toBe('completed');
  });
});
