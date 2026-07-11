/**
 * Local AI provider configuration.
 *
 * The local provider talks to any **OpenAI-compatible** local inference server
 * — Ollama, LM Studio, llama.cpp's server, vLLM, etc. — all of which expose
 * `POST {baseUrl}/chat/completions` with SSE streaming. It is effectively the
 * OpenAI provider with a configurable `baseUrl` and an OPTIONAL API key (most
 * local servers ignore authentication entirely).
 *
 * Resolution order + defaults:
 * - `baseUrl`: `config.baseUrl` → `LOCAL_AI_BASE_URL` → `OLLAMA_BASE_URL` →
 *   `http://localhost:11434/v1` (Ollama's OpenAI-compatible endpoint). Must
 *   include the API version segment (e.g. `/v1`); the request path is
 *   `${baseUrl}/chat/completions`.
 * - `apiKey`: `config.apiKey` → `LOCAL_AI_API_KEY` → unset. When unset, NO
 *   `Authorization` header is sent — local runs are keyless by default.
 * - `model`: `params.model` (per call) → `config.model` → `LOCAL_AI_MODEL` →
 *   `llama3.1`.
 *
 * @module
 */

/** Local (OpenAI-compatible) provider configuration. */
export interface LocalConfig {
  /**
   * Base URL of the OpenAI-compatible endpoint, INCLUDING the version segment
   * (e.g. `http://localhost:11434/v1`). Overrides `LOCAL_AI_BASE_URL` /
   * `OLLAMA_BASE_URL`. Defaults to Ollama's `http://localhost:11434/v1`.
   */
  baseUrl?: string
  /**
   * Optional API key. Most local servers ignore auth; when omitted (and no
   * `LOCAL_AI_API_KEY` env var is set) no `Authorization` header is sent.
   */
  apiKey?: string
  /**
   * Default model when a call doesn't specify one. Overrides `LOCAL_AI_MODEL`.
   * Defaults to `llama3.1`.
   */
  model?: string
}
