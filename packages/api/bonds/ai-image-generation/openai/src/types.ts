/**
 * OpenAI image generation provider configuration.
 *
 * @module
 */

/**
 * Configuration for the OpenAI image generation provider.
 */
export interface OpenaiImageGenerationConfig {
  /** OpenAI API key. Defaults to OPENAI_API_KEY env var. */
  apiKey?: string
  /** Default model for generation. Defaults to 'gpt-image-1'. */
  defaultModel?: string
  /** Base URL for the OpenAI API. Defaults to 'https://api.openai.com'. */
  baseUrl?: string
  /** Default image size. Defaults to '1024x1024'. */
  defaultSize?: string
  /** Default quality level. Defaults to 'auto'. */
  defaultQuality?: string
}
