/**
 * vLLM-Omni image generation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the vLLM-Omni image generation provider. Every field falls
 * back to its env var, read on each call (never at import time).
 */
export interface VllmOmniImageGenerationConfig {
  /** Server base URL without `/v1`. Defaults to the `VLLM_OMNI_BASE_URL` env var (required). */
  baseUrl?: string
  /** Optional API key, sent as `Authorization: Bearer …`. Defaults to `VLLM_OMNI_API_KEY`. */
  apiKey?: string
  /** Default model id. Defaults to `VLLM_OMNI_MODEL`, then `Qwen/Qwen-Image-2.1`. */
  defaultModel?: string
  /** Per-request timeout in milliseconds. Defaults to 300000 (diffusion at 2K is slow). */
  timeoutMs?: number
}
