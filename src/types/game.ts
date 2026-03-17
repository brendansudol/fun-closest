export type Pack =
  | "mixed"
  | "geography"
  | "tech"
  | "us"
  | "space"
  | "sports"
  | "culture"
  | "nature"
  | "transportation"
  | "body"
  | "everyday"
  | "other";

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

export type RoomStore = {
  id: string;
  slug: string;
  joinCode: string;
  title: string;
  adminTokenHash: string;
  currentRoundId: string | null;
  defaultPack: Pack;
  defaultRoundSeconds: number;
  maxRounds: number | null;
  createdAt: string;
  updatedAt: string;
};

export type PlayerStore = {
  id: string;
  roomId: string;
  displayName: string;
  sessionTokenHash: string;
  scoreTotal: number;
  joinedAt: string;
  lastSeenAt: string;
  isActive: boolean;
};

export type RoundStore = {
  id: string;
  roomId: string;
  roundNumber: number;
  phase: RoundPhase;
  promptId: string;
  promptHistoryIds?: string[];
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

export type GuessStore = {
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
  pointsAwarded: number;
  isWinner: boolean;
};

export type GameStore = {
  version: number;
  rooms: Record<string, RoomStore>;
  players: Record<string, PlayerStore>;
  rounds: Record<string, RoundStore>;
  guesses: Record<string, GuessStore>;
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
  pointsAwarded: number;
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
  promptRevision: number;
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
    maxRounds: number | null;
    roomVersion: number;
  };
  game: {
    maxRounds: number | null;
    roundsPlayed: number;
    roundsRemaining: number | null;
    isGameOver: boolean;
    winnerPlayerIds: string[];
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
    maxRounds: number | null;
    roomVersion: number;
  };
  game: {
    maxRounds: number | null;
    roundsPlayed: number;
    roundsRemaining: number | null;
    isGameOver: boolean;
    winnerPlayerIds: string[];
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
