export function getErrorMessage(error: unknown, fallback = 'Erreur') {
  return error instanceof Error ? error.message : fallback;
}
