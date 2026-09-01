import { defineConfig } from "vitest/config";

/**
 * Config for `pnpm shots` only. The renderer lives outside the default test
 * glob on purpose — it writes PNGs and asserts nothing, so it must never be
 * picked up by `pnpm check`.
 */
export default defineConfig({
  test: {
    include: ["tools/preview/**/*.shot.ts"],
  },
});
