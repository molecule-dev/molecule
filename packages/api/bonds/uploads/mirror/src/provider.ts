/**
 * Mirrored upload provider: one `UploadProvider` that writes every file to
 * several upload providers and reads it back from whichever has it.
 *
 * @module
 */

import { PassThrough } from 'node:stream'

import { trackBondFailure } from '@molecule/api-analytics'
import type { FileInfo, UploadedFile, UploadProvider } from '@molecule/api-uploads'
import { UploadAbortedError } from '@molecule/api-uploads'

import { decodeMirrorId, encodeMirrorId, MIRROR_TARGET_NAME_PATTERN } from './id.js'
import type {
  HeadFileHandler,
  MirrorCopy,
  MirrorCopyLocation,
  MirrorOperation,
  MirrorTarget,
  MirrorUploadProvider,
  MirrorUploadsConfig,
} from './types.js'

const BOND = 'uploads-mirror'

interface ResolvedTarget {
  name: string
  provider: UploadProvider
  required: boolean
}

/**
 * Normalizes any thrown/reported value to an `Error` (for `onError`, which takes one).
 *
 * @param value - The thrown value.
 * @returns An `Error`.
 */
const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(String(value))

/**
 * Validates the config and fills defaults.
 *
 * @param config - The mirror config.
 * @returns The targets with `required` resolved.
 */
const resolveTargets = (config: MirrorUploadsConfig): ResolvedTarget[] => {
  if (!config || !Array.isArray(config.targets) || config.targets.length === 0) {
    throw new Error('uploads-mirror: `targets` must list at least one upload provider')
  }
  const seen = new Set<string>()
  return config.targets.map((target: MirrorTarget) => {
    if (typeof target?.name !== 'string' || !MIRROR_TARGET_NAME_PATTERN.test(target.name)) {
      throw new Error(
        `uploads-mirror: target name ${JSON.stringify(target?.name)} must match [A-Za-z0-9_-]{1,32}`,
      )
    }
    if (seen.has(target.name)) {
      throw new Error(`uploads-mirror: duplicate target name "${target.name}"`)
    }
    seen.add(target.name)
    if (!target.provider || typeof target.provider.upload !== 'function') {
      throw new Error(`uploads-mirror: target "${target.name}" has no upload provider`)
    }
    return { name: target.name, provider: target.provider, required: target.required !== false }
  })
}

/**
 * Creates a mirrored upload provider.
 *
 * @param config - The targets and an optional failure callback.
 * @returns The provider.
 */
