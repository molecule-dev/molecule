import type { AiTranslations } from './types.js'

/** Ai translations for Icelandic. */
export const is: AiTranslations = {
  'ai.error.noProvider': 'AI-þjónustuaðili er ekki stilltur. Tengdu AI-þjónustuaðila fyrst.',
  'ai.error.ambiguousProvider':
    'Margir nafngreindir AI-þjónustuaðilar eru tengdir og engin sjálfgefin var stillt. Notaðu getProviderByName(name) til að velja einn.',
  'ai.error.responseIncomplete': 'Svar við gervigreind lauk áður en það var lokið. Reyndu aftur.',
  'ai.error.responseTokenLimit':
    'Svar gervigreindar náði takmörkunum á úttakstákni áður en það var lokið.',
  'ai.error.apiError': 'Villa í gervigreindarþjónustu. Reyndu aftur.',
  'ai.error.noResponseBody': 'Ekkert svar frá gervigreindarþjónustu.',
}
