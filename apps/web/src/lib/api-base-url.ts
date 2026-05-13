export function getApiBaseUrl(rawValue?: string): string {
  const value = rawValue || 'http://localhost:4000';
  return value.replace(/\/api\/?$/, '').replace(/\/+$/, '');
}
