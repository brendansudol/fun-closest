import type { Pack } from "@/types/cwogo";

export const HOST_COOKIE_NAME = "cwogo_host_session";
export const PLAYER_COOKIE_NAME = "cwogo_player_session";
export const DEFAULT_ROOM_TITLE = "Closest Without Going Over";
export const DEFAULT_ROUND_SECONDS = 25;
export const EXACT_BONUS_POINTS = 1;
export const MIN_ROUND_SECONDS = 10;
export const MAX_ROUND_SECONDS = 90;
export const MIN_MAX_ROUNDS = 1;
export const MAX_MAX_ROUNDS = 25;
export const ROUND_LENGTH_OPTIONS = [15, 20, 25, 30, 45, 60] as const;
export const ROUND_CAP_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: null, label: "Unlimited" },
  { value: 5, label: "5 rounds" },
  { value: 10, label: "10 rounds" },
  { value: 15, label: "15 rounds" },
];

export const PACK_OPTIONS: Array<{ value: Pack; label: string; description: string }> = [
  {
    value: "mixed",
    label: "Mixed",
    description: "Pull from every pack for a wider spread.",
  },
  {
    value: "geography",
    label: "Geography",
    description: "Places, maps, land area, and world facts.",
  },
  {
    value: "tech",
    label: "Tech",
    description: "Historic product, software, and internet facts.",
  },
  {
    value: "us",
    label: "US",
    description: "US landmarks, civics, and national trivia.",
  },
];

export const PACK_LABELS: Record<Pack, string> = PACK_OPTIONS.reduce<Record<Pack, string>>(
  (labels, option) => {
    labels[option.value] = option.label;
    return labels;
  },
  {
    mixed: "Mixed",
    geography: "Geography",
    tech: "Tech",
    us: "US",
  },
);
