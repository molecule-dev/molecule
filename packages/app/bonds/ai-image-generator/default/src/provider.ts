/**
 * Default HTTP image generator provider implementation.
 *
 * Communicates with a backend API to generate, list, and delete images.
 * Supports both simple JSON responses and SSE streaming for progress updates.
 *
 * @module
 */

import type {
  AIImageGeneratorProvider,
  GeneratedImage,
  ImageGenerationConfig,
  ImageGenerationEvent,
  ImageGenerationEventHandler,
  ImageGenerationRequest,
} from '@molecule/app-ai-image-generator'
import { t } from '@molecule/app-i18n'

import type { HttpImageGeneratorConfig } from './types.js'

/**
 * Parses a size string like `'1024x1024'` into width and height numbers.
 *
 * @param size - Size string in `WxH` format.
 * @returns An object with `width` and `height`, defaulting to 1024x1024.
 */
function parseSize(size?: string): { width: number; height: number } {
  if (!size) return { width: 1024, height: 1024 }
  const parts = size.split('x')
  return {
    width: parseInt(parts[0], 10) || 1024,
    height: parseInt(parts[1], 10) || 1024,
  }
}

/**
 * Normalizes a raw image record from the server into a `GeneratedImage`.
 *
 * @param raw - The raw image object from the API response.
 * @param index - Fallback index for ID generation.
 * @returns A normalized `GeneratedImage`.
 */
function normalizeImage(raw: Record<string, unknown>, index: number): GeneratedImage {
  const ts = raw.createdAt
  const createdAt =
    typeof ts === 'number' ? ts : typeof ts === 'string' ? new Date(ts).getTime() : Date.now()

  return {
    id: (raw.id as string) ?? `img-${index}`,
    url: (raw.url as string) ?? '',
    prompt: (raw.prompt as string) ?? '',
    revisedPrompt: raw.revisedPrompt as string | undefined,
    width: (raw.width as number) ?? 1024,
    height: (raw.height as number) ?? 1024,
    createdAt,
  }
}

/**
 * HTTP-based implementation of `AIImageGeneratorProvider`.
 *
 * Sends generation requests via POST, reads progress via SSE or JSON responses,
 * and supports history loading and image deletion.
 */
export class HttpImageGeneratorProvider implements AIImageGeneratorProvider {
  readonly name = 'default'
  private config: HttpImageGeneratorConfig
  private abortController: AbortController | null = null

  /**
   * Creates a new HTTP image generator provider.
   *
   * @param config - HTTP-specific configuration (base URL, headers).
   */
  constructor(config: HttpImageGeneratorConfig = {}) {
    this.config = config
  }

