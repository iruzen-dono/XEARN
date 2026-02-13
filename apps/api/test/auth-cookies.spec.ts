import { generateCsrfToken, parseDurationToMs } from '../src/auth/auth.cookies';

describe('auth.cookies', () => {
  it('parses duration strings to milliseconds', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationToMs('1h')).toBe(60 * 60 * 1000);
    expect(parseDurationToMs('2d')).toBe(2 * 24 * 60 * 60 * 1000);
    expect(parseDurationToMs('30s')).toBe(30 * 1000);
  });

  it('generates csrf tokens with stable length', () => {
    const token = generateCsrfToken();
    expect(token).toHaveLength(64);
  });
});
