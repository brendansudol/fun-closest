import { describe, expect, it } from "vitest";
import { listUsedPromptIdsForRounds, selectRandomPrompt } from "./prompt-selection";
import type { CwogoRoundStore, Prompt } from "@/types/cwogo";

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
    const rounds: Array<Pick<CwogoRoundStore, "promptId" | "promptHistoryIds">> = [
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
