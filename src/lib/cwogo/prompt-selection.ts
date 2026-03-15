import { PROMPTS } from "./prompts";
import type { CwogoRoundStore, Pack, Prompt } from "@/types/cwogo";

function chooseRandomPrompt(pool: Prompt[]) {
  return pool[Math.floor(Math.random() * pool.length)] ?? null;
}

export function buildPromptPool(pack: Pack, prompts: Prompt[] = PROMPTS) {
  if (pack === "mixed") {
    return prompts;
  }

  return prompts.filter((prompt) => prompt.pack === pack);
}

export function getRoundPromptHistoryIds(round: Pick<CwogoRoundStore, "promptId" | "promptHistoryIds">) {
  if (round.promptHistoryIds && round.promptHistoryIds.length > 0) {
    return round.promptHistoryIds;
  }

  return [round.promptId];
}

export function getPromptRevision(round: Pick<CwogoRoundStore, "promptId" | "promptHistoryIds">) {
  return getRoundPromptHistoryIds(round).length - 1;
}

export function listUsedPromptIdsForRounds(rounds: Array<Pick<CwogoRoundStore, "promptId" | "promptHistoryIds">>) {
  return new Set(rounds.flatMap((round) => getRoundPromptHistoryIds(round)));
}

export function selectRandomPrompt(options: {
  pool: Prompt[];
  requestedPromptId?: string;
  usedPromptIds?: Iterable<string>;
  currentRoundPromptIds?: Iterable<string>;
  fallbackExcludePromptId?: string | null;
  allowFallbackToExcluded?: boolean;
}) {
  const { pool, requestedPromptId, usedPromptIds, currentRoundPromptIds, fallbackExcludePromptId } = options;

  if (pool.length === 0) {
    return null;
  }

  if (requestedPromptId) {
    return pool.find((prompt) => prompt.id === requestedPromptId) ?? null;
  }

  const usedPromptIdSet = new Set(usedPromptIds);
  const unseenInRoom = pool.filter((prompt) => !usedPromptIdSet.has(prompt.id));

  if (unseenInRoom.length > 0) {
    return chooseRandomPrompt(unseenInRoom);
  }

  const currentRoundPromptIdSet = new Set(currentRoundPromptIds);
  const unseenInCurrentRound = pool.filter((prompt) => !currentRoundPromptIdSet.has(prompt.id));

  if (unseenInCurrentRound.length > 0) {
    return chooseRandomPrompt(unseenInCurrentRound);
  }

  if (fallbackExcludePromptId) {
    const fallbackPool = pool.filter((prompt) => prompt.id !== fallbackExcludePromptId);

    if (fallbackPool.length > 0) {
      return chooseRandomPrompt(fallbackPool);
    }

    if (!options.allowFallbackToExcluded) {
      return null;
    }
  }

  return chooseRandomPrompt(pool);
}
