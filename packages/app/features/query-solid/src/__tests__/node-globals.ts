/**
 * Gives the jsdom test environment a `TextEncoder`/`TextDecoder` pair whose
 * output is a real `Uint8Array` of THIS realm, before anything loads esbuild
 * (its invariant check is `new TextEncoder().encode("") instanceof
 * Uint8Array`). Node's own `util` pair runs in Node's internal realm, so both
 * the environment's installed globals and a `node:util` patch fail the check;
 * the wrappers below copy the bytes into a same-realm array. Import this
 * module FIRST, before vite or esbuild.
 *
 * @module
 */
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from 'node:util'

const nodeEncoder = new NodeTextEncoder()
const nodeDecoder = new NodeTextDecoder()

/** A same-realm `TextEncoder` over Node's. */
class RealmTextEncoder {
  /**
   * Encodes a string into a same-realm `Uint8Array`.
   *
   * @param input - The string (defaults to empty).
   * @returns The UTF-8 bytes.
   */
  encode(input = ''): Uint8Array {
    const encoded = nodeEncoder.encode(input)
    const out = new Uint8Array(encoded.length)
    out.set(encoded)
    return out
  }

  /**
   * Encodes into a caller's buffer.
   *
   * @param source - The string.
   * @param buffer - The destination buffer.
   * @returns How much was read and written.
   */
  encodeInto(source: string, buffer: Uint8Array): { read: number; written: number } {
    return nodeEncoder.encodeInto(source, buffer)
  }
}

/** A same-realm `TextDecoder` over Node's. */
class RealmTextDecoder {
  /** The decoder's encoding label. */
  readonly encoding: string

  /**
   * Builds a decoder.
   *
   * @param label - The encoding label (defaults to utf-8).
   */
  constructor(label?: string) {
    this.encoding = label ?? 'utf-8'
  }

  /**
   * Decodes bytes to a string.
   *
   * @param input - The bytes (defaults to empty).
   * @returns The decoded text.
   */
  decode(input?: ArrayBuffer | ArrayBufferView): string {
    return nodeDecoder.decode(input ?? new Uint8Array())
  }
}

Object.assign(globalThis, { TextEncoder: RealmTextEncoder, TextDecoder: RealmTextDecoder })
