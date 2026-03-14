import { z } from "zod";
import {
  DEFAULT_ROUND_SECONDS,
  MAX_MAX_ROUNDS,
  MAX_ROUND_SECONDS,
  MIN_MAX_ROUNDS,
  MIN_ROUND_SECONDS,
} from "./constants";

export const packSchema = z.enum(["mixed", "geography", "tech", "us"]);

const maxRoundsSchema = z
  .number()
  .int()
  .min(MIN_MAX_ROUNDS, `Games must have at least ${MIN_MAX_ROUNDS} round.`)
  .max(MAX_MAX_ROUNDS, `Games must have at most ${MAX_MAX_ROUNDS} rounds.`);

export const createRoomSchema = z.object({
  title: z.string().trim().max(48, "Keep room titles under 48 characters.").default(""),
  defaultPack: packSchema.default("mixed"),
  defaultRoundSeconds: z
    .number()
    .int()
    .min(MIN_ROUND_SECONDS, `Round length must be at least ${MIN_ROUND_SECONDS} seconds.`)
    .max(MAX_ROUND_SECONDS, `Round length must be at most ${MAX_ROUND_SECONDS} seconds.`)
    .default(DEFAULT_ROUND_SECONDS),
  maxRounds: maxRoundsSchema.nullable().default(null),
});

export const joinRoomSchema = z.object({
  joinCode: z
    .string()
    .trim()
    .min(4, "Join code is too short.")
    .max(12, "Join code is too long.")
    .transform((value) => value.toUpperCase()),
  displayName: z.string().trim().min(1, "Enter your display name.").max(24, "Keep names under 24 characters."),
});

export const startRoundSchema = z.object({
  pack: packSchema.default("mixed"),
  roundSeconds: z
    .number()
    .int()
    .min(MIN_ROUND_SECONDS, `Round length must be at least ${MIN_ROUND_SECONDS} seconds.`)
    .max(MAX_ROUND_SECONDS, `Round length must be at most ${MAX_ROUND_SECONDS} seconds.`)
    .default(DEFAULT_ROUND_SECONDS),
  maxRounds: maxRoundsSchema.nullable().default(null),
  promptId: z.string().trim().optional(),
});

export const submitGuessSchema = z.object({
  guess: z.string().trim().min(1, "Enter a numeric guess.").max(40, "Guess is too long."),
  promptRevision: z.number().int().min(0, "Prompt revision is invalid."),
});
