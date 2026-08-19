/**
 * Key-Encryption Key provider. The KEK never leaves the process.
 *
 * Today: base64 32-byte key from TARE_MASTER_KEY env var.
 * Tomorrow: swap the implementation for AWS KMS / GCP KMS / HashiCorp Vault
 * without changing any caller. That is the only reason this interface exists.
 */
export type KekProvider = {
  currentVersion(): number;
  getKey(version: number): Buffer;
};

const CURRENT_VERSION = 1;

export function envKekProvider(env: NodeJS.ProcessEnv = process.env): KekProvider {
  const raw = env["TARE_MASTER_KEY"];
  if (!raw) {
    throw new Error("TARE_MASTER_KEY is not set");
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      `TARE_MASTER_KEY must decode to 32 bytes, got ${key.length}. ` +
        `Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
    );
  }

  return {
    currentVersion: () => CURRENT_VERSION,
    getKey: (version) => {
      if (version !== CURRENT_VERSION) {
        throw new Error(`Unknown KEK version ${version}; rotation not yet implemented`);
      }
      return key;
    },
  };
}
