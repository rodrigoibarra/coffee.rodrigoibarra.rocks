import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
// scripts/sync-shots.ts
// Downloads shot cache from Cloudflare R2 and writes to src/cache/shots/
//   src/cache/shots/shots-index.json   — lightweight index for the Brew Log page
//   src/cache/shots/shot-{uuid}.json   — full time-series per shot for detail pages
//
// Strategy:
//   1. Always re-download shots-index.json (tiny, source of truth)
//   2. Parse index to get all UUIDs
//   3. Only download shot files that don't already exist locally
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BUCKET = process.env.R2_BUCKET_NAME ?? 'ghost-media'
const PREFIX = 'metshots/'
const OUT_DIR = 'src/cache/shots'

const client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT_URL,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of stream as AsyncIterable<Buffer>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks).toString('utf-8')
}

async function downloadFile(key: string): Promise<string> {
  const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  if (!res.Body)
    throw new Error(`Empty response for key: ${key}`)
  return streamToString(res.Body as NodeJS.ReadableStream)
}

async function syncShots() {
  mkdirSync(OUT_DIR, { recursive: true })

  // Always re-download the index — it's tiny and is the source of truth
  console.log('Downloading shots-index.json...')
  const indexJson = await downloadFile(`${PREFIX}shots-index.json`)
  writeFileSync(`${OUT_DIR}/shots-index.json`, indexJson)

  const index: { id: string }[] = JSON.parse(indexJson)
  console.log(`✓ Index written — ${index.length} shots total`)

  // Only download shot files we don't already have
  const missing = index.filter(s => !existsSync(`${OUT_DIR}/shot-${s.id}.json`))
  console.log(`${missing.length} new shots to download`)

  if (missing.length === 0) {
    console.log('✓ Cache is up to date')
    return
  }

  let downloaded = 0
  for (const shot of missing) {
    const content = await downloadFile(`${PREFIX}shot-${shot.id}.json`)
    writeFileSync(`${OUT_DIR}/shot-${shot.id}.json`, content)
    downloaded++
    if (downloaded % 25 === 0)
      console.log(`  ${downloaded}/${missing.length}...`)
  }

  console.log(`✓ Downloaded ${downloaded} new shot files`)
}

syncShots().catch((err) => {
  console.error('sync-shots failed:', err)
  process.exit(1)
})
