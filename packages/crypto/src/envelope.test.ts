import { describe, expect, it } from "vitest";
import { deserialize, open, seal, serialize } from "./envelope.ts";
import type { KekProvider } from "./kek.ts";

const kek: KekProvider = {
  currentVersion: () => 1,
  getKey: () => Buffer.alloc(32, 7),
};

describe("envelope", () => {
  it("round-trips a secret", () => {
    const sealed = seal("dapi-abcdef1234567890", kek);
    expect(open(sealed, kek)).toBe("dapi-abcdef1234567890");
  });

  it("serializes and deserializes losslessly", () => {
    const sealed = seal("hello", kek);
    const roundtrip = deserialize(serialize(sealed));
    expect(open(roundtrip, kek)).toBe("hello");
  });

  it("rejects tampered ciphertext", () => {
    const sealed = seal("hello", kek);
    sealed.ciphertext[0]! ^= 1;
    expect(() => open(sealed, kek)).toThrow();
  });
});
