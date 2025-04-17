import fs from "node:fs";
import path from "node:path";
import { memoizeAsync } from "src/util.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

vi.useFakeTimers();

describe("utils", () => {
  describe("memoizeAsync", () => {
    const testFn = vi.fn(async (id: number) => `data:${id}`);

    it("returns a result for the first call", async () => {
      const memoized = memoizeAsync(testFn);
      const result = await memoized(1);
      expect(result).toBe("data:1");
      expect(testFn).toHaveBeenCalledOnce();
    });

    it("returns a cached result", async () => {
      const memoized = memoizeAsync(testFn);
      const result1 = await memoized(1);
      const result2 = await memoized(1);
      expect(result1).toBe("data:1");
      expect(result2).toBe("data:1");
      expect(testFn).toHaveBeenCalledOnce();
    });

    it("returns a result after ttl expires", async () => {
      const memoized = memoizeAsync(testFn, {
        ttlMs: 1000,
      });
      const result1 = await memoized(1);
      expect(result1).toBe("data:1");

      vi.advanceTimersByTime(1500);
      const result2 = await memoized(1);
      expect(result2).toBe("data:1");
      expect(testFn).toHaveBeenCalledTimes(2);
    });

    it("can handle different keys", async () => {
      const memoized = memoizeAsync(testFn);
      const result1 = await memoized(1);
      const result2 = await memoized(2);
      expect(result1).toBe("data:1");
      expect(result2).toBe("data:2");
      expect(testFn).toHaveBeenCalledTimes(2);
    });

    it("can handle concurrent calls", async () => {
      const memoized = memoizeAsync(testFn);

      const p1 = memoized(1);
      const p2 = memoized(1);

      const [r1, r2] = await Promise.all([p1, p2]);

      expect(r1).toBe("data:1");
      expect(r2).toBe("data:1");
      expect(testFn).toHaveBeenCalledTimes(1);
    });
  });
});
