import { PACK_LABELS } from "./constants";
import type { Pack } from "@/types/cwogo";

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export function formatNumericValue(value: number) {
  if (Number.isInteger(value)) {
    return integerFormatter.format(value);
  }

  return decimalFormatter.format(value);
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
