import { formatNumericValue, formatPromptNumericValue } from "./format";
import type { Prompt } from "../../types/game";

type PromptInput = Omit<Prompt, "answerDisplay"> & {
  answerDisplay?: string;
};

type ImportedPromptUnit = "count" | "percent" | "ratio" | "usd";

type ImportedPromptSeed = {
  question: string;
  answerRaw: string;
  answerNumeric: number;
  unit: ImportedPromptUnit;
};

type PromptMetadata = Pick<PromptInput, "category" | "unitLabel" | "unitShort">;

function definePrompt(input: PromptInput): Prompt {
  return {
    ...input,
    answerDisplay: input.answerDisplay ?? formatPromptNumericValue(input.answerNumeric, input),
  };
}

function defineUsdPrompt(input: Omit<PromptInput, "answerDisplay" | "unitLabel" | "unitShort">): Prompt {
  return definePrompt({
    ...input,
    unitLabel: "US dollars",
    unitShort: "USD",
    answerDisplay: `$${formatNumericValue(input.answerNumeric)}`,
  });
}

function definePercentPrompt(input: Omit<PromptInput, "answerDisplay" | "unitLabel" | "unitShort">): Prompt {
  return definePrompt({
    ...input,
    unitLabel: "percent",
    unitShort: "%",
    answerDisplay: `${formatNumericValue(input.answerNumeric)}%`,
  });
}

function roundToFourDecimals(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function parseCompactAnswerRaw(value: string) {
  const normalized = value.trim().replace(/[$,%]/g, "").replace(/,/g, "").replace(/\s+/g, "");
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([kmb])?$/i);

  if (!match) {
    return null;
  }

  const base = Number.parseFloat(match[1]);

  if (!Number.isFinite(base)) {
    return null;
  }

  const suffix = match[2]?.toLowerCase();
  const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;

  return base * multiplier;
}

function cleanImportedPromptText(question: string) {
  let cleaned = question.trim();

  cleaned = cleaned
    .replace(/\bSouthwent\b/g, "Southwest")
    .replace(/\bexpenctancy\b/g, "expectancy")
    .replace(/\bKervorkian\b/g, "Kevorkian")
    .replace(/\bIrag\b/g, "Iraq")
    .replace(/\bmembersof\b/g, "members of")
    .replace(/\bfeed wide\b/g, "feet wide")
    .replace(/\bBritsh\b/g, "British")
    .replace(/\bnations's\b/g, "nation's")
    .replace(/\bamerican\b/g, "American")
    .replace(/\bnon stop\b/gi, "nonstop")
    .replace(/\bUS Census Bureau\b/g, "U.S. Census Bureau")
    .replace(/\bU\.S vice\b/g, "U.S. vice")
    .replace(/\bdoctor Jack Kevorkian\b/gi, "Dr. Jack Kevorkian")
    .replace(/\bThe lord of the rings\b/g, "The Lord of the Rings")
    .replace(/\bThe Lord Of The Rings\b/g, "The Lord of the Rings")
    .replace(/\bjanuary\b/g, "January")
    .replace(/\bVietnam war\b/g, "Vietnam War");

  if (
    cleaned ===
    'As of January 2004 estimates, what percentages of the world\'s populations is comprised of self-declared Agnostics, those with no religious affiliation?'
  ) {
    return "As of January 2004 estimates, what percentage of the world's population was comprised of self-declared agnostics with no religious affiliation?";
  }

  if (cleaned === "As of January 2005, what percent of U.S. vice presidents has become president?") {
    return "As of January 2005, what percent of U.S. vice presidents had become president?";
  }

  if (
    cleaned ===
    "Bill Gates the world's richest man. In dollars, what was his average net worth over the 5-year period from 1999 to 2003"
  ) {
    return "Bill Gates was the world's richest man. In dollars, what was his average net worth over the 5-year period from 1999 to 2003?";
  }

  if (
    cleaned ===
    'According to the U.S. Census Bureau, how many years longer is the life expectancy of women born in the U.S. in 2000 than of men born in the U.S. in 2000?'
  ) {
    return "According to the U.S. Census Bureau, how many years longer is the life expectancy of women born in the U.S. in 2000 than that of men born in the U.S. in 2000?";
  }

  if (cleaned === "As of January 2005, how many cities did Southwest Airlines service?") {
    return "As of January 2005, how many cities did Southwest Airlines serve?";
  }

  if (cleaned === 'How many Academy award nominations did "the lord of the rings" movie trilogy receive?') {
    return 'How many Academy Award nominations did "The Lord of the Rings" movie trilogy receive?';
  }

  if (cleaned === 'How many speaking roles were there in "The Lord Of The Rings" movie trilogy?') {
    return 'How many speaking roles were there in "The Lord of the Rings" movie trilogy?';
  }

  if (cleaned === 'In dollar, what was the budget for the 1997 film "Titanic"?') {
    return 'In dollars, what was the budget for the 1997 film "Titanic"?';
  }

  if (cleaned === 'In what year did Adam Smith first publish "The Wealth Of Nations", his book on capitalist economics?') {
    return 'In what year did Adam Smith first publish "The Wealth of Nations", his book on capitalist economics?';
  }

  if (cleaned === "How many pounds did Robert Deniro gain for his role as a boxer in the 1980 film \"Raging Bull\"?") {
    return 'How many pounds did Robert De Niro gain for his role as a boxer in the 1980 film "Raging Bull"?';
  }

  return cleaned;
}

function isYearPromptText(question: string) {
  return /\bin what year\b/i.test(question) || /\bwhat year\b/i.test(question);
}

function normalizeExtractedUnitLabel(value: string) {
  let cleaned = value.trim().toLowerCase().replace(/\s+/g, " ");

  cleaned = cleaned.replace(/^the /, "").replace(/^different /, "");

  const overrides: Record<string, string> = {
    "academy award nominations": "nominations",
    "full-length plays": "plays",
    "speaking roles": "roles",
    "smithsonian institute museums": "museums",
    "credit cards": "credit cards",
    "movie theater screens": "screens",
    "online purchases": "purchases",
    "different colors of crayola crayons": "colors",
  };

  return overrides[cleaned] ?? cleaned;
}

function extractCountLabel(question: string) {
  const patterns = [
    /^how many (.+?) (?:did|does|do|was|were|are|is|had|have|has|can|could|would|will)\b/i,
    /^in how many (.+?) (?:did|does|do|was|were|are|is|had|have|has|can|could|would|will)\b/i,
    /^what (?:is|was) the average number of (.+?) (?:eaten|made|spent|in|over|for|at|per)\b/i,
    /^what was the highest number of (.+?) (?:in|during)\b/i,
    /^of the [^,]+, how many (.+?) (?:were|was|are|is|did|do|does|had|have|has)\b/i,
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);

    if (match) {
      return normalizeExtractedUnitLabel(match[1]);
    }
  }

  return null;
}

