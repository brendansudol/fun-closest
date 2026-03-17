import { describe, expect, it } from "vitest";

import { otherPrompts } from "./other-prompts";

function findPrompt(fragment: string) {
  const prompt = otherPrompts.find((entry) => entry.promptText.includes(fragment));

  expect(prompt).toBeDefined();
  return prompt!;
}

describe("otherPrompts", () => {
  it("adds every imported prompt to the other pack with a shared source label", () => {
    expect(otherPrompts.length).toBeGreaterThanOrEqual(12);
    expect(otherPrompts.every((prompt) => prompt.pack === "other")).toBe(true);
    expect(otherPrompts.every((prompt) => prompt.sourceLabel === "Internet :)")).toBe(true);
  });

  it("normalizes percent prompts to percentage points with a percent display", () => {
    const prompt = findPrompt("basic cable in 2000");

    expect(prompt.category).toBe("Percent");
    expect(prompt.unitLabel).toBe("percent");
    expect(prompt.unitShort).toBe("%");
    expect(prompt.answerNumeric).toBe(67.8);
    expect(prompt.answerDisplay).toBe("67.8%");
    expect(prompt.answerYear).toBe(2000);
  });

  it("converts year questions from count metadata to year metadata", () => {
    const prompt = findPrompt("Pluto discovered");

    expect(prompt.category).toBe("Year");
    expect(prompt.unitLabel).toBe("year");
    expect(prompt.unitShort).toBe("year");
    expect(prompt.answerNumeric).toBe(1930);
    expect(prompt.answerDisplay).toBe("1930");
    expect(prompt.answerYear).toBe(1930);
  });

  it("applies light cleanup to obvious text issues", () => {
    const prompt = findPrompt("Raging Bull");

    expect(prompt.promptText).toBe('How many pounds did Robert De Niro gain for his role as a boxer in the 1980 film "Raging Bull"?');
  });

  it("excludes imported prompts that do not fit the live game", () => {
    expect(otherPrompts.some((prompt) => prompt.promptText.includes("Southwest Airlines"))).toBe(false);
    expect(otherPrompts.some((prompt) => prompt.promptText.includes("Princess Diana"))).toBe(false);
  });
});
