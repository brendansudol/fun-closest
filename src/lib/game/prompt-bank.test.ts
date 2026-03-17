import { describe, expect, it } from "vitest";

import { PROMPTS } from "./prompts";
import { summarizePromptBank } from "./prompt-validation.js";

describe("prompt bank", () => {
  it("includes the new packs with at least ten prompts each", () => {
    const summary = summarizePromptBank(PROMPTS);

    expect(summary.total).toBeGreaterThan(0);
    expect(summary.byPack.culture).toBeGreaterThanOrEqual(10);
    expect(summary.byPack.nature).toBeGreaterThanOrEqual(10);
    expect(summary.byPack.transportation).toBeGreaterThanOrEqual(10);
    expect(summary.byPack.body).toBeGreaterThanOrEqual(10);
    expect(summary.byPack.everyday).toBeGreaterThanOrEqual(10);
  });
});
