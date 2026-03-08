export type Pack = "mixed" | "geography" | "tech" | "us";

export type RoundPhase = "open" | "locked" | "revealed";

export type Prompt = {
  id: string;
  pack: Pack;
  category: string;
  promptText: string;
  unitLabel: string;
  unitShort?: string;
  answerNumeric: number;
  answerDisplay: string;
  hintText?: string;
  difficulty?: 1 | 2 | 3;
  answerYear?: number;
  sourceLabel?: string;
};

export type CwogoRoomStore = {
  id: string;
  slug: string;
  joinCode: string;
  title: string;
  adminTokenHash: string;
  currentRoundId: string | null;
  defaultPack: Pack;
  defaultRoundSeconds: number;
  createdAt: string;
  updatedAt: string;
};

export type CwogoPlayerStore = {
  id: string;
  roomId: string;
  displayName: string;
  sessionTokenHash: string;
  scoreTotal: number;
  joinedAt: string;
  lastSeenAt: string;
  isActive: boolean;
};

export type CwogoRoundStore = {
  id: string;
  roomId: string;
  roundNumber: number;
  phase: RoundPhase;
  promptId: string;
  promptText: string;
  promptUnitLabel: string;
  promptUnitShort: string | null;
  answerNumeric: number;
  answerDisplay: string;
  hintText: string | null;
  pack: Pack;
  category: string | null;
  difficulty: number | null;
  opensAt: string;
  locksAt: string;
  lockedAt: string | null;
  revealedAt: string | null;
  scoreApplied: boolean;
  createdAt: string;
};

export type CwogoGuessStore = {
  id: string;
  roundId: string;
  playerId: string;
  guessNumeric: number;
  guessRaw: string;
  submittedAt: string;
  updatedAt: string;
  isBust: boolean | null;
  distanceUnder: number | null;
  rank: number | null;
  isWinner: boolean;
};

export type CwogoStore = {
  version: number;
  rooms: Record<string, CwogoRoomStore>;
  players: Record<string, CwogoPlayerStore>;
  rounds: Record<string, CwogoRoundStore>;
  guesses: Record<string, CwogoGuessStore>;
};

export type ScoreboardEntry = {
  playerId: string;
  displayName: string;
  scoreTotal: number;
  isMe?: boolean;
};

export type RevealedGuess = {
  playerId: string;
  displayName: string;
  guessNumeric: number;
  guessDisplay: string;
  guessRaw: string;
  isBust: boolean;
  isWinner: boolean;
  isExact: boolean;
  distanceUnder: number | null;
  rank: number | null;
  status: "winner" | "exact" | "under" | "bust";
  submittedAt: string;
  isMe?: boolean;
};

export type RoundResults = {
  answerNumeric: number;
  answerDisplay: string;
  winnerPlayerIds: string[];
  noWinner: boolean;
  revealedGuesses: RevealedGuess[];
};

export type RoundSummary = {
  id: string;
  roundNumber: number;
  phase: RoundPhase;
  pack: Pack;
  category: string | null;
  promptText: string;
  promptUnitLabel: string;
  promptUnitShort: string | null;
  hintText: string | null;
  opensAt: string;
  locksAt: string;
  lockedAt: string | null;
  revealedAt: string | null;
  serverNow: string;
  totalPlayers: number;
  submittedCount: number;
  results?: RoundResults;
};

export type HostPlayerSummary = {
  id: string;
  displayName: string;
  scoreTotal: number;
  hasSubmitted: boolean;
  joinedAt: string;
};

export type PlayerRosterEntry = {
  id: string;
  displayName: string;
  scoreTotal: number;
  joinedAt: string;
};

export type PlayerGuessSummary = {
  guessNumeric: number;
  guessRaw: string;
  displayGuess: string;
  updatedAt: string;
};

export type HostRoomState = {
  role: "host";
  room: {
    slug: string;
    title: string;
    joinCode: string;
    joinPath: string;
    defaultPack: Pack;
    defaultRoundSeconds: number;
    roomVersion: number;
  };
  players: HostPlayerSummary[];
  scoreboard: ScoreboardEntry[];
  currentRound: RoundSummary | null;
  canStartRound: boolean;
};

export type PlayerRoomState = {
  role: "player";
  room: {
    slug: string;
    title: string;
    joinCode: string;
    joinPath: string;
    defaultPack: Pack;
    defaultRoundSeconds: number;
    roomVersion: number;
  };
  me: {
    id: string;
    displayName: string;
    scoreTotal: number;
  };
  players: PlayerRosterEntry[];
  scoreboard: ScoreboardEntry[];
  currentRound: RoundSummary | null;
  myGuess: PlayerGuessSummary | null;
  canStartRound: boolean;
};

export type RoomStateResponse = HostRoomState | PlayerRoomState;
