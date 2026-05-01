/**
 * Minimal ZIP builder used by the Apple Wallet `.pkpass` generator.
 *
 * Apple Wallet accepts uncompressed (STORE-method) zips, so we hand-roll
 * the local-file-header + central-directory layout and avoid pulling in a
 * heavyweight zip dependency. The implementation follows the PKZIP APPNOTE
 * 4.5 spec (no zip64, since `.pkpass` files are far below 4GB).
 *
 * @module
 */

import { createHash } from 'node:crypto'

/**
 * One file to embed in the zip.
 */
export interface ZipFileEntry {
  /** Path inside the archive (no leading slash). */
  name: string
  /** Raw bytes to store. */
  data: Buffer
}

const SIG_LOCAL_FILE = 0x04034b50
const SIG_CENTRAL_DIR = 0x02014b50
const SIG_END_OF_CENTRAL_DIR = 0x06054b50
const COMPRESSION_STORE = 0
const VERSION_NEEDED = 20
const VERSION_MADE_BY = 0x031e // unix, zip 3.0

/**
 * Build a STORE-method zip Buffer from a list of in-memory file entries.
 *
 * @param entries - Files to embed.
 * @returns The complete zip bytes.
 */
export function buildZipBuffer(entries: ZipFileEntry[]): Buffer {
  const localChunks: Buffer[] = []
  const centralChunks: Buffer[] = []
  let offset = 0

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8')
    const crc = crc32(entry.data)
    const size = entry.data.byteLength

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(SIG_LOCAL_FILE, 0)
    localHeader.writeUInt16LE(VERSION_NEEDED, 4)
    localHeader.writeUInt16LE(0, 6) // general purpose flags
    localHeader.writeUInt16LE(COMPRESSION_STORE, 8)
    localHeader.writeUInt16LE(0, 10) // last-mod time
    localHeader.writeUInt16LE(0, 12) // last-mod date
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(size, 18)
    localHeader.writeUInt32LE(size, 22)
    localHeader.writeUInt16LE(nameBuf.byteLength, 26)
    localHeader.writeUInt16LE(0, 28) // extra-field length

    localChunks.push(localHeader, nameBuf, entry.data)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(SIG_CENTRAL_DIR, 0)
    centralHeader.writeUInt16LE(VERSION_MADE_BY, 4)
    centralHeader.writeUInt16LE(VERSION_NEEDED, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(COMPRESSION_STORE, 10)
    centralHeader.writeUInt16LE(0, 12)
    centralHeader.writeUInt16LE(0, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(size, 20)
    centralHeader.writeUInt32LE(size, 24)
    centralHeader.writeUInt16LE(nameBuf.byteLength, 28)
    centralHeader.writeUInt16LE(0, 30) // extra-field length
    centralHeader.writeUInt16LE(0, 32) // comment length
    centralHeader.writeUInt16LE(0, 34) // disk number
    centralHeader.writeUInt16LE(0, 36) // internal attrs
    centralHeader.writeUInt32LE(0, 38) // external attrs
    centralHeader.writeUInt32LE(offset, 42)

    centralChunks.push(centralHeader, nameBuf)

    offset += localHeader.byteLength + nameBuf.byteLength + size
  }

  const centralDir = Buffer.concat(centralChunks)
  const localData = Buffer.concat(localChunks)

  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(SIG_END_OF_CENTRAL_DIR, 0)
  eocd.writeUInt16LE(0, 4) // disk number
  eocd.writeUInt16LE(0, 6) // disk where central dir starts
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralDir.byteLength, 12)
  eocd.writeUInt32LE(localData.byteLength, 16)
  eocd.writeUInt16LE(0, 20) // zip-comment length

  return Buffer.concat([localData, centralDir, eocd])
}

/**
 * Compute a CRC-32/IEEE checksum (the variant zip uses).
 *
 * Pure-JS implementation — small enough that pulling in a dependency for
 * this one function would be silly.
 *
 * @param data - Bytes to checksum.
 * @returns 32-bit unsigned CRC.
 */
export function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]!) & 0xff]!
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Pre-computed lookup table for the IEEE polynomial used by zip CRC-32.
 */
const CRC_TABLE: number[] = (() => {
  const table = new Array<number>(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

/**
 * Compute the SHA-1 hash of arbitrary bytes — re-exported helper used by
 * tests that need to verify manifest hashes.
 *
 * @param data - Bytes to hash.
 * @returns Lowercase 40-char hex digest.
 */
export function sha1Hex(data: Buffer): string {
  return createHash('sha1').update(data).digest('hex')
}
