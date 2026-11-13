/** Translation keys for the ai-image-generator locale package. */
export type AiImageGeneratorTranslationKey =
  | 'imageGenerator.error.generateFailed'
  | 'imageGenerator.error.httpError'
  | 'imageGenerator.error.noResponseBody'
  | 'imageGenerator.error.unknown'

/** Translation record mapping `@molecule/app-ai-image-generator` keys to translated strings. */
export type AiImageGeneratorTranslations = Record<AiImageGeneratorTranslationKey, string>
