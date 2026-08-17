export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  maxDelayMs?: number;
  sleep?: (delay: number) => Promise<void>;
}

export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { transient?: boolean; status?: number; code?: string };
  if (candidate.transient === true) return true;
  if (candidate.transient === false) return false;
  return candidate.status === 408 || candidate.status === 425 || candidate.status === 429 || (typeof candidate.status === 'number' && candidate.status >= 500) || ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(candidate.code ?? '');
}

export async function withRetries<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const baseDelay = Math.max(0, options.delayMs ?? 250);
  const maxDelay = Math.max(baseDelay, options.maxDelayMs ?? 4000);
  const sleep = options.sleep ?? ((delay: number) => new Promise<void>((resolve) => setTimeout(resolve, delay)));
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isTransientError(error)) throw error;
      const delay = Math.min(maxDelay, baseDelay * (2 ** (attempt - 1)));
      if (delay > 0) await sleep(delay);
    }
  }
  throw lastError;
}
