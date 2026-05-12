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

describe('FedaPayProvider', () => {
  const mockConfig = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        FEDAPAY_ENV: 'sandbox',
        FEDAPAY_SECRET_KEY: 'secret-key',
        FEDAPAY_CALLBACK_URL: 'https://xearn.local/api/payment/webhook',
      };
      return map[key] ?? '';
    }),
  };

  const createResponse = (body: unknown) =>
    ({
      ok: true,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as Response;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('collect should return a pending payment with URL and payload', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any);
    fetchSpy
      .mockResolvedValueOnce(createResponse({ v1: { transaction: { id: 123 } } }))
      .mockResolvedValueOnce(createResponse({ v1: { token: { url: 'https://pay.xearn.local' } } }));

    const provider = new FedaPayProvider(mockConfig as unknown as ConfigService);
    const result = await provider.collect({
      amount: 4000,
      description: 'Activation du compte',
      customerEmail: 'user@test.com',
      customerName: 'Jane Doe',
      customerPhone: '+22890000000',
      callbackMeta: { userId: 'u-1' },
    });

    expect(result).toEqual({
      status: 'pending',
      providerTransactionId: '123',
      paymentUrl: 'https://pay.xearn.local',
      message: 'Redirection vers la page de paiement',
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'https://sandbox-api.fedapay.com/v1/transactions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-key',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({
          description: 'Activation du compte',
          amount: 4000,
          currency: { iso: 'XOF' },
          callback_url: 'https://xearn.local/api/payment/webhook',
          customer: {
            email: 'user@test.com',
            firstname: 'Jane',
            lastname: 'Doe',
            phone_number: { number: '+22890000000' },
          },
          metadata: { userId: 'u-1' },
        }),
      }),
    );

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'https://sandbox-api.fedapay.com/v1/transactions/123/token',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('disburse should map MTN_MOMO and return a pending payout', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch' as any);
    fetchSpy
      .mockResolvedValueOnce(createResponse({ v1: { payout: { id: 'payout-1' } } }))
      .mockResolvedValueOnce(createResponse({}));

    const provider = new FedaPayProvider(mockConfig as unknown as ConfigService);
    const result = await provider.disburse({
      amount: 4900,
      method: 'MTN_MOMO',
      accountInfo: '+22890000000',
      recipientName: 'John Doe',
    });

    expect(result).toEqual({
      status: 'pending',
      providerTransactionId: 'payout-1',
      message: 'Décaissement en cours de traitement',
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'https://sandbox-api.fedapay.com/v1/payouts',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          amount: 4900,
          currency: { iso: 'XOF' },
          mode: 'mtn',
          customer: {
            firstname: 'John',
            lastname: 'Doe',
            email: 'payout@xearn.com',
            phone_number: { number: '+22890000000' },
          },
        }),
      }),
    );

    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'https://sandbox-api.fedapay.com/v1/payouts/payout-1/start',
      expect.objectContaining({ method: 'PUT' }),
    );
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
