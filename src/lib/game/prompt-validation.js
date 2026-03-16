const PROMPT_COUNT_MINIMUMS = {
  geography: 16,
  tech: 16,
  us: 16,
  space: 12,
  sports: 12,
  mixed: 12,
};

function normalizePromptText(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isDateSensitivePrompt(prompt) {
  const haystack = `${prompt.promptText} ${prompt.hintText ?? ""}`.toLowerCase();

  return [
    "estimate",
    "at launch",
    "launch lineup",
    "before 2017",
    "first published",
    "original ",
    "january 1,",
    "april 2024",
    "june 2024",
    "july 2008",
  ].some((needle) => haystack.includes(needle));
}

export function validatePromptBank(prompts) {
  const issues = [];
  const seenIds = new Map();
  const seenPromptTexts = new Map();
  const packCounts = {
    geography: 0,
    tech: 0,
    us: 0,
    space: 0,
    sports: 0,
    mixed: 0,
  };

  for (const prompt of prompts) {
    if (!prompt.id?.trim()) {
      issues.push("Prompt is missing an id.");
      continue;
    }

    packCounts[prompt.pack] += 1;

    const requiredTextFields = [
      ["id", prompt.id],
      ["category", prompt.category],
      ["promptText", prompt.promptText],
      ["unitLabel", prompt.unitLabel],
      ["answerDisplay", prompt.answerDisplay],
      ["sourceLabel", prompt.sourceLabel],
    ];

    for (const [field, value] of requiredTextFields) {
      if (typeof value !== "string" || value.trim().length === 0) {
        issues.push(`Prompt "${prompt.id}" is missing ${field}.`);
      }
    }

    if (prompt.unitShort !== undefined && prompt.unitShort.trim().length === 0) {
      issues.push(`Prompt "${prompt.id}" has an empty unitShort.`);
    }

    if (prompt.hintText !== undefined && prompt.hintText.trim().length === 0) {
      issues.push(`Prompt "${prompt.id}" has an empty hintText.`);
    }

    if (!Number.isFinite(prompt.answerNumeric) || prompt.answerNumeric <= 0) {
      issues.push(`Prompt "${prompt.id}" must have a positive numeric answer.`);
    }

    if (prompt.difficulty !== undefined && ![1, 2, 3].includes(prompt.difficulty)) {
      issues.push(`Prompt "${prompt.id}" has an invalid difficulty.`);
    }

    if (isDateSensitivePrompt(prompt) && typeof prompt.answerYear !== "number") {
      issues.push(`Prompt "${prompt.id}" is date-sensitive and must include answerYear.`);
    }

    if (seenIds.has(prompt.id)) {
      issues.push(`Duplicate prompt id "${prompt.id}".`);
    } else {
      seenIds.set(prompt.id, prompt.promptText);
    }

    const normalizedText = normalizePromptText(prompt.promptText);

    if (seenPromptTexts.has(normalizedText)) {
      issues.push(
        `Prompt "${prompt.id}" duplicates the prompt text used by "${seenPromptTexts.get(normalizedText)}".`,
      );
    } else {
      seenPromptTexts.set(normalizedText, prompt.id);
    }
  }

  for (const [pack, minimum] of Object.entries(PROMPT_COUNT_MINIMUMS)) {
    const count = packCounts[pack] ?? 0;

    if (count < minimum) {
      issues.push(`Pack "${pack}" needs at least ${minimum} prompts but only has ${count}.`);
    }
  }

  if (issues.length > 0) {
    throw new Error(`Prompt bank validation failed:\n- ${issues.join("\n- ")}`);
  }

  return prompts;
}

export function summarizePromptBank(prompts) {
  return prompts.reduce(
    (summary, prompt) => {
      summary.total += 1;
      summary.byPack[prompt.pack] += 1;
      return summary;
    },
    {
      total: 0,
      byPack: {
        geography: 0,
        tech: 0,
        us: 0,
        space: 0,
        sports: 0,
        mixed: 0,
      },
    },
  );
}
