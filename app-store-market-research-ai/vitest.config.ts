import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "file:./test.db",
    },
    globalSetup: "./tests/global-setup.ts",
    // すべての統合テストが同じSQLiteファイルを共有するため、
    // ファイル間の並列実行によるdeleteMany競合を避けるために直列実行する
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
