import { describe, expect, it } from "vitest";
import { buildPromptPool, listUsedPromptIdsForRounds, selectRandomPrompt } from "./prompt-selection";
import type { RoundStore, Prompt } from "@/types/game";

function createPrompt(id: string, pack: Prompt["pack"] = "mixed"): Prompt {
  return {
    id,
    pack,
    category: "Test",
    promptText: `Prompt ${id}`,
    unitLabel: "units",
    unitShort: "u",
    answerNumeric: 100,
    answerDisplay: "100",
  };
}

describe("selectRandomPrompt", () => {
  it("returns only prompts from the requested other pack", () => {
    const pool = buildPromptPool("other", [
      createPrompt("mixed-a", "mixed"),
      createPrompt("other-a", "other"),
      createPrompt("tech-a", "tech"),
      createPrompt("other-b", "other"),
    ]);

    expect(pool.map((prompt) => prompt.id)).toEqual(["other-a", "other-b"]);
  });

  it("keeps other-pack prompts eligible in mixed games", () => {
    const pool = buildPromptPool("mixed", [
      createPrompt("mixed-a", "mixed"),
      createPrompt("other-a", "other"),
      createPrompt("tech-a", "tech"),
    ]);

    expect(pool.map((prompt) => prompt.id)).toEqual(["mixed-a", "other-a", "tech-a"]);
  });

  it("prefers prompts not used anywhere in the room yet", () => {
    const selectedPrompt = selectRandomPrompt({
      pool: [createPrompt("a"), createPrompt("b"), createPrompt("c")],
      usedPromptIds: ["a", "b"],
      fallbackExcludePromptId: "b",
      allowFallbackToExcluded: true,
    });

    expect(selectedPrompt?.id).toBe("c");
  });

  it("counts swapped-away prompts as used for future selection", () => {
    const rounds: Array<Pick<RoundStore, "promptId" | "promptHistoryIds">> = [
      {
        promptId: "b",
        promptHistoryIds: ["a", "b"],
      },
      {
        promptId: "c",
      },
    ];

    expect([...listUsedPromptIdsForRounds(rounds)]).toEqual(["a", "b", "c"]);
  });

  it("avoids repeating prompts from the same round until that round exhausts the pack", () => {
    const selectedPrompt = selectRandomPrompt({
      pool: [createPrompt("a"), createPrompt("b"), createPrompt("c")],
      usedPromptIds: ["a", "b", "c"],
      currentRoundPromptIds: ["a", "b"],
      fallbackExcludePromptId: "b",
    });

    expect(selectedPrompt?.id).toBe("c");
  });

  it("returns null when a reroll has no alternate prompt available", () => {
    const selectedPrompt = selectRandomPrompt({
      pool: [createPrompt("only-tech", "tech")],
      usedPromptIds: ["only-tech"],
      currentRoundPromptIds: ["only-tech"],
      fallbackExcludePromptId: "only-tech",
    });

    expect(selectedPrompt).toBeNull();
  });
});
