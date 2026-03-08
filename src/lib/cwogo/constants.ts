import type { Pack } from "@/types/cwogo";

export const HOST_COOKIE_NAME = "cwogo_host_session";
export const PLAYER_COOKIE_NAME = "cwogo_player_session";
export const DEFAULT_ROOM_TITLE = "Closest Without Going Over";
export const DEFAULT_ROUND_SECONDS = 25;
export const MIN_ROUND_SECONDS = 10;
export const MAX_ROUND_SECONDS = 90;

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
