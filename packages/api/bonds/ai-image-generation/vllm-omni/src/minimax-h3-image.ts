/**
 * MiniMax-H3-Image facts the provider applies when that model is the target:
 * its native ~16 MP sizes, its 16-reference cap, and the fixed-sampling rules
 * (6 steps, no classifier-free guidance, PNG output, no mask, no negative
 * prompt) its vLLM-Omni/SGLang server enforces with HTTP 400.
 *
 * @module
 */

/**
 * The MiniMax-H3-Image model id, as vLLM-Omni/SGLang serves it. The bond's
 * alternative default model.
 */
export const MINIMAX_H3_IMAGE_MODEL = 'MiniMaxAI/MiniMax-H3-Image'

/** MiniMax-H3-Image's native ~16 MP output sizes, keyed by aspect ratio (model card). */
export const MINIMAX_H3_IMAGE_SIZES: Readonly<Record<string, string>> = {
  '1:1': '4096x4096',
  '4:3': '4736x3552',
  '3:4': '3552x4736',
  '3:2': '5024x3360',
  '2:3': '3360x5024',
  '16:9': '5472x3072',
  '9:16': '3072x5472',
  '21:9': '6272x2688',
}

/** Most reference images a single MiniMax-H3-Image edit accepts. */
export const MINIMAX_H3_IMAGE_MAX_REFERENCE_IMAGES = 16

/** The only step count the server accepts (with omitting it): 6 NFEs. */
export const MINIMAX_H3_IMAGE_STEPS = 6

/** The only guidance scale the server accepts (with omitting it): none (CFG-distilled). */
export const MINIMAX_H3_IMAGE_GUIDANCE = 1

/** MiniMax-H3-Image's default size, sent when the caller sets none (size is required). */
export const MINIMAX_H3_IMAGE_DEFAULT_SIZE = '4096x4096'

/**
 * Whether a model id names MiniMax-H3-Image (any casing; the `-Highspeed`
 * variant shares the checkpoint's sizes, caps and sampling rules).
 *
 * @param model - The model id sent to the server.
 * @returns `true` for MiniMax-H3-Image(-Highspeed).
 */
export function isMinimaxH3Image(model: string): boolean {
  return /minimax-h3-image/i.test(model)
}

/**
 * Maps a requested `"WxH"` size to the MiniMax-H3-Image native size with the
 * closest aspect ratio (e.g. `1024x1024` → `4096x4096`, `1920x1080` →
 * `5472x3072`). Values that are not `"WxH"` (such as `"auto"`) pass through.
 *
 * @param size - The requested size.
 * @returns A native MiniMax-H3-Image size, or the input unchanged.
 */
export function nearestMinimaxH3ImageSize(size: string): string {
  const match = /^(\d+)x(\d+)$/.exec(size.trim())
  if (!match) return size
  const w = Number(match[1])
  const h = Number(match[2])
  if (!w || !h) return size
  const target = Math.log(w / h)
  let best = MINIMAX_H3_IMAGE_SIZES['1:1']
  let bestDistance = Number.POSITIVE_INFINITY
  for (const native of Object.values(MINIMAX_H3_IMAGE_SIZES)) {
    const [nw, nh] = native.split('x').map(Number)
    const distance = Math.abs(Math.log(nw / nh) - target)
    if (distance < bestDistance) {
      best = native
      bestDistance = distance
    }
  }
  return best
}
