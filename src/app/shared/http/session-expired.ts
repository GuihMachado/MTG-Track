/**
 * Marca uma falha 401 que o interceptor já resolveu (limpou a sessão, avisou e
 * redirecionou), para que o componente que fez a chamada não repita o aviso.
 */
interface HandledError {
  sessionExpired?: boolean;
}

export function markSessionExpired(error: object): void {
  (error as HandledError).sessionExpired = true;
}

export function isSessionExpired(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as HandledError).sessionExpired === true;
}
