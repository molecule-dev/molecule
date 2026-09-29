/**
 * Qwen-Image-2.1 facts the provider applies when that model is the target:
 * its native 2K sizes, its reference-image cap, and the prompt template that
 * triggers transparent (RGBA) output.
 *
 * @module
 */

/** The Qwen-Image-2.1 model id, as vLLM-Omni serves it. The bond's default model. */
export const QWEN_IMAGE_2_1_MODEL = 'Qwen/Qwen-Image-2.1'

/** Qwen-Image-2.1's native output sizes, keyed by aspect ratio (model card). */
export const QWEN_IMAGE_2_1_SIZES: Readonly<Record<string, string>> = {
  '1:1': '2048x2048',
  '4:3': '2400x1792',
  '3:4': '1792x2400',
  '3:2': '2528x1696',
  '2:3': '1696x2528',
  '16:9': '2752x1536',
  '9:16': '1536x2752',
}

/** Most reference images a single Qwen-Image-2.1 edit accepts. */
export const QWEN_IMAGE_2_1_MAX_REFERENCE_IMAGES = 10

/**
 * Whether a model id names Qwen-Image-2.1 (any org prefix or casing).
 *
 * @param model - The model id sent to the server.
 * @returns `true` for Qwen-Image-2.1.
 */
export function isQwenImage21(model: string): boolean {
  return /qwen-image-2\.1$/i.test(model)
}

/**
 * Maps a requested `"WxH"` size to the Qwen-Image-2.1 native size with the
 * closest aspect ratio (e.g. `1024x1024` → `2048x2048`, `1920x1080` →
 * `2752x1536`). Values that are not `"WxH"` (such as `"auto"`) pass through.
 *
 * @param size - The requested size.
 * @returns A native Qwen-Image-2.1 size, or the input unchanged.
 */
export function nearestQwenImage21Size(size: string): string {
  const match = /^(\d+)x(\d+)$/.exec(size.trim())
  if (!match) return size
  const w = Number(match[1])
  const h = Number(match[2])
  if (!w || !h) return size
  const target = Math.log(w / h)
  let best = QWEN_IMAGE_2_1_SIZES['1:1']
  let bestDistance = Number.POSITIVE_INFINITY
  for (const native of Object.values(QWEN_IMAGE_2_1_SIZES)) {
    const [nw, nh] = native.split('x').map(Number)
    const distance = Math.abs(Math.log(nw / nh) - target)
    if (distance < bestDistance) {
      best = native
      bestDistance = distance
    }
  }
  return best
}

/**
 * Wraps a description in the prompt template that makes Qwen-Image-2.1 return
 * a transparent (RGBA) image. Transparency has no request parameter — the
 * prompt is the only switch.
 *
 * @param description - What the image shows, e.g. `"A red sneaker, side view"`.
 * @returns The full prompt to send.
 */
export function transparentPrompt(description: string): string {
  const trimmed = description.trim().replace(/\.+$/, '')
  return `This is an RGBA image with transparency. ${trimmed}. The image has alpha channel and the background is transparent.`
}
