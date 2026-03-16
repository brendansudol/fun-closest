import { PACK_LABELS } from "./constants";
import type { Pack } from "@/types/game";

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

const plainIntegerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
  useGrouping: false,
});

const plainDecimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  useGrouping: false,
});

type NumericFormatOptions = {
  useGrouping?: boolean;
};

type PromptNumericFormatContext = {
  category?: string | null;
  unitLabel?: string | null;
  unitShort?: string | null;
};

function normalizeFormatField(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

export function formatNumericValue(value: number, options: NumericFormatOptions = {}) {
  const useGrouping = options.useGrouping ?? true;

  if (Number.isInteger(value)) {
    return useGrouping ? integerFormatter.format(value) : plainIntegerFormatter.format(value);
  }

  return useGrouping ? decimalFormatter.format(value) : plainDecimalFormatter.format(value);
}

export function isYearValuePrompt(context: PromptNumericFormatContext) {
  return [context.category, context.unitLabel, context.unitShort].some(
    (value) => normalizeFormatField(value) === "year",
  );
}

export function formatPromptNumericValue(value: number, context: PromptNumericFormatContext) {
  return formatNumericValue(value, { useGrouping: !isYearValuePrompt(context) });
}

export function formatPackLabel(pack: Pack) {
  return PACK_LABELS[pack];
}

export function formatCountdownLabel(secondsRemaining: number) {
  if (secondsRemaining <= 0) {
    return "00:00";
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function buildOriginPath(pathname: string) {
  if (typeof window === "undefined") {
    return pathname;
  }

  return `${window.location.origin}${pathname}`;
}
