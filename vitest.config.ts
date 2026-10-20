import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["server/__tests__/**/*.test.ts"],
    setupFiles: ["./server/__tests__/cleanup.ts"],
  },
});
