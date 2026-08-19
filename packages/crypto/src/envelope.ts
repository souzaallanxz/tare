import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { KekProvider } from "./kek.ts";

const ALGO = "aes-256-gcm";
const DEK_BYTES = 32;
const NONCE_BYTES = 12;

export type Sealed = {
  readonly kekVersion: number;
  readonly wrappedDek: Buffer;
  readonly wrapNonce: Buffer;
  readonly wrapTag: Buffer;
  readonly ciphertext: Buffer;
  readonly nonce: Buffer;
  readonly tag: Buffer;
};

export function seal(plaintext: string, kek: KekProvider): Sealed {
  const dek = randomBytes(DEK_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGO, dek, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  const kekVersion = kek.currentVersion();
  const kekKey = kek.getKey(kekVersion);
  const wrapNonce = randomBytes(NONCE_BYTES);
  const wrapper = createCipheriv(ALGO, kekKey, wrapNonce);
  const wrappedDek = Buffer.concat([wrapper.update(dek), wrapper.final()]);
  const wrapTag = wrapper.getAuthTag();

  dek.fill(0);
  return { kekVersion, wrappedDek, wrapNonce, wrapTag, ciphertext, nonce, tag };
}

export function open(sealed: Sealed, kek: KekProvider): string {
  const kekKey = kek.getKey(sealed.kekVersion);
  const unwrapper = createDecipheriv(ALGO, kekKey, sealed.wrapNonce);
  unwrapper.setAuthTag(sealed.wrapTag);
  const dek = Buffer.concat([unwrapper.update(sealed.wrappedDek), unwrapper.final()]);

  const decipher = createDecipheriv(ALGO, dek, sealed.nonce);
  decipher.setAuthTag(sealed.tag);
  const plaintext = Buffer.concat([
    decipher.update(sealed.ciphertext),
    decipher.final(),
  ]).toString("utf8");

  dek.fill(0);
  return plaintext;
}

/** Compact wire format: kekVersion|wrapNonce|wrapTag|wrappedDek|nonce|tag|ciphertext, base64. */
export function serialize(s: Sealed): string {
  const header = Buffer.alloc(2);
  header.writeUInt16BE(s.kekVersion, 0);
  const lens = Buffer.alloc(8);
  lens.writeUInt16BE(s.wrapNonce.length, 0);
  lens.writeUInt16BE(s.wrapTag.length, 2);
  lens.writeUInt16BE(s.wrappedDek.length, 4);
  lens.writeUInt16BE(s.nonce.length, 6);
  return Buffer.concat([
    header,
    lens,
    s.wrapNonce,
    s.wrapTag,
    s.wrappedDek,
    s.nonce,
    s.tag,
    s.ciphertext,
  ]).toString("base64");
}

export function deserialize(b64: string): Sealed {
  const buf = Buffer.from(b64, "base64");
  const kekVersion = buf.readUInt16BE(0);
  const wrapNonceLen = buf.readUInt16BE(2);
  const wrapTagLen = buf.readUInt16BE(4);
  const wrappedDekLen = buf.readUInt16BE(6);
  const nonceLen = buf.readUInt16BE(8);
  let o = 10;
  const wrapNonce = buf.subarray(o, (o += wrapNonceLen));
  const wrapTag = buf.subarray(o, (o += wrapTagLen));
  const wrappedDek = buf.subarray(o, (o += wrappedDekLen));
  const nonce = buf.subarray(o, (o += nonceLen));
  const tag = buf.subarray(o, (o += 16));
  const ciphertext = buf.subarray(o);
  return { kekVersion, wrapNonce, wrapTag, wrappedDek, nonce, tag, ciphertext };
}
