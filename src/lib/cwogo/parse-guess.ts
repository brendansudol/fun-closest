import { CwogoError } from "./errors";

const WORD_MULTIPLIERS: Record<string, number> = {
  thousand: 1_000,
  k: 1_000,
  million: 1_000_000,
  m: 1_000_000,
  billion: 1_000_000_000,
  b: 1_000_000_000,
};

export function parseGuessInput(rawInput: string) {
  const normalizedInput = rawInput.trim().toLowerCase();

  if (!normalizedInput) {
    throw new CwogoError(400, "Enter a numeric guess.");
  }

  let multiplier = 1;
  let numericPart = normalizedInput.replace(/,/g, "").replace(/\s+/g, " ");

  for (const [suffix, value] of Object.entries(WORD_MULTIPLIERS)) {
    const suffixPattern = new RegExp(`\\s*${suffix}$`);
    if (suffixPattern.test(numericPart)) {
      multiplier = value;
      numericPart = numericPart.replace(suffixPattern, "").trim();
      break;
    }
  }

  const numericValue = Number.parseFloat(numericPart);

  if (!Number.isFinite(numericValue)) {
    throw new CwogoError(400, "That guess could not be parsed.");
  }

  const normalizedValue = Math.round(numericValue * multiplier * 10_000) / 10_000;

  if (normalizedValue <= 0) {
    throw new CwogoError(400, "Guesses must be greater than zero.");
  }

  return {
    normalizedValue,
  };
}
