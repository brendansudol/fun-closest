import type { Pack } from "@/types/game";

export const HOST_COOKIE_NAME = "game_host_session";
export const PLAYER_COOKIE_NAME = "game_player_session";
export const DEFAULT_ROOM_TITLE = "Inkling";
export const DEFAULT_ROUND_SECONDS = 30;
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
  {
    value: "space",
    label: "Space",
    description: "Planets, missions, astronomy, and NASA facts.",
  },
  {
    value: "sports",
    label: "Sports",
    description: "Official rules, dimensions, and game-day numbers.",
  },
  {
    value: "culture",
    label: "Culture",
    description: "Awards, literature, music, museums, and arts trivia.",
  },
  {
    value: "nature",
    label: "Nature",
    description: "Animals, weather, oceans, and natural-world facts.",
  },
  {
    value: "transportation",
    label: "Transportation",
    description: "Bridges, tunnels, aircraft, rail, and infrastructure facts.",
  },
  {
    value: "body",
    label: "Human Body",
    description: "Anatomy, health, pregnancy, and biology basics.",
  },
  {
    value: "everyday",
    label: "Food & Everyday",
    description: "Kitchen measures, packaging, nutrition, and household standards.",
  },
  {
    value: "other",
    label: "Other",
    description: "Imported one-offs, history, and grab-bag trivia.",
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
    space: "Space",
    sports: "Sports",
    culture: "Culture",
    nature: "Nature",
    transportation: "Transportation",
    body: "Human Body",
    everyday: "Food & Everyday",
    other: "Other",
  },
);
