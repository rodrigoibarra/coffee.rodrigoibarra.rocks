import type { Shot, ShotIndexEntry } from '../src/types/shots'
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'

const R2_ENDPOINT_URL = process.env.R2_ENDPOINT_URL
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_PREFIX = (process.env.R2_PREFIX ?? 'metshots/').replace(/\/?$/, '/')

const CACHE_LIMIT = 50
const CACHE_DIR = path.resolve('src/cache/shots')

function s3Client() {
  if (!R2_ENDPOINT_URL || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('Missing R2 env vars — check .env.local')
  }
  return new S3Client({
    endpoint: R2_ENDPOINT_URL,
    region: 'auto',
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
}

async function getObjectJson<T>(s3: S3Client, key: string): Promise<T> {
  const res = await s3.send(
    new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: `${R2_PREFIX}${key}` }),
  )
  const body = await res.Body!.transformToString()
  return JSON.parse(body) as T
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await import('node:fs/promises').then(fs => fs.access(p))
    return true
  }
  catch {
    return false
  }
}

async function syncShots() {
  const s3 = s3Client()
  await mkdir(CACHE_DIR, { recursive: true })

  console.log('Fetching shots-index.json from R2...')
  const fullIndex = await getObjectJson<ShotIndexEntry[]>(s3, 'shots-index.json')
  const trimmed = fullIndex.slice(0, CACHE_LIMIT) // already sorted newest-first
  const keepIds = new Set(trimmed.map(s => s.id))

  console.log(`Keeping the latest ${trimmed.length} of ${fullIndex.length} shots.`)

  let downloaded = 0
  for (const entry of trimmed) {
    const shotPath = path.join(CACHE_DIR, `shot-${entry.id}.json`)
    if (await fileExists(shotPath))
      continue

    const shot = await getObjectJson<Shot>(s3, `shot-${entry.id}.json`)
    await writeFile(shotPath, JSON.stringify(shot))
    downloaded++
    console.log(`  downloaded shot-${entry.id}.json`)
  }

  const existing = await readdir(CACHE_DIR)
  let pruned = 0
  for (const file of existing) {
    if (!file.startsWith('shot-') || !file.endsWith('.json'))
      continue
    const id = file.slice('shot-'.length, -'.json'.length)
    if (!keepIds.has(id)) {
      await unlink(path.join(CACHE_DIR, file))
      pruned++
    }
  }

  await writeFile(path.join(CACHE_DIR, 'index.json'), JSON.stringify(trimmed))

  console.log(`Done. Downloaded ${downloaded}, pruned ${pruned}, cache holds ${trimmed.length} shots.`)
}

syncShots().catch((err) => {
  console.error(err)
  process.exit(1)
})
