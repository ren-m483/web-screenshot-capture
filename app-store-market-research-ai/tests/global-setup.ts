import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";

const TEST_DB_PATH = path.join(__dirname, "..", "prisma", "test.db");

export default function globalSetup() {
  if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);

  execSync("npx prisma migrate deploy", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "inherit",
  });

  return () => {
    if (existsSync(TEST_DB_PATH)) unlinkSync(TEST_DB_PATH);
  };
}
