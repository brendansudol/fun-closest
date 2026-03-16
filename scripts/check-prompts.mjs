import { PROMPTS } from "../src/lib/game/prompts.ts";
import { summarizePromptBank } from "../src/lib/game/prompt-validation.js";

const summary = summarizePromptBank(PROMPTS);

console.log(`Prompt bank valid: ${summary.total} prompts`);
console.log(JSON.stringify(summary.byPack, null, 2));
