import { describe, expect, it } from "vitest";

import { packSchema } from "./validations";

describe("packSchema", () => {
  it("accepts the other pack", () => {
    expect(packSchema.parse("other")).toBe("other");
  });
});
