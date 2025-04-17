import { createHash } from "node:crypto";

type CacheEntry<R> = { value: R; expiresAt: number };

export function memoizeAsync<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  options?: {
    ttlMs?: number;
    getTTL?: (...args: A) => number;
  },
): (...args: A) => Promise<R> {
  const cache = new Map<string, CacheEntry<R>>();
  const pending = new Map<string, Promise<R>>();

  return async (...args: A): Promise<R> => {
    const key = argsToKey(args);
    const entry = cache.get(key);

    const now = Date.now();
    const isValid = entry && now < entry.expiresAt;

    if (isValid) {
      return Promise.resolve(entry.value);
    }

    const pendingPromise = pending.get(key);
    if (pendingPromise) {
      return pending.get(key) as Promise<R>;
    }

    const promise = fn(...args)
      .then((value) => {
        const ttl = options?.getTTL?.(...args) ?? options?.ttlMs ?? 0;
        const expiresAt = ttl > 0 ? now + ttl : Number.POSITIVE_INFINITY;
        cache.set(key, { value, expiresAt });
        pending.delete(key);
        return value;
      })
      .catch((err) => {
        pending.delete(key);
        throw err;
      });

    pending.set(key, promise);
    return promise;
  };
}

export function argsToKey(args: unknown[]): string {
  const str = JSON.stringify(args);
  return createHash("sha256").update(str).digest("hex");
}
