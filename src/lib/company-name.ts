import { foldTitle } from "@/lib/title-groups";

// Legal-form and filler words that people write inconsistently ("Akbank", "Akbank T.A.Ş.").
const FILLER = new Set(["as", "a", "s", "t", "ltd", "sti", "sirketi", "limited", "anonim", "san", "tic", "sanayi", "ticaret", "ve", "inc", "llc", "corp"]);

// Case-, accent- and punctuation-insensitive key used to spot a company that already exists under a slightly different spelling.
export function normalizeCompanyName(name: string) {
  const tokens = foldTitle(name)
    .replace(/[.,'"’`()\-_/&]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const kept = tokens.filter((token) => !FILLER.has(token));
  return (kept.length > 0 ? kept : tokens).join(" ");
}
