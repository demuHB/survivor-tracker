// Reads the "List of Fan Favorite Award Winners" table from the Survivor Wiki and writes
// scripts/fan-favorites.json ({ [season]: { winner, runnersUp[], prize } } with full names).
// Run `npm run data` afterwards to merge it into public/data.
import fs from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const OUT = path.join(ROOT, 'scripts', 'fan-favorites.json')

const url = 'https://survivor.fandom.com/api.php?' + new URLSearchParams({
  action: 'parse', format: 'json', formatversion: '2', prop: 'wikitext', page: 'Fan Favorite Award',
})
const res = await fetch(url, { headers: { 'User-Agent': 'SurvivorDashboard/1.0 (personal use)' } })
const wikitext = (await res.json()).parse.wikitext

const table = wikitext.slice(wikitext.indexOf('List of Fan Favorite Award Winners'))
const body = table.slice(0, table.indexOf('\n|}'))

/** [[Rupert Boneham|Rupert Boneham]] / [[Ozzy Lusth]] -> page names, ignoring [[File:…]] images */
const people = cell => [...cell.matchAll(/\[\[(?!File:)([^\]|]+)(?:\|[^\]]*)?\]\]/g)].map(m => m[1].trim())
  .filter(n => !/America's Tribal Council/i.test(n))
const clean = s => s.replace(/rowspan="\d+"\s*\|/, '').replace(/''/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, '-').trim()

const result = {}
let lastPrize = null
for (const row of body.split('\n|-').slice(1)) {
  // a row is "| season\n| winner\n| opponents\n| prize" (prize may be shared via rowspan)
  const cells = row.split('\n|').map(c => c.trim()).filter(Boolean)
  const season = Number(cells[0]?.match(/\{\{S2?\|(\d+)\}\}/)?.[1])
  if (!season) continue
  const winner = people(cells[1] ?? '')[0]
  if (!winner) continue
  const prize = cells[3] ? clean(cells[3]) : lastPrize
  lastPrize = prize
  result[season] = { winner, runnersUp: people(cells[2] ?? ''), prize }
}

await fs.writeFile(OUT, JSON.stringify(result, null, 1))
console.log('fan favorites:', Object.entries(result).map(([s, f]) => `S${s} ${f.winner}`).join(', '))
