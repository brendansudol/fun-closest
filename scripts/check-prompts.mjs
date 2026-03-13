import { PROMPTS } from "../src/lib/cwogo/prompts.ts";
import { summarizePromptBank } from "../src/lib/cwogo/prompt-validation.js";

const summary = summarizePromptBank(PROMPTS);

console.log(`Prompt bank valid: ${summary.total} prompts`);
console.log(JSON.stringify(summary.byPack, null, 2));
