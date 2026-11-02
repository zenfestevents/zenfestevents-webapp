// Client-safe. Character, film and brand names must not appear on the public decoration pages
// (owner, 2026-11-02): they are registered trademarks with copyrighted artwork, and their owners
// send takedown and legal notices. The website says "Superhero", never the character's name.
// This is a safety net for the words the team types, not a full list: add names here as they
// come up. Photos are the team's job: use setups with no character artwork or logos.

const BLOCKED = [
  'spider-man',
  'spiderman',
  'spider man',
  'cocomelon',
  'frozen',
  'barbie',
  'peppa',
  'mickey',
  'minnie',
  'doraemon',
  'chhota bheem',
  'chota bheem',
  'hello kitty',
  'batman',
  'superman',
  'avengers',
  'hulk',
  'iron man',
  'captain america',
  'thor',
  'paw patrol',
  'disney',
  'marvel',
  'pixar',
  'pokemon',
  'pokémon',
  'mario',
  'minecraft',
  'baby shark',
  'ben 10',
  'ben10',
  'tom and jerry',
  'bluey',
  'barney',
  'shinchan',
  'shin chan',
  'motu patlu',
  'oggy',
  'blippi',
  'lego',
  'hot wheels',
  'transformers',
  'minions',
  'moana',
  'elsa',
  'my little pony',
  'harry potter',
  'star wars',
  'lion king',
  'jungle book',
  'masha and the bear',
  'ipl',
  'bcci',
] as const

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const PATTERN = new RegExp(`(?<![\\p{L}\\p{N}])(${BLOCKED.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'iu')

/** The first blocked character / brand name found in `text`, or null. */
export function brandTermIn(text: unknown): string | null {
  return typeof text === 'string' ? (text.match(PATTERN)?.[1] ?? null) : null
}

/** A Payload field `validate` that refuses a blocked name, with a message the team can act on. */
export const noBrandNames = (value: unknown): true | string => {
  const hit = brandTermIn(value)
  return hit
    ? `“${hit}” is a brand or character name. Please use a generic name instead (for example “Superhero theme”): those names are protected and can bring legal notices.`
    : true
}
