/**
 * Test-only zip reader. Parses the STORE-method zips produced by
 * {@link buildZipBuffer} so tests can verify file-by-file contents and
 * recompute manifest hashes against what's actually inside the archive.
 *
 * @module
 */

import { crc32 } from '../zip.js'

const SIG_LOCAL_FILE = 0x04034b50
const SIG_END_OF_CENTRAL_DIR = 0x06054b50

/**
 * Decompose a zip buffer back into `{ name, data }` entries.
 *
 * @param buf - Zip bytes.
 * @returns File entries in the original order.
 */
export function readZipBuffer(buf: Buffer): Array<{ name: string; data: Buffer }> {
  // Locate end-of-central-directory record (last 22+ bytes, possibly with
  // trailing comment — we don't write comments so it's exactly 22).
  let eocdOffset = -1
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === SIG_END_OF_CENTRAL_DIR) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset < 0) throw new Error('EOCD not found')

  // Walk local file headers from offset 0 until we hit the central directory.
  const entries: Array<{ name: string; data: Buffer }> = []
  let pos = 0
  while (pos < buf.length) {
    const sig = buf.readUInt32LE(pos)
    if (sig !== SIG_LOCAL_FILE) break
    const compressedSize = buf.readUInt32LE(pos + 18)
    const uncompressedSize = buf.readUInt32LE(pos + 22)
    if (compressedSize !== uncompressedSize) {
      throw new Error('Reader only supports STORE-method zips')
    }
    const nameLen = buf.readUInt16LE(pos + 26)
    const extraLen = buf.readUInt16LE(pos + 28)
    const name = buf.slice(pos + 30, pos + 30 + nameLen).toString('utf8')
    const dataStart = pos + 30 + nameLen + extraLen
    const data = buf.slice(dataStart, dataStart + compressedSize)
    const expectedCrc = buf.readUInt32LE(pos + 14)
    if (crc32(data) !== expectedCrc) {
      throw new Error(`CRC mismatch on entry ${name}`)
    }
    entries.push({ name, data: Buffer.from(data) })
    pos = dataStart + compressedSize
  }
  return entries
}