  /**
   * Generates images by sending a POST request to the backend.
   * Handles both SSE streaming responses (with progress events) and
   * plain JSON responses (single batch of images).
   *
   * @param request - The generation parameters.
   * @param config - API endpoint and model configuration.
   * @param onEvent - Callback for generation lifecycle events.
   * @returns The array of generated images.
   */
  async generate(
    request: ImageGenerationRequest,
    config: ImageGenerationConfig,
    onEvent: ImageGenerationEventHandler,
  ): Promise<GeneratedImage[]> {
    this.abortController?.abort()
    const controller = new AbortController()
    this.abortController = controller
    const { signal } = controller

    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`
    const { width, height } = parseSize(request.size)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify({
          prompt: request.prompt,
          ...(request.negativePrompt ? { negativePrompt: request.negativePrompt } : {}),
          ...(request.size ? { size: request.size } : {}),
          ...(request.count != null ? { count: request.count } : {}),
          ...(request.format ? { format: request.format } : {}),
          ...(request.quality ? { quality: request.quality } : {}),
          ...(request.style ? { style: request.style } : {}),
          model: request.model ?? config.model,
        }),
        signal,
      })

      if (!response.ok) {
        const text = await response
          .text()
          .catch(() =>
            t('imageGenerator.error.unknown', undefined, { defaultValue: 'Unknown error' }),
          )
        let errorMessage: string | undefined
        try {
          const body = JSON.parse(text)
          if (typeof body.error === 'string') errorMessage = body.error
        } catch {
          // Not JSON — use raw text
        }
        onEvent({
          type: 'error',
          message:
            errorMessage ??
            t(
              'imageGenerator.error.httpError',
              { status: response.status, text },
              { defaultValue: 'HTTP {{status}}: {{text}}' },
            ),
        })
        return []
      }

      const contentType = response.headers.get('content-type') ?? ''

      // SSE streaming response — parse progress and image events
      if (contentType.includes('text/event-stream')) {
        return await this.handleStreamResponse(response, onEvent, controller, signal)
      }

      // Plain JSON response — single batch of images
      return await this.handleJsonResponse(response, onEvent, width, height)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return []
      }
      const message =
        err instanceof Error
          ? err.message
          : t('imageGenerator.error.generateFailed', undefined, {
              defaultValue: 'Image generation failed',
            })
      onEvent({ type: 'error', message })
      return []
    } finally {
      if (this.abortController === controller) {
        this.abortController = null
      }
    }
  }

  /**
   * Handles an SSE streaming response, parsing progress and image events.
   *
   * @param response - The fetch Response with an SSE body.
   * @param onEvent - Event callback.
   * @param controller - The AbortController for this request.
   * @param signal - The abort signal.
   * @returns The collected generated images.
   */
  private async handleStreamResponse(
    response: Response,
    onEvent: ImageGenerationEventHandler,
    controller: AbortController,
    signal: AbortSignal,
  ): Promise<GeneratedImage[]> {
    if (!response.body) {
      onEvent({
        type: 'error',
        message: t('imageGenerator.error.noResponseBody', undefined, {
          defaultValue: 'No response body',
        }),
      })
      return []
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    const images: GeneratedImage[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data) continue

        try {
          const event = JSON.parse(data) as ImageGenerationEvent
          if (event.type === 'image') {
            images.push(event.image)
          }
          onEvent(event)
        } catch {
          // Skip malformed SSE data
        }
      }

      // Yield to the main thread between chunks
      if (!signal.aborted) {
        await new Promise((r) => setTimeout(r, 0))
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6).trim()
      if (data) {
        try {
          const event = JSON.parse(data) as ImageGenerationEvent
          if (event.type === 'image') {
            images.push(event.image)
          }
          onEvent(event)
        } catch {
          // Skip malformed data
        }
      }
    }

    // Only clear if this call's controller is still the active one
    if (this.abortController === controller) {
      this.abortController = null
    }

    return images
  }

  /**
   * Handles a plain JSON response containing generated images.
   *
   * @param response - The fetch Response with a JSON body.
   * @param onEvent - Event callback.
   * @param width - Expected image width.
   * @param height - Expected image height.
   * @returns The generated images.
   */
  private async handleJsonResponse(
    response: Response,
    onEvent: ImageGenerationEventHandler,
    width: number,
    height: number,
  ): Promise<GeneratedImage[]> {
    const body = (await response.json()) as {
      images?: Record<string, unknown>[]
    }

    const rawImages = body.images ?? []
    const images: GeneratedImage[] = rawImages.map((raw, i) => {
      const img = normalizeImage(raw, i)
      // Fall back to request dimensions if the server didn't include them
      if (!raw.width) img.width = width
      if (!raw.height) img.height = height
      return img
    })

    onEvent({ type: 'started' })
    for (const image of images) {
      onEvent({ type: 'image', image })
    }
    onEvent({ type: 'done', images })

    return images
  }

  /**
   * Aborts the current in-flight generation request, if any.
   */
  abort(): void {
    this.abortController?.abort()
    this.abortController = null
  }

  /**
   * Loads previously generated images from the server via GET request.
   *
   * @param config - API endpoint configuration.
   * @returns An array of generated images, or an empty array on failure.
   */
  async loadHistory(config: ImageGenerationConfig): Promise<GeneratedImage[]> {
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}`

    try {
      const response = await fetch(url, {
        headers: this.config.headers,
      })

      if (!response.ok) return []

      const data = (await response.json()) as {
        images?: Record<string, unknown>[]
      }

      return (data.images ?? []).map((raw, i) => normalizeImage(raw, i))
    } catch {
      return []
    }
  }

  /**
   * Deletes a previously generated image via DELETE request.
   *
   * @param id - The image ID to delete.
   * @param config - API endpoint configuration.
   */
  async deleteImage(id: string, config: ImageGenerationConfig): Promise<void> {
    const url = `${this.config.baseUrl ?? ''}${config.endpoint}/${encodeURIComponent(id)}`
    await fetch(url, {
      method: 'DELETE',
      headers: this.config.headers,
    })
  }
}

/**
 * Creates an `HttpImageGeneratorProvider` instance.
 *
 * @param config - HTTP-specific configuration (base URL, headers).
 * @returns A configured `HttpImageGeneratorProvider`.
 */
export function createProvider(config?: HttpImageGeneratorConfig): HttpImageGeneratorProvider {
  return new HttpImageGeneratorProvider(config)
}
