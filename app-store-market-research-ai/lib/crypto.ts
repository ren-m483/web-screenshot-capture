import crypto from "node:crypto";

/**
 * Settingsテーブルに保存するAPIキーなどの機密値を暗号化する簡易ヘルパー（要件 5.3）。
 * ローカルアプリ想定のため、鍵は環境変数 SETTINGS_ENCRYPTION_KEY か、
 * 無い場合はプロセス起動時に生成する（再起動すると復号できなくなる点に注意）。
 */
const secret = process.env.SETTINGS_ENCRYPTION_KEY
  ? crypto.createHash("sha256").update(process.env.SETTINGS_ENCRYPTION_KEY).digest()
  : crypto.randomBytes(32);

export function encryptValue(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptValue(cipherText: string): string {
  const raw = Buffer.from(cipherText, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const encrypted = raw.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf-8");
}