function inferPromptMetadata(question: string, unit: ImportedPromptUnit): PromptMetadata {
  const lower = question.toLowerCase();

  if (unit === "percent") {
    return {
      category: "Percent",
      unitLabel: "percent",
      unitShort: "%",
    };
  }

  if (unit === "usd") {
    return {
      category: "Price",
      unitLabel: "US dollars",
      unitShort: "USD",
    };
  }

  if (isYearPromptText(question)) {
    return {
      category: "Year",
      unitLabel: "year",
      unitShort: "year",
    };
  }

  if (unit === "ratio" || lower.includes("times greater")) {
    return {
      category: "Ratio",
      unitLabel: "times",
      unitShort: "x",
    };
  }

  if (/\biq\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "IQ points",
      unitShort: "IQ",
    };
  }

  if (/\bdegrees fahrenheit\b/.test(lower)) {
    return {
      category: "Temperature",
      unitLabel: "degrees Fahrenheit",
      unitShort: "deg F",
    };
  }

  if (/\bmiles per hour\b/.test(lower)) {
    return {
      category: "Speed",
      unitLabel: "miles per hour",
      unitShort: "mph",
    };
  }

  if (/\byears longer\b/.test(lower) || /\bhow old\b/.test(lower) || /\baverage age\b/.test(lower) || /\blife expectancy\b/.test(lower) || /\blife span\b/.test(lower) || /\bin years\b/.test(lower) || /\bhow many years\b/.test(lower)) {
    return {
      category: "Age",
      unitLabel: "years",
      unitShort: "years",
    };
  }

  if (/\bminutes\b/.test(lower)) {
    return {
      category: "Time",
      unitLabel: "minutes",
      unitShort: "min",
    };
  }

  if (/\bhours\b/.test(lower)) {
    return {
      category: "Time",
      unitLabel: "hours",
      unitShort: "hours",
    };
  }

  if (/\bdays\b/.test(lower)) {
    return {
      category: "Time",
      unitLabel: "days",
      unitShort: "days",
    };
  }

  if (/\bweeks\b/.test(lower)) {
    return {
      category: "Time",
      unitLabel: "weeks",
      unitShort: "weeks",
    };
  }

  if (/\bpints\b/.test(lower)) {
    return {
      category: "Volume",
      unitLabel: "pints",
      unitShort: "pints",
    };
  }

  if (/\bliters\b/.test(lower)) {
    return {
      category: "Volume",
      unitLabel: "liters",
      unitShort: "L",
    };
  }

  if (/\bpounds\b/.test(lower)) {
    return {
      category: "Weight",
      unitLabel: "pounds",
      unitShort: "lb",
    };
  }

  if (/\binches\b/.test(lower)) {
    return {
      category: "Length",
      unitLabel: "inches",
      unitShort: "in",
    };
  }

  if (/\bfeet\b/.test(lower)) {
    return {
      category: /\btall\b|\bheight\b|\babove sea level\b|\bbelow sea level\b/.test(lower) ? "Height" : "Length",
      unitLabel: "feet",
      unitShort: "ft",
    };
  }

  if (/\bmiles\b/.test(lower)) {
    return {
      category: "Distance",
      unitLabel: "miles",
      unitShort: "mi",
    };
  }

  if (/\bpopulation\b/.test(lower) || /\bhow many people\b/.test(lower) || /\bhow many people live\b/.test(lower) || /\bworld's population\b/.test(lower)) {
    return {
      category: "Population",
      unitLabel: "people",
      unitShort: "people",
    };
  }

  if (/\bviewers\b/.test(lower)) {
    return {
      category: "Audience",
      unitLabel: "viewers",
      unitShort: "viewers",
    };
  }

  if (/\bcities\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "cities",
      unitShort: "cities",
    };
  }

  if (/\bcountries\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "countries",
      unitShort: "countries",
    };
  }

  if (/\bawards\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "awards",
      unitShort: "awards",
    };
  }

  if (/\bnominations\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "nominations",
      unitShort: "nominations",
    };
  }

  if (/\bpoints\b/.test(lower)) {
    return {
      category: "Points",
      unitLabel: "points",
      unitShort: "points",
    };
  }

  if (/\bcredit cards\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "credit cards",
      unitShort: "cards",
    };
  }

  if (/\bseats\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "seats",
      unitShort: "seats",
    };
  }

  if (/\bscreens\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "screens",
      unitShort: "screens",
    };
  }

  if (/\bschools\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "schools",
      unitShort: "schools",
    };
  }

  if (/\belevators\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "elevators",
      unitShort: "elevators",
    };
  }

  if (/\bcovers\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "covers",
      unitShort: "covers",
    };
  }

  if (/\bbooks\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "books",
      unitShort: "books",
    };
  }

  if (/\bmuseums\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "museums",
      unitShort: "museums",
    };
  }

  if (/\broles\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "roles",
      unitShort: "roles",
    };
  }

  if (/\bsymphonies\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "symphonies",
      unitShort: "symphonies",
    };
  }

  if (/\bplays\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "plays",
      unitShort: "plays",
    };
  }

  if (/\bletters\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "letters",
      unitShort: "letters",
    };
  }

  if (/\bcolors\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "colors",
      unitShort: "colors",
    };
  }

  if (/\bturkeys\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "turkeys",
      unitShort: "turkeys",
    };
  }

  if (/\bfires\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "fires",
      unitShort: "fires",
    };
  }

  if (/\bhorses\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "horses",
      unitShort: "horses",
    };
  }

  if (/\bathletes\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "athletes",
      unitShort: "athletes",
    };
  }

  if (/\bstones\b/.test(lower)) {
    return {
      category: "Count",
      unitLabel: "stones",
      unitShort: "stones",
    };
  }

  const extracted = extractCountLabel(question);

  if (extracted) {
    return {
      category: "Count",
      unitLabel: extracted,
      unitShort: extracted.length <= 16 ? extracted : undefined,
    };
  }

  return {
    category: "Count",
    unitLabel: "count",
    unitShort: "count",
  };
}

