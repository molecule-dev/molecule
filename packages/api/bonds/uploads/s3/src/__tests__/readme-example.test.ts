/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the AWS SDK (the network) is
 * mocked — with an in-test object store.
 *
 * @module
 */
import { Readable } from 'node:stream'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getProvider, setProvider } from '@molecule/api-uploads'

const { objects, sentCommands } = vi.hoisted(() => ({
  objects: new Map<string, { body: string; contentType: string; disposition: string }>(),
  sentCommands: [] as { type: string; Bucket: string; Key: string }[],
}))

vi.mock('@aws-sdk/client-s3', () => {
  class Command {
    constructor(
      readonly type: string,
      readonly input: { Bucket: string; Key: string },
    ) {}
  }
  return {
    S3Client: vi.fn(function () {
      return {
        send: async (command: Command) => {
          sentCommands.push({ type: command.type, ...command.input })
          if (command.type === 'GetObjectCommand') {
            const object = objects.get(command.input.Key)
            if (!object) throw Object.assign(new Error('missing'), { name: 'NoSuchKey' })
            return { Body: Readable.from([Buffer.from(object.body)]) }
          }
          objects.delete(command.input.Key)
          return {}
        },
      }
    }),
    GetObjectCommand: vi.fn(function (input: { Bucket: string; Key: string }) {
      return new Command('GetObjectCommand', input)
    }),
    DeleteObjectCommand: vi.fn(function (input: { Bucket: string; Key: string }) {
      return new Command('DeleteObjectCommand', input)
    }),
  }
})

vi.mock('@aws-sdk/lib-storage', () => ({
  Upload: vi.fn(function ({
    params,
  }: {
    params: {
      Bucket: string
      Key: string
      Body: NodeJS.ReadableStream
      ContentType: string
      ContentDisposition: string
    }
  }) {
    return {
      done: async () => {
        let body = ''
        for await (const chunk of params.Body) body += String(chunk)
        objects.set(params.Key, {
          body,
          contentType: params.ContentType,
          disposition: params.ContentDisposition,
        })
        return { Location: `https://${params.Bucket}.s3.amazonaws.com/${params.Key}` }
      },
      abort: async () => {},
    }
  }),
}))

import { provider as s3Uploads } from '../index.js'

describe('README @example', () => {
  beforeEach(() => {
    vi.stubEnv('AWS_ACCESS_KEY_ID', 'test-access-key')
    vi.stubEnv('AWS_SECRET_ACCESS_KEY', 'test-secret-key')
    vi.stubEnv('AWS_S3_BUCKET', 'acme-uploads')
    vi.stubEnv('AWS_S3_REGION', 'us-east-1')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('streams to the bucket under file.id, reads it back, and deletes it', async () => {
    setProvider(s3Uploads)

    const uploads = getProvider()
    const source = Readable.from([Buffer.from('Hello, uploads!')])
    const errors: Error[] = []
    const file = uploads.upload(
      'document',
      source,
      { filename: 'hello.txt', encoding: '7bit', mimeType: 'text/plain' },
      (error) => errors.push(error),
    )
    await file.uploadPromise

    expect(errors).toEqual([])
    expect(file.uploaded).toBe(true)
    expect(file.location).toBe(`https://acme-uploads.s3.amazonaws.com/${file.id}`)
    expect(objects.get(file.id)).toEqual({
      body: 'Hello, uploads!',
      contentType: 'text/plain',
      disposition: 'attachment',
    })

    const stored = await uploads.getFile?.(file.id)
    let text = ''
    for await (const chunk of stored ?? []) text += String(chunk)
    expect(text).toBe('Hello, uploads!')

    await uploads.deleteFile(file.id)
    expect(sentCommands).toEqual([
      { type: 'GetObjectCommand', Bucket: 'acme-uploads', Key: file.id },
      { type: 'DeleteObjectCommand', Bucket: 'acme-uploads', Key: file.id },
    ])
    expect(await uploads.getFile?.(file.id)).toBeNull()
  })
})
