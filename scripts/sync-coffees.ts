// scripts/sync-coffees.ts
// Fetches all coffee bags from Provenance and writes:
//   src/cache/coffees/index.json       — lightweight list for the Coffee List page
//   src/cache/coffees/coffee-[id].json — full bag object for detail pages

import { mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { z } from 'zod'
import { CoffeeBagSchema } from '../src/types/coffee'

const API_URL = 'https://api.rodrigoibarra.rocks/public/'
const OUT_DIR = 'src/cache/coffees'

// Fields kept in the index — enough to render the list page without loading every file
const CoffeeBagIndexEntrySchema = CoffeeBagSchema.pick({
  id: true,
  roaster: true,
  origin: true,
  variety: true,
  process: true,
  status: true,
  createdAt: true,
})

export type CoffeeBagIndexEntry = z.infer<typeof CoffeeBagIndexEntrySchema>

async function syncCoffees() {
  console.log('Fetching coffees from Provenance...')

  const res = await fetch(API_URL)
  if (!res.ok)
    throw new Error(`Provenance API error: ${res.status} ${res.statusText}`)

  const raw = await res.json()
  const coffees = z.array(CoffeeBagSchema).parse(raw)

  mkdirSync(OUT_DIR, { recursive: true })

  // Write index (lightweight — only what the list page needs)
  const index = coffees.map(c => CoffeeBagIndexEntrySchema.parse(c))
  writeFileSync(`${OUT_DIR}/index.json`, JSON.stringify(index, null, 2))
  console.log(`✓ Wrote index with ${index.length} entries`)

  // Write individual files (full bag data for detail pages)
  for (const coffee of coffees) {
    writeFileSync(
      `${OUT_DIR}/coffee-${coffee.id}.json`,
      JSON.stringify(coffee, null, 2),
    )
  }
  console.log(`✓ Wrote ${coffees.length} individual coffee files`)
}

syncCoffees().catch((err) => {
  console.error('sync-coffees failed:', err)
  process.exit(1)
})
