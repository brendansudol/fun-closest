import { describe, expect, it } from "vitest";

import { packSchema } from "./validations";

describe("packSchema", () => {
  it.each([
    "culture",
    "nature",
    "transportation",
    "body",
    "everyday",
    "other",
  ])("accepts the %s pack", (pack) => {
    expect(packSchema.parse(pack)).toBe(pack);
  });
});
