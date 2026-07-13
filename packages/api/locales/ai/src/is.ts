import type { AiTranslations } from './types.js'

/** Ai translations for Icelandic. */
export const is: AiTranslations = {
  'ai.error.noProvider': 'AI-þjónustuaðili er ekki stilltur. Tengdu AI-þjónustuaðila fyrst.',
  'ai.error.apiError': 'AI API beiðni mistókst.',
  'ai.error.noResponseBody': 'Meginmál AI-svars er tómt.',
  'ai.error.ambiguousProvider':
    'Margir nafngreindir AI-þjónustuaðilar eru tengdir og engin sjálfgefin var stillt. Notaðu getProviderByName(name) til að velja einn.',
}