function inferAnswerYear(question: string, answerNumeric: number, metadata: PromptMetadata) {
  if (metadata.unitLabel === "year" || metadata.unitShort === "year") {
    return Math.round(answerNumeric);
  }

  const yearMatches = [...question.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\b/g)].map(([, value]) => Number(value));

  if (yearMatches.length > 0) {
    return Math.max(...yearMatches);
  }

  return undefined;
}

function normalizeImportedNumeric(seed: ImportedPromptSeed) {
  if (seed.unit === "percent") {
    return roundToFourDecimals(seed.answerNumeric * 100);
  }

  const parsedRawValue = parseCompactAnswerRaw(seed.answerRaw);

  if (parsedRawValue !== null && parsedRawValue !== seed.answerNumeric) {
    return parsedRawValue;
  }

  return seed.answerNumeric;
}

function buildImportedPromptId(promptText: string, seenIds: Map<string, number>) {
  const slug = promptText
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  const baseId = `other-${slug || "prompt"}`;
  const nextIndex = (seenIds.get(baseId) ?? 0) + 1;

  seenIds.set(baseId, nextIndex);
  return nextIndex === 1 ? baseId : `${baseId}-${nextIndex}`;
}

const OTHER_PROMPT_SEEDS: ImportedPromptSeed[] = [
  {
    "question": "22.6% of U.S. households with TVs subscribed to basic cable in 1980. What percent subscribed to basic cable in 2000?",
    "answerRaw": "67.8%",
    "answerNumeric": 0.678,
    "unit": "percent"
  },
  {
    "question": "As of January 2005, what is the highest dollar price ever paid for a baseball card?",
    "answerRaw": "1.2M",
    "answerNumeric": 1200000,
    "unit": "usd"
  },
  {
    "question": "According to Blockbuster Inc., what percent of Americans watch the same movie each year as a part of their Christmas holiday tradition?",
    "answerRaw": "61%",
    "answerNumeric": 0.61,
    "unit": "percent"
  },
  {
    "question": "According to 2003 estimates, what percent of the U.S. population was born outside the U.S.?",
    "answerRaw": "11.5",
    "answerNumeric": 0.115,
    "unit": "percent"
  },
  {
    "question": "According to the 1994 film \"Forrest Gump\", what was Gump's IQ?",
    "answerRaw": "75",
    "answerNumeric": 75,
    "unit": "count"
  },
  {
    "question": "As of January 2004 estimates, what percentages of the world's populations is comprised of self-declared Agnostics, those with no religious affiliation?",
    "answerRaw": "12.02%",
    "answerNumeric": 0.1202,
    "unit": "percent"
  },
  {
    "question": "As of 2005, what was the least number of combined points scored by both teams in a Super Bowl?",
    "answerRaw": "21",
    "answerNumeric": 21,
    "unit": "count"
  },
  {
    "question": "As of 2005, how many Grammy Awards has Bob Dylan received?",
    "answerRaw": "8",
    "answerNumeric": 8,
    "unit": "count"
  },
  {
    "question": "According to July 2004 estimates, how many times greater is the population of the U.S. than that of Canada?",
    "answerRaw": "9.01",
    "answerNumeric": 9.01,
    "unit": "ratio"
  },
  {
    "question": "As of January 2005, how many cities did Southwent Airlines service?",
    "answerRaw": "59",
    "answerNumeric": 59,
    "unit": "count"
  },
  {
    "question": "According to 2003 estimates, what percent of the U.S. prison population is imprisoned for drug offenses?",
    "answerRaw": "54.8%",
    "answerNumeric": 0.548,
    "unit": "percent"
  },
  {
    "question": "According to 2002 estimates, what is the average annual dollar salary of those employed in the New York City metropolitan area?",
    "answerRaw": "57,708",
    "answerNumeric": 57708,
    "unit": "usd"
  },
  {
    "question": "According to 2003 estimates, what percent of U.S. physicians are women?",
    "answerRaw": "25.8%",
    "answerNumeric": 0.258,
    "unit": "percent"
  },
  {
    "question": "As of January 2005, what percent of U.S. presidents had served in a war?",
    "answerRaw": "57.14%",
    "answerNumeric": 0.5714,
    "unit": "percent"
  },
  {
    "question": "According to 2003 estimates, what percent of Americans age 25 or over have a high school diploma?",
    "answerRaw": "85%",
    "answerNumeric": 0.85,
    "unit": "percent"
  },
  {
    "question": "According to July 2004 estimates, how many people live in the U.S?",
    "answerRaw": "293M",
    "answerNumeric": 293000000,
    "unit": "count"
  },
  {
    "question": "According to July 2004 estimates, what is the world's population?",
    "answerRaw": "6.3B",
    "answerNumeric": 6300000000,
    "unit": "count"
  },
  {
    "question": "According to a 2004 nationwide survey, what percent of Baby Boomers said that the best years of their lives would come after they retire?",
    "answerRaw": "57%",
    "answerNumeric": 0.57,
    "unit": "percent"
  },
  {
    "question": "According to July 2004 estimates, what is the population of Germany, Europe's most populous country?",
    "answerRaw": "82.4M",
    "answerNumeric": 82400000,
    "unit": "count"
  },
  {
    "question": "According to 2005 estimates, how many credit cards are in use in the U.S.?",
    "answerRaw": "1.4B",
    "answerNumeric": 1400000000,
    "unit": "count"
  },
  {
    "question": "According to the US Census Bureau, how many years longer is the life expenctancy of women born in the U.S. in 2000 than of men born in the U.S. in 2000?",
    "answerRaw": "5.4",
    "answerNumeric": 5.4,
    "unit": "count"
  },
  {
    "question": "According to a 2005 nationwide survey, what percent of Americans find the commercials to be the most important element of the Super Bowl?",
    "answerRaw": "15.7%",
    "answerNumeric": 0.157,
    "unit": "percent"
  },
  {
    "question": "According to 2002 estimates, what percent of the U.S. population is comprised of self-declared Protestants?",
    "answerRaw": "52%",
    "answerNumeric": 0.52,
    "unit": "percent"
  },
  {
    "question": "As of 1983, what was the weight in pounds of the largest freshwater fish ever caught?",
    "answerRaw": "468",
    "answerNumeric": 468,
    "unit": "count"
  },
  {
    "question": "According to 2002 estimates, what percent of U.S. workers with email access spend more than an hour per day on email?",
    "answerRaw": "27%",
    "answerNumeric": 0.27,
    "unit": "percent"
  },
  {
    "question": "As of January 2005, what percent of U.S vice presidents has become president?",
    "answerRaw": "30.43%",
    "answerNumeric": 0.3043,
    "unit": "percent"
  },
  {
    "question": "According to July 2004 estimates, what percent of the world's population lives in Asia?",
    "answerRaw": "60.67%",
    "answerNumeric": 0.6067,
    "unit": "percent"
  },
  {
    "question": "According to 2003 estimates, how many people live in Wyoming, the least populous U.S. state?",
    "answerRaw": "501,242",
    "answerNumeric": 501242,
    "unit": "count"
  },
  {
    "question": "As of January 2005, what was the highest dollar value paid for a printed collection of William Shakespeare's plays?",
    "answerRaw": "6.1M",
    "answerNumeric": 6100000,
    "unit": "usd"
  },
  {
    "question": "According to a 2003 poll, what percent of U.S. adult internet users said their daily routines would be affected if they could no longer use the internet?",
    "answerRaw": "64%",
    "answerNumeric": 0.64,
    "unit": "percent"
  },
  {
    "question": "As of 2005, how many horses had won racing's prestigious Triple Crown?",
    "answerRaw": "11",
    "answerNumeric": 11,
    "unit": "count"
  },
  {
    "question": "According to a 2004 nationwide poll, what percent of American teens said that a career as a doctor would be their ideal job?",
    "answerRaw": "6.2%",
    "answerNumeric": 0.062,
    "unit": "percent"
  },
  {
    "question": "As of May 2005, how many countries were membersof the European Union?",
    "answerRaw": "25",
    "answerNumeric": 25,
    "unit": "count"
  },
  {
    "question": "As of January 2005, Pablo Picasso's \"Boy with a pipe\" was the most expensive painting ever sold at auction. How much was paid, in dollars?",
    "answerRaw": "104.2M",
    "answerNumeric": 104200000,
    "unit": "usd"
  },
  {
    "question": "According to a 2004 consumer survey, what percent of american families annually spend more than they earn?",
    "answerRaw": "40%",
    "answerNumeric": 0.4,
    "unit": "percent"
  },
  {
    "question": "By what percentage did the population of Detroit drop between 1980 and 2000?",
    "answerRaw": "20.95%",
    "answerNumeric": 0.2095,
    "unit": "percent"
  },
  {
    "question": "Bill Gates the world's richest man. In dollars, what was his average net worth over the 5-year period from 1999 to 2003",
    "answerRaw": "49B",
    "answerNumeric": 49000000000,
    "unit": "usd"
  },
  {
    "question": "During his 1999 trial, how many people did doctor Jack Kervorkian admit to having helped commit suicide?",
    "answerRaw": "130",
    "answerNumeric": 130,
    "unit": "count"
  },
  {
    "question": "For how many years did Saddam Hussein serve as president of Irag?",
    "answerRaw": "24.41",
    "answerNumeric": 24.41,
    "unit": "count"
  },
  {
    "question": "For how many consecutive weeks was Pink Floyd's hit album \"The Dark Side of the Moon\" on the Billboard 200 album chart?",
    "answerRaw": "741",
    "answerNumeric": 741,
    "unit": "count"
  },
  {
    "question": "For how many years did the South African government practice the policy of apartheid before beginning to dismantle the system in 1990?",
    "answerRaw": "42",
    "answerNumeric": 42,
    "unit": "count"
  },
  {
    "question": "How many times was actress Susan Lucci nominated but not selected for a Daytime Emmy Award before she won one in 1999?",
    "answerRaw": "18",
    "answerNumeric": 18,
    "unit": "count"
  },
  {
    "question": "How many hours did it take Charles Lindbergh to fly non stop from New York to Paris in 1927?",
    "answerRaw": "33.5",
    "answerNumeric": 33.5,
    "unit": "count"
  },
  {
    "question": "How many sets of quadruplets were born in the U.S. over the 5-year period from 1998 to 2002?",
    "answerRaw": "2,580",
    "answerNumeric": 2580,
    "unit": "count"
  },
  {
    "question": "How many feet tall is Venezuela's Angel Falls, the world's tallest waterfall?",
    "answerRaw": "3,212",
    "answerNumeric": 3212,
    "unit": "count"
  },
  {
    "question": "How many symphonies did Ludwig van Beethoven compose?",
    "answerRaw": "9",
    "answerNumeric": 9,
    "unit": "count"
  },
  {
    "question": "How many Academy award nominations did \"the lord of the rings\" movie trilogy receive?",
    "answerRaw": "30",
    "answerNumeric": 30,
    "unit": "count"
  },
  {
    "question": "How much did the average gallon of unleaded regular gasoline cost in the U.S. in 1976?",
    "answerRaw": "61.4",
    "answerNumeric": 61.4,
    "unit": "usd"
  },
  {
    "question": "How many dollars did The Gutenberg Bible sell for at auction in 1987?",
    "answerRaw": "5.3",
    "answerNumeric": 5.3,
    "unit": "usd"
  },
  {
    "question": "How many people were hanged for practicing witchcraft in Salem, Massachusetts in 1692?",
    "answerRaw": "19",
    "answerNumeric": 19,
    "unit": "count"
  },
  {
    "question": "How many miles long was the Tour de France bicycle race in 2005?",
    "answerRaw": "2,227",
    "answerNumeric": 2227,
    "unit": "count"
  },
  {
    "question": "How many days does it take for Mercury to revolve around the sun?",
    "answerRaw": "87.97",
    "answerNumeric": 87.97,
    "unit": "count"
  },
  {
    "question": "How many years did it take Michelangelo to paint the ceiling of the Sistine Chapel?",
    "answerRaw": "4",
    "answerNumeric": 4,
    "unit": "count"
  },
  {
    "question": "How many feet long was the longest snake ever recorded?",
    "answerRaw": "32.79",
    "answerNumeric": 32.79,
    "unit": "count"
  },
  {
    "question": "How many feet below sea level is the Dead Sea?",
    "answerRaw": "1373",
    "answerNumeric": 1373,
    "unit": "count"
  },
  {
    "question": "How many viewers watched the final episode of the TV sitcom \"Seinfeld\"?",
    "answerRaw": "76M",
    "answerNumeric": 76000000,
    "unit": "count"
  },
  {
    "question": "How many full-length plays did William Shakespeare write?",
    "answerRaw": "37",
    "answerNumeric": 37,
    "unit": "count"
  },
  {
    "question": "How many inches tall is the Oscar statuette?",
    "answerRaw": "13.5",
    "answerNumeric": 13.5,
    "unit": "count"
  },
  {
    "question": "How many Smithsonian Institute museums are located in Washington, DC?",
    "answerRaw": "14",
    "answerNumeric": 14,
    "unit": "count"
  },
  {
    "question": "How many countries belonged to the United Nations when it was founded in 1945?",
    "answerRaw": "51",
    "answerNumeric": 51,
    "unit": "count"
  },
  {
    "question": "How many speaking roles were there in \"The Lord Of The Rings\" movie trilogy?",
    "answerRaw": "114",
    "answerNumeric": 114,
    "unit": "count"
  },
  {
    "question": "How old was Wolfgang Amadeus Mozart when he wrote his first opera?",
    "answerRaw": "12",
    "answerNumeric": 12,
    "unit": "count"
  },
  {
    "question": "How many pounds of milk does the average milk cow produce in one month?",
    "answerRaw": "2,100",
    "answerNumeric": 2100,
    "unit": "count"
  },
  {
    "question": "How many times greater was the budget for the 2004 animated film \"The Polar Express\" than the 1937 animated film Snow White And The 7 Dwarves?",
    "answerRaw": "110.7",
    "answerNumeric": 110.7,
    "unit": "ratio"
  },
  {
    "question": "How many pounds of potatoes does the average American eat per year?",
    "answerRaw": "140",
    "answerNumeric": 140,
    "unit": "count"
  },
  {
    "question": "How many Academy Awards did the movie pioneer Walt Disney win?",
    "answerRaw": "26",
    "answerNumeric": 26,
    "unit": "count"
  },
  {
    "question": "How many years passed between the launch of the Galileo space probe and its arrival at Jupiter?",
    "answerRaw": "6",
    "answerNumeric": 6,
    "unit": "count"
  },
  {
    "question": "How many letters are in the longest English word recognized by an Oxford dictionary?",
    "answerRaw": "45",
    "answerNumeric": 45,
    "unit": "count"
  },
  {
    "question": "How many TV Guide covers did Lucille Ball appear on during her lifetime?",
    "answerRaw": "26",
    "answerNumeric": 26,
    "unit": "count"
  },
  {
    "question": "How many prisoners were executed in the U.S. over the 5-year period from 2000 to 2004?",
    "answerRaw": "346",
    "answerNumeric": 346,
    "unit": "count"
  },
  {
    "question": "How many different colors of crayola crayons were available in January 2005?",
    "answerRaw": "120",
    "answerNumeric": 120,
    "unit": "count"
  },
  {
    "question": "How many children's books did Dr. Seuss write and illustrate during his 87-year life?",
    "answerRaw": "44",
    "answerNumeric": 44,
    "unit": "count"
  },
  {
    "question": "How many weeks did Michael Jackson's \"Thriller\" spend at #1 on the Billboard 200 album chart?",
    "answerRaw": "37",
    "answerNumeric": 37,
    "unit": "count"
  },
  {
    "question": "How many elevators are there in the Empire State Building?",
    "answerRaw": "73",
    "answerNumeric": 73,
    "unit": "count"
  },
  {
    "question": "How many times greater was the population of California in 2000 than in 1900?",
    "answerRaw": "22.81",
    "answerNumeric": 22.81,
    "unit": "ratio"
  },
  {
    "question": "How many liters of carbonated soft drinks did the average American drink in 2003?",
    "answerRaw": "195.8",
    "answerNumeric": 195.8,
    "unit": "count"
  },
  {
    "question": "How many accredited medical schools were there in the U.S. in January 2005?",
    "answerRaw": "125",
    "answerNumeric": 125,
    "unit": "count"
  },
  {
    "question": "How old was Anna Kournikova when she played her first professional tennis match?",
    "answerRaw": "15",
    "answerNumeric": 15,
    "unit": "count"
  },
  {
    "question": "How old was Princess Diana when she died in a 1997 car accident?",
    "answerRaw": "36",
    "answerNumeric": 36,
    "unit": "count"
  },
  {
    "question": "How many feet above sea level is the highest point on Mount Everest, the world's tallest mountain?",
    "answerRaw": "29,035",
    "answerNumeric": 29035,
    "unit": "count"
  },
  {
    "question": "How many days long was the 1993 federal siege on the compound of the Branch Davidian cult near Waco, Texas?",
    "answerRaw": "51",
    "answerNumeric": 51,
    "unit": "count"
  },
  {
    "question": "How many feed wide is an NFL football field?",
    "answerRaw": "160",
    "answerNumeric": 160,
    "unit": "count"
  },
  {
    "question": "How many pounds did Robert Deniro gain for his role as a boxer in the 1980 film \"Raging Bull\"?",
    "answerRaw": "60",
    "answerNumeric": 60,
    "unit": "count"
  },
  {
    "question": "How many years did it take to carve Mount Rushmore?",
    "answerRaw": "14",
    "answerNumeric": 14,
    "unit": "count"
  },
  {
    "question": "How many days passed between election night 2000 and Al Gore's final concession of the presidency to George W. Bush?",
    "answerRaw": "36",
    "answerNumeric": 36,
    "unit": "count"
  },
  {
    "question": "How many feet tall is The Statue of Liberty, including the pedestal?",
    "answerRaw": "305.08",
    "answerNumeric": 305.08,
    "unit": "count"
  },
  {
    "question": "How many feet tall are the letters in the Hollywood sign?",
    "answerRaw": "45",
    "answerNumeric": 45,
    "unit": "count"
  },
  {
    "question": "How many feet tall was the tallest giraffe ever recorded?",
    "answerRaw": "20",
    "answerNumeric": 20,
    "unit": "count"
  },
  {
    "question": "How old was Lee Harvey Oswald when he fatally shot president John F. Kennedy?",
    "answerRaw": "24",
    "answerNumeric": 24,
    "unit": "count"
  },
  {
    "question": "In dollars, what was the price of the first Ford Model T car that was introduced in 1908?",
    "answerRaw": "850",
    "answerNumeric": 850,
    "unit": "usd"
  },
  {
    "question": "In minutes, what is the longest that any astronaut has walked in space?",
    "answerRaw": "536",
    "answerNumeric": 536,
    "unit": "count"
  },
  {
    "question": "In what year was Pluto discovered?",
    "answerRaw": "1930",
    "answerNumeric": 1930,
    "unit": "count"
  },
  {
    "question": "In what year did an expedition first reach the South Pole?",
    "answerRaw": "1911",
    "answerNumeric": 1911,
    "unit": "count"
  },
  {
    "question": "In what year was \"Spacewar\", the first computer game, created?",
    "answerRaw": "1961",
    "answerNumeric": 1961,
    "unit": "count"
  },
  {
    "question": "In 2003, how many times did the average American use an ATM machine to withdraw cash?",
    "answerRaw": "29",
    "answerNumeric": 29,
    "unit": "count"
  },
  {
    "question": "In what year was the syrup for Coca-Cola first produced?",
    "answerRaw": "1886",
    "answerNumeric": 1886,
    "unit": "count"
  },
  {
    "question": "In what year was a vaccination first discovered for the deadly disease smallpox?",
    "answerRaw": "1796",
    "answerNumeric": 1796,
    "unit": "count"
  },
  {
    "question": "In what year did Michelangelo finish painting the ceiling of the Sistine Chapel?",
    "answerRaw": "1512",
    "answerNumeric": 1512,
    "unit": "count"
  },
  {
    "question": "In how many seasons did Babe Ruth lead major league baseball in home runs?",
    "answerRaw": "11",
    "answerNumeric": 11,
    "unit": "count"
  },
  {
    "question": "In what year did Walt Disney World open in Orlando, Florida?",
    "answerRaw": "1971",
    "answerNumeric": 1971,
    "unit": "count"
  },
  {
    "question": "In what year did the National Guard shoot 4 students at Kent State University for protesting the Vietnam War?",
    "answerRaw": "1970",
    "answerNumeric": 1970,
    "unit": "count"
  },
  {
    "question": "In what year did pilot Amelia Earhart take off from Miami on an around-the-world flight, never to be seen again?",
    "answerRaw": "1937",
    "answerNumeric": 1937,
    "unit": "count"
  },
  {
    "question": "In years, what was the longest recorded life span of a domestic dog?",
    "answerRaw": "20",
    "answerNumeric": 20,
    "unit": "count"
  },
  {
    "question": "In what year was the Eiffel Tower completed?",
    "answerRaw": "1889",
    "answerNumeric": 1889,
    "unit": "count"
  },
  {
    "question": "In what year did the first episode of the animated sitcom The Simpsons air?",
    "answerRaw": "1989",
    "answerNumeric": 1989,
    "unit": "count"
  },
  {
    "question": "In what year did the U.S. enter World War I?",
    "answerRaw": "1917",
    "answerNumeric": 1917,
    "unit": "count"
  },
  {
    "question": "In what year were women in the U.S. granted the right to vote?",
    "answerRaw": "1920",
    "answerNumeric": 1920,
    "unit": "count"
  },
  {
    "question": "In an average year, how many fires in the U.S. are caused by Christmas tree accidents?",
    "answerRaw": "300",
    "answerNumeric": 300,
    "unit": "count"
  },
  {
    "question": "In pounds, what was the weight of the largest gold nugget ever found?",
    "answerRaw": "156",
    "answerNumeric": 156,
    "unit": "count"
  },
  {
    "question": "In years, what is the average life span of a hippopotamus in captivity?",
    "answerRaw": "41",
    "answerNumeric": 41,
    "unit": "count"
  },
  {
    "question": "In degrees Fahrenheit, what was the lowest temperature ever recorded in the state of Hawaii?",
    "answerRaw": "12",
    "answerNumeric": 12,
    "unit": "count"
  },
  {
    "question": "In the 1933 film King Kong, how many feet tall was King Kong said to be?",
    "answerRaw": "50",
    "answerNumeric": 50,
    "unit": "count"
  },
  {
    "question": "In what year did astronomer Nicolas Copernicus publish his belief that the Earth revolves around the sun?",
    "answerRaw": "1543",
    "answerNumeric": 1543,
    "unit": "count"
  },
  {
    "question": "In what year did Congress pass most of president Franklin D. Roosevelt's New Deal measures during a 100-day special session?",
    "answerRaw": "1933",
    "answerNumeric": 1933,
    "unit": "count"
  },
  {
    "question": "In days, what is the longest that any astronaut has spent in space on a single mission?",
    "answerRaw": "437.75",
    "answerNumeric": 437.75,
    "unit": "count"
  },
  {
    "question": "In what year was the \"Chunnel\", the underwater rail tunnel connecting England and France, opened to the public?",
    "answerRaw": "1994",
    "answerNumeric": 1994,
    "unit": "count"
  },
  {
    "question": "In what year was an ATM machine first installed in the U.S?",
    "answerRaw": "1969",
    "answerNumeric": 1969,
    "unit": "count"
  },
  {
    "question": "In what year was a woman first elected to the U.S. House of Representatives?",
    "answerRaw": "1916",
    "answerNumeric": 1916,
    "unit": "count"
  },
  {
    "question": "In what year was the first Men's World Cup of Soccer played?",
    "answerRaw": "1930",
    "answerNumeric": 1930,
    "unit": "count"
  },
  {
    "question": "In what year did Michael Jackson first publicly perform his \"moonwalk\" dance?",
    "answerRaw": "1983",
    "answerNumeric": 1983,
    "unit": "count"
  },
  {
    "question": "In what year did the Britsh rename the city of New Amsterdam as New York?",
    "answerRaw": "1664",
    "answerNumeric": 1664,
    "unit": "count"
  },
  {
    "question": "In what year were the Voyager missions first launched to explore the planets beyond Mars?",
    "answerRaw": "1977",
    "answerNumeric": 1977,
    "unit": "count"
  },
  {
    "question": "In what year were girls first officially allowed to play on Little League baseball teams?",
    "answerRaw": "1974",
    "answerNumeric": 1974,
    "unit": "count"
  },
  {
    "question": "In what year were the first modern Summer Olympics held?",
    "answerRaw": "1896",
    "answerNumeric": 1896,
    "unit": "count"
  },
  {
    "question": "In what year was the film \"Casablanca\" first released?",
    "answerRaw": "1942",
    "answerNumeric": 1942,
    "unit": "count"
  },
  {
    "question": "In what year did Mother Teresa win the Nobel Peace Prize?",
    "answerRaw": "1979",
    "answerNumeric": 1979,
    "unit": "count"
  },
  {
    "question": "In what year did Affirmed become the last horse to win the Triple Crown of horse racing?",
    "answerRaw": "1978",
    "answerNumeric": 1978,
    "unit": "count"
  },
  {
    "question": "In what year did Adam Smith first publish \"The Wealth Of Nations\", his book on capitalist economics?",
    "answerRaw": "1776",
    "answerNumeric": 1776,
    "unit": "count"
  },
  {
    "question": "In what year did Isaac Newton first publish his theory of the laws of gravity?",
    "answerRaw": "1687",
    "answerNumeric": 1687,
    "unit": "count"
  },
  {
    "question": "In what year were the first Winter Olympics held?",
    "answerRaw": "1924",
    "answerNumeric": 1924,
    "unit": "count"
  },
  {
    "question": "In what year did a pilot first break the sound barrier?",
    "answerRaw": "1947",
    "answerNumeric": 1947,
    "unit": "count"
  },
  {
    "question": "In what year did a U.S. president first live in the White House?",
    "answerRaw": "1800",
    "answerNumeric": 1800,
    "unit": "count"
  },
  {
    "question": "In what year did Tonya Harding win the 2nd of her two U.S. Women's Figure Skating Championships, only to be stripped of the title?",
    "answerRaw": "1994",
    "answerNumeric": 1994,
    "unit": "count"
  },
  {
    "question": "In what year was the film \"Citizen Kane\" first released?",
    "answerRaw": "1941",
    "answerNumeric": 1941,
    "unit": "count"
  },
  {
    "question": "In what year was the Braille system invented, enabling the blind to read by touch?",
    "answerRaw": "1829",
    "answerNumeric": 1829,
    "unit": "count"
  },
  {
    "question": "In what year did the pilot episode of the TV sitcom \"Seinfeld\" air?",
    "answerRaw": "1989",
    "answerNumeric": 1989,
    "unit": "count"
  },
  {
    "question": "In what year was a sheep first cloned?",
    "answerRaw": "1997",
    "answerNumeric": 1997,
    "unit": "count"
  },
  {
    "question": "In what year did Christopher Columbus first reach South America?",
    "answerRaw": "1498",
    "answerNumeric": 1498,
    "unit": "count"
  },
  {
    "question": "In what year was the novel \"Frankenstein\" first published?",
    "answerRaw": "1818",
    "answerNumeric": 1818,
    "unit": "count"
  },
  {
    "question": "In dollar, what was the budget for the 1997 film \"Titanic\"?",
    "answerRaw": "200M",
    "answerNumeric": 200000000,
    "unit": "usd"
  },
  {
    "question": "In how many seasons did Michael Jordan lead the NBA in points scored per game?",
    "answerRaw": "10",
    "answerNumeric": 10,
    "unit": "count"
  },
  {
    "question": "In what year did U2 first release the hit album \"Achtung Baby\"?",
    "answerRaw": "1992",
    "answerNumeric": 1992,
    "unit": "count"
  },
  {
    "question": "In 2004, how many online purchases were made by the average 18 to 21-year-old in the U.S.?",
    "answerRaw": "15",
    "answerNumeric": 15,
    "unit": "count"
  },
  {
    "question": "In what year did the FBI begin its \"Ten Most Wanted Fugitives\" list?",
    "answerRaw": "1950",
    "answerNumeric": 1950,
    "unit": "count"
  },
  {
    "question": "In what year did Henry Ford found Ford Motor Company?",
    "answerRaw": "1903",
    "answerNumeric": 1903,
    "unit": "count"
  },
  {
    "question": "In how many of the world's 193 countries is English an official language?",
    "answerRaw": "57",
    "answerNumeric": 57,
    "unit": "count"
  },
  {
    "question": "In what year was the parking meter invented?",
    "answerRaw": "1935",
    "answerNumeric": 1935,
    "unit": "count"
  },
  {
    "question": "In what year was the first U.S. transcontinental railroad completed?",
    "answerRaw": "1869",
    "answerNumeric": 1869,
    "unit": "count"
  },
  {
    "question": "In the average bag of milk chocolate M&M's, what percentage are blue?",
    "answerRaw": "24%",
    "answerNumeric": 0.24,
    "unit": "percent"
  },
  {
    "question": "In dollars, how much was Margaret Mitchell paid for the rights to make her novel \"Gone with the Wind\" into a movie?",
    "answerRaw": "50,000",
    "answerNumeric": 50000,
    "unit": "usd"
  },
  {
    "question": "In dollars, what was the minimum hourly wage in the U.S. in 2000?",
    "answerRaw": "5.15",
    "answerNumeric": 5.15,
    "unit": "usd"
  },
  {
    "question": "In what year did the world's first female prime minister take office?",
    "answerRaw": "1960",
    "answerNumeric": 1960,
    "unit": "count"
  },
  {
    "question": "In miles per hour, how strong must winds be for a storm to qualify as a \"severe thunderstorm\"?",
    "answerRaw": "58",
    "answerNumeric": 58,
    "unit": "count"
  },
  {
    "question": "In what year did the Wright Brothers become the first people to successfully fly a manned airplane?",
    "answerRaw": "1903",
    "answerNumeric": 1903,
    "unit": "count"
  },
  {
    "question": "In dollars, what were Wal-Mart's worldwide sales on the day after Thanksgiving in 2001?",
    "answerRaw": "1.2B",
    "answerNumeric": 1200000000,
    "unit": "usd"
  },
  {
    "question": "In what year was the Heisman Trophy first awarded to the nations's most outstanding college football player?",
    "answerRaw": "1935",
    "answerNumeric": 1935,
    "unit": "count"
  },
  {
    "question": "In what year did Elvis Presley first release a music video for \"Jailhouse Rock\", the first music video made available to the public?",
    "answerRaw": "1957",
    "answerNumeric": 1957,
    "unit": "count"
  },
  {
    "question": "In miles per hour, how fast does sound travel at sea level?",
    "answerRaw": "761",
    "answerNumeric": 761,
    "unit": "count"
  },
  {
    "question": "In what year did Jackie Robinson become the first African-American to play Major League Baseball in the 20th century?",
    "answerRaw": "1947",
    "answerNumeric": 1947,
    "unit": "count"
  },
  {
    "question": "In what year was John Scopes found guilty and fined $100 for teaching evolution in a Tennessee high school?",
    "answerRaw": "1925",
    "answerNumeric": 1925,
    "unit": "count"
  },
  {
    "question": "In what year was the film \"The Wizard of Oz\" first released?",
    "answerRaw": "1939",
    "answerNumeric": 1939,
    "unit": "count"
  },
  {
    "question": "In miles per hour, what was the average speed of the winner of the first Indianapolis 500 car race in 1911?",
    "answerRaw": "74.6",
    "answerNumeric": 74.6,
    "unit": "count"
  },
  {
    "question": "Over the 5-year period from 1998 to 2002, how many pints of ice cream did the average American eat per year?",
    "answerRaw": "31.45",
    "answerNumeric": 31.45,
    "unit": "count"
  },
  {
    "question": "Over the 5-year period from 2000 to 2004, what was the average number of movie theater screens in the U.S.?",
    "answerRaw": "35,987",
    "answerNumeric": 35987,
    "unit": "count"
  },
  {
    "question": "Of the 435 seats in the U.S. House of Representatives, how many were held by Republicans in February 2005?",
    "answerRaw": "231",
    "answerNumeric": 231,
    "unit": "count"
  },
  {
    "question": "Of all accidental U.S. deaths over the 5-year period between 1999 and 2003, what percent were due to motor vehicle accidents?",
    "answerRaw": "53.08%",
    "answerNumeric": 0.5308,
    "unit": "percent"
  },
  {
    "question": "Of the 10,500 athletes who competed in 2004 Summer Olympics, how many were expelled for drug violations before the closing ceremony?",
    "answerRaw": "24",
    "answerNumeric": 24,
    "unit": "count"
  },
  {
    "question": "On average, how many pounds does an African Elephant weigh?",
    "answerRaw": "9,988",
    "answerNumeric": 9988,
    "unit": "count"
  },
  {
    "question": "Stonehenge once consisted of over 60 stones. As of january 2005, how many of the remaining stones stand upright?",
    "answerRaw": "17",
    "answerNumeric": 17,
    "unit": "count"
  },
  {
    "question": "What percent of the applicants to the undergraduate program at Harvard University for the fall of 2005 were accepted?",
    "answerRaw": "9.1%",
    "answerNumeric": 0.091,
    "unit": "percent"
  },
  {
    "question": "What was the highest number of seats in any National Football League stadium during the 2004-2005 season?",
    "answerRaw": "80,116",
    "answerNumeric": 80116,
    "unit": "count"
  },
  {
    "question": "What percent of the Earth's water area does the Atlantic Ocean make up?",
    "answerRaw": "21.26%",
    "answerNumeric": 0.2126,
    "unit": "percent"
  },
  {
    "question": "What percent of U.S. federal government spending was allocated to the Department of Education over the 3-year period 2002 to 2004?",
    "answerRaw": "2%",
    "answerNumeric": 0.02,
    "unit": "percent"
  },
  {
    "question": "What is the average number of turkeys eaten in the U.S. at Thanksgiving each year?",
    "answerRaw": "45M",
    "answerNumeric": 45000000,
    "unit": "count"
  },
  {
    "question": "What percent of U.S. exports went to Canada over the 5-year period from 1999 to 2003?",
    "answerRaw": "23.17%",
    "answerNumeric": 0.2317,
    "unit": "percent"
  },
  {
    "question": "What is the average age of U.S. combat soldiers during the Vietnam war?",
    "answerRaw": "19",
    "answerNumeric": 19,
    "unit": "count"
  },
  {
    "question": "What percent of U.S. video sales in 2002 were in DVD format, as opposed to VHS format?",
    "answerRaw": "71.9%",
    "answerNumeric": 0.719,
    "unit": "percent"
  },
  {
    "question": "What percent of new small businesses in the U.S. fold within 3 years?",
    "answerRaw": "50%",
    "answerNumeric": 0.5,
    "unit": "percent"
  },
  {
    "question": "What percent of the world's total land area does the U.S. constitute?",
    "answerRaw": "6.9%",
    "answerNumeric": 0.069,
    "unit": "percent"
  }
];

const seenImportedIds = new Map<string, number>();

export const otherPrompts: Prompt[] = OTHER_PROMPT_SEEDS.map((seed) => {
  const promptText = cleanImportedPromptText(seed.question);
  const answerNumeric = normalizeImportedNumeric(seed);
  const metadata = inferPromptMetadata(promptText, seed.unit);
  const basePrompt = {
    id: buildImportedPromptId(promptText, seenImportedIds),
    pack: "other" as const,
    category: metadata.category,
    promptText,
    answerNumeric,
    answerYear: inferAnswerYear(promptText, answerNumeric, metadata),
    sourceLabel: "Internet :)",
  };

  if (seed.unit === "usd") {
    return defineUsdPrompt(basePrompt);
  }

  if (seed.unit === "percent") {
    return definePercentPrompt(basePrompt);
  }

  return definePrompt({
    ...basePrompt,
    unitLabel: metadata.unitLabel,
    unitShort: metadata.unitShort,
  });
});

export const OTHER_PROMPTS = otherPrompts;
