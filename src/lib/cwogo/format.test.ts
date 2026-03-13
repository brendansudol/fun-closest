import { describe, expect, it } from "vitest";

import { formatNumericValue, formatPromptNumericValue, isYearValuePrompt } from "./format";

describe("formatPromptNumericValue", () => {
  it("keeps grouping for standard numeric prompts", () => {
    expect(formatNumericValue(10_080)).toBe("10,080");
    expect(
      formatPromptNumericValue(10_080, {
        category: "Measurement",
        unitLabel: "minutes",
        unitShort: "min",
      }),
    ).toBe("10,080");
  });

  it("removes grouping for year-valued prompts", () => {
    expect(
      formatPromptNumericValue(1992, {
        category: "Year",
        unitLabel: "year",
        unitShort: "year",
      }),
    ).toBe("1992");
  });
});

describe("isYearValuePrompt", () => {
  it("detects year formatting from prompt metadata", () => {
    expect(
      isYearValuePrompt({
        category: "Year",
        unitLabel: "year",
        unitShort: "year",
      }),
    ).toBe(true);
  });

  it("does not treat other date-sensitive prompts as years", () => {
    expect(
      isYearValuePrompt({
        category: "Population",
        unitLabel: "people",
        unitShort: "people",
      }),
    ).toBe(false);
  });
});