export const createProvider = (config: MirrorUploadsConfig): MirrorUploadProvider => {
  const targets = resolveTargets(config)
  const byName = new Map(targets.map((target) => [target.name, target]))

  // Per-target file objects of uploads still in flight, keyed by mirror id, so
  // abortUpload can hand each target the exact object it returned (bonds keep
  // their abort handle on it).
  const inFlight = new Map<string, { copies: MirrorCopy[]; files: UploadedFile[] }>()
  // By the returned file too: two uploads whose targets answered empty ids
  // would otherwise share one in-flight key (R93-B10).
  const inFlightByFile = new WeakMap<
    UploadedFile,
    { copies: MirrorCopy[]; files: UploadedFile[] }
  >()
  const aborted = new Set<string>()

  const report = (target: string, operation: MirrorOperation, error: unknown): void => {
    trackBondFailure({ bond: BOND, operation, error })
    if (!config.onTargetFailure) return
    try {
      config.onTargetFailure({ target, operation, error })
    } catch (_error) {
      // Intentional noop — a throwing failure callback must not change the
      // outcome of the operation it reports on.
    }
  }

  const unknownTarget = (name: string): Error =>
    new Error(`uploads-mirror: the id names target "${name}", which is not configured`)

  /** Copies of `id` in CONFIG order; for a raw id, one entry per target. */
  const copiesInConfigOrder = (id: string): MirrorCopy[] => {
    const copies = decodeMirrorId(id)
    if (!copies) return targets.map((target) => ({ target: target.name, id }))
    const order = new Map(targets.map((target, index) => [target.name, index]))
    return [...copies].sort(
      (a, b) =>
        (order.get(a.target) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(b.target) ?? Number.MAX_SAFE_INTEGER),
    )
  }

  const upload = (
    fieldname: string,
    stream: NodeJS.ReadableStream,
    info: FileInfo,
    onError: (error: Error) => void,
  ): UploadedFile => {
    // One branch per target. `pipe` pauses the source whenever ANY branch's
    // buffer is full, so the slowest target sets the pace and nothing buffers
    // the whole file.
    const branches = targets.map(() => new PassThrough())
    for (const branch of branches) stream.pipe(branch)
    for (const branch of branches) {
      // failAll destroys a branch WITH an error, which emits `error` on it. A target that does not
      // listen for it turned that into an uncaught exception that ends the process. Each target's
      // failure is delivered through failTarget and onError, so the event has nothing left to say.
      branch.on('error', (_error: Error) => {})
    }

    const targetFiles: UploadedFile[] = []
    const settled: Array<Promise<void>> = []
    // One per target: fails that target's copy from the SOURCE side (a source
    // error, a size limit, a close before the end) — a target that only
    // watches its own writes would otherwise never settle (R93-B2/B6).
    const failTarget: Array<(error: Error) => void> = []

    targets.forEach((target, index) => {
      const branch = branches[index]
      let reported: Error | undefined
      let rejectReported: ((error: Error) => void) | undefined
      failTarget.push((error: Error) => {
        reported ??= error
        rejectReported?.(error)
      })
      let targetFile: UploadedFile
      try {
        targetFile = target.provider.upload(fieldname, branch, info, (error) => {
          reported ??= error
          rejectReported?.(error)
        })
      } catch (error) {
        targetFile = {
          id: '',
          fieldname,
          filename: info.filename,
          encoding: info.encoding,
          mimetype: info.mimeType,
          size: 0,
          uploaded: false,
        }
        reported = toError(error)
      }
      targetFiles.push(targetFile)

      const done = new Promise<void>((resolve, reject) => {
        rejectReported = reject
        if (reported) {
          reject(reported)
          return
        }
        if (targetFile.uploadPromise) {
          targetFile.uploadPromise.then(resolve, reject)
          return
        }
        if (targetFile.uploaded) {
          resolve()
          return
        }
        reject(new Error(`uploads-mirror: target "${target.name}" returned no uploadPromise`))
      })
      // A failed target stops reading its branch; keep draining it so the
      // remaining targets are not stalled by its full buffer.
      done.catch(() => {
        stream.unpipe(branch as unknown as NodeJS.WritableStream)
        branch.resume()
      })
      settled.push(done)
    })

    const copies: MirrorCopy[] = targets.map((target, index) => ({
      target: target.name,
      id: targetFiles[index].id,
    }))
    const id = encodeMirrorId(copies)
    inFlight.set(id, { copies, files: targetFiles })

    // A failure on the SOURCE side fails every copy: the branches end with the
    // error and each target's outcome is settled with it.
    const failAll = (error: Error): void => {
      for (const fail of failTarget) fail(error)
      for (const branch of branches) branch.destroy(error)
    }
    stream.on('error', (error: Error) => failAll(error))
    // A multipart parser's size limit ends the stream normally after `limit`:
    // every target would store the truncated body as complete (R93-B2).
    stream.on('limit', () => {
      const error = new Error(
        'uploads-mirror: the upload exceeded the size limit; nothing was stored.',
      )
      error.name = 'UploadTooLargeError'
      failAll(error)
    })
    // A source destroyed without `end` would leave every branch, and
    // `uploadPromise`, pending for ever (R93-B6).
    let sourceEnded = false
    stream.on('end', () => {
      sourceEnded = true
    })
    stream.on('close', () => {
      if (sourceEnded) return
      const error = new Error(
        'uploads-mirror: the upload stream closed before it ended; nothing was stored.',
      )
      error.name = 'UploadSourceClosedError'
      failAll(error)
    })

    let firstRequiredError: Error | undefined
    settled.forEach((done, index) => {
      done.catch((error: unknown) => {
        if (aborted.has(id)) return
        if (targets[index].required && !firstRequiredError) {
          firstRequiredError = toError(error)
          onError(firstRequiredError)
        }
      })
    })

    const uploadPromise = Promise.allSettled(settled).then(async (results) => {
      inFlight.delete(id)
      const wasAborted = aborted.delete(id)
      const succeeded = results
        .map((result, index) => (result.status === 'fulfilled' ? index : -1))
        .filter((index) => index >= 0)

      const cleanup = async (): Promise<void> => {
        await Promise.allSettled(
          succeeded.map(async (index) => {
            try {
              await targets[index].provider.deleteFile(copies[index].id)
            } catch (error) {
              report(targets[index].name, 'delete', error)
            }
          }),
        )
      }

      if (wasAborted) {
        await cleanup()
        delete file.uploadPromise
        throw new UploadAbortedError()
      }

      for (const [index, result] of results.entries()) {
        if (result.status === 'rejected') report(targets[index].name, 'upload', result.reason)
      }

      const requiredFailure = results.findIndex(
        (result, index) => result.status === 'rejected' && targets[index].required,
      )
      if (requiredFailure >= 0 || succeeded.length === 0) {
        await cleanup()
        delete file.uploadPromise
        const reason = (
          results[requiredFailure >= 0 ? requiredFailure : 0] as PromiseRejectedResult
        ).reason
        const error = firstRequiredError ?? toError(reason)
        if (!firstRequiredError) onError(error)
        throw error
      }

      file.id = encodeMirrorId(succeeded.map((index) => copies[index]))
      file.size = Math.max(file.size, ...succeeded.map((index) => targetFiles[index].size ?? 0))
      file.uploaded = true
      delete file.uploadPromise
    })

    const file: UploadedFile = {
      id,
      fieldname,
      filename: info.filename,
      encoding: info.encoding,
      mimetype: info.mimeType,
      size: 0,
      stream,
      uploadPromise,
      uploaded: false,
    }

    inFlightByFile.set(file, { copies, files: targetFiles })
    // Marked handled: a caller that relies on `onError` alone must not trigger
    // an unhandled rejection (R93-B10); the rejection still reaches whoever awaits.
    uploadPromise.catch(() => undefined)

    stream.on('data', (chunk: Buffer | string) => {
      file.size += chunk.length
    })

    return file
  }

  const abortUpload = async (file: UploadedFile): Promise<void> => {
    const live = inFlightByFile.get(file) ?? inFlight.get(file.id)
    if (live) aborted.add(file.id)
    const copies =
      live?.copies ??
      decodeMirrorId(file.id) ??
      targets.map((target) => ({ target: target.name, id: file.id }))
    const failures: Array<{ required: boolean; error: unknown }> = []
    await Promise.allSettled(
      copies.map(async (copy, index) => {
        const target = byName.get(copy.target)
        if (!target) {
          failures.push({ required: true, error: unknownTarget(copy.target) })
          return
        }
        const targetFile = live?.files[index] ?? { ...file, id: copy.id }
        try {
          await target.provider.abortUpload(targetFile)
        } catch (error) {
          report(target.name, 'abort', error)
          failures.push({ required: target.required, error })
        }
      }),
    )
    const required = failures.find((failure) => failure.required)
    if (required) throw required.error
  }

  const getFile = async (id: string): Promise<NodeJS.ReadableStream | null> => {
    let firstError: unknown
    let threw = false
    for (const copy of copiesInConfigOrder(id)) {
      const target = byName.get(copy.target)
      try {
        if (!target) throw unknownTarget(copy.target)
        if (!target.provider.getFile) {
          throw new Error(`uploads-mirror: target "${target.name}" cannot read files (no getFile)`)
        }
        const result = await target.provider.getFile(copy.id)
        if (result) return result
      } catch (error) {
        report(copy.target, 'get', error)
        if (!threw) firstError = error
        threw = true
      }
    }
    if (threw) throw firstError
    return null
  }

  const deleteFile = async (id: string): Promise<void> => {
    const copies = copiesInConfigOrder(id)
    const results = await Promise.allSettled(
      copies.map(async (copy) => {
        const target = byName.get(copy.target)
        if (!target) throw unknownTarget(copy.target)
        await target.provider.deleteFile(copy.id)
      }),
    )
    let requiredError: { error: unknown } | undefined
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') return
      const name = copies[index].target
      report(name, 'delete', result.reason)
      const target = byName.get(name)
      if ((!target || target.required) && !requiredError) requiredError = { error: result.reason }
    })
    if (requiredError) throw requiredError.error
  }

  const locate = async (id: string): Promise<MirrorCopyLocation[]> => {
    const copies = decodeMirrorId(id) ?? targets.map((target) => ({ target: target.name, id }))
    return Promise.all(
      copies.map(async (copy): Promise<MirrorCopyLocation> => {
        const target = byName.get(copy.target)
        const headFile = (target?.provider as { headFile?: HeadFileHandler } | undefined)?.headFile
        if (!target || typeof headFile !== 'function') return { ...copy, present: 'unknown' }
        try {
          const head = await headFile.call(target.provider, copy.id)
          return { ...copy, present: head !== null && head !== undefined }
        } catch (error) {
          // Not "absent": the lookup failed, so the answer is unknown. Recorded as
          // a bond failure; the result carries 'unknown' rather than a guess.
          trackBondFailure({ bond: BOND, operation: 'head', error })
          return { ...copy, present: 'unknown' }
        }
      }),
    )
  }

  return {
    targets: targets.map((target) => ({ name: target.name, required: target.required })),
    upload,
    abortUpload,
    getFile,
    deleteFile,
    parseId: decodeMirrorId,
    isMirrorId: (id: string) => decodeMirrorId(id) !== null,
    locate,
  }
}
