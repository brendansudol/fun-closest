import { describe, expect, it } from "vitest";

import { getResultNumberLineDomain } from "./result-number-line";

describe("getResultNumberLineDomain", () => {
  it("pads the lower and upper bounds around the visible values", () => {
    expect(
      getResultNumberLineDomain(100, [
        { guessNumeric: 90 },
        { guessNumeric: 140 },
      ]),
    ).toEqual({
      minValue: 81,
      maxValue: 154,
    });
  });

  it("clamps the lower bound at zero for small values", () => {
    expect(
      getResultNumberLineDomain(4.2, [
        { guessNumeric: 3.8 },
        { guessNumeric: 4.6 },
      ]),
    ).toEqual({
      minValue: 3,
      maxValue: 6,
    });
  });

  it("still produces a dynamic domain when there are no guesses", () => {
    expect(getResultNumberLineDomain(26.2, [])).toEqual({
      minValue: 23,
      maxValue: 29,
    });
  });
});
