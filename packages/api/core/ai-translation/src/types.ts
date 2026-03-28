/**
 * AITranslation provider interface.
 *
 * Implement this interface in a bond package to provide
 * a concrete ai-translation implementation.
 *
 * @module
 */

/**
 * Parameters for translating text.
 */
export interface TranslateParams {
  /** Text or array of texts to translate. Maximum 50 texts per request. */
  text: string | string[]
  /** Target language code (e.g., 'DE', 'FR', 'ES', 'EN-US'). */
  targetLang: string
  /** Source language code. If omitted, the provider auto-detects the language. */
  sourceLang?: string
  /** Formality preference. Not all providers or target languages support this. */
  formality?: 'default' | 'more' | 'less' | 'prefer_more' | 'prefer_less'
  /** Whether to preserve original formatting conventions. */
  preserveFormatting?: boolean
  /** Glossary identifier for consistent terminology. May require sourceLang to be set. */
  glossaryId?: string
  /** How to handle markup tags in the text ('xml' or 'html'). */
  tagHandling?: 'xml' | 'html'
  /** Additional context to improve translation accuracy (not translated itself). */
  context?: string
  /** Model type preference for quality vs latency trade-off. */
  modelType?: 'quality_optimized' | 'prefer_quality_optimized' | 'latency_optimized'
}

/**
 * A single translated text with its detected source language.
 */
export interface TranslatedText {
  /** The translated text. */
  text: string
  /** Detected source language code (e.g., 'EN', 'DE'). */
  detectedSourceLang: string
}

/**
 * Result of a translation request containing one or more translated texts.
 */
export interface TranslationResult {
  /** Array of translation results, one per input text. */
  translations: TranslatedText[]
}

/**
 * A language supported by the translation provider.
 */
export interface SupportedLanguage {
  /** Language code (e.g., 'EN', 'DE', 'FR', 'PT-BR'). */
  language: string
  /** Human-readable language name (e.g., 'English', 'German'). */
  name: string
  /** Whether formality options are supported for this language. */
  supportsFormality?: boolean
}

/**
 * API usage statistics for the current billing period.
 */
export interface TranslationUsage {
  /** Number of characters translated in the current billing period. */
  characterCount: number
  /** Maximum character limit for the current billing period. */
  characterLimit: number
}

/**
 * AITranslation provider interface.
 *
 * Bond packages implement this interface to provide translation services
 * from different backends (DeepL, Google Translate, etc.).
 */
export interface AITranslationProvider {
  /** Provider identifier (e.g., 'deepl', 'google'). */
  readonly name: string

  /**
   * Translate one or more texts to a target language.
   *
   * @param params - Translation parameters including text(s) and target language.
   * @returns Translation results with detected source languages.
   */
  translate(params: TranslateParams): Promise<TranslationResult>

  /**
   * Get the list of languages supported by this provider.
   *
   * @param type - Whether to list 'source' or 'target' languages. Defaults to 'source'.
   * @returns Array of supported languages with metadata.
   */
  getSupportedLanguages(type?: 'source' | 'target'): Promise<SupportedLanguage[]>

  /**
   * Get current API usage statistics for the billing period.
   *
   * @returns Character count and limit for the current period.
   */
  getUsage(): Promise<TranslationUsage>
}

/**
 * Base configuration for AITranslation providers.
 */
export interface AITranslationConfig {
  /** API key for authentication. Typically falls back to an environment variable. */
  apiKey?: string
  /** Base URL for the translation API. */
  baseUrl?: string
}
