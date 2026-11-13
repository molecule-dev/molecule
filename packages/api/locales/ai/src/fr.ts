import type { AiTranslations } from './types.js'

/** Ai translations for French. */
export const fr: AiTranslations = {
  'ai.error.noProvider':
    "Le fournisseur d'IA n'est pas configuré. Liez d'abord un fournisseur d'IA.",
  'ai.error.ambiguousProvider':
    "Plusieurs fournisseurs d'IA nommés sont liés et aucun n'a été défini par défaut. Utilisez getProviderByName(name) pour en sélectionner un.",
  'ai.error.responseIncomplete':
    "La réponse de l'IA s'est interrompue avant la fin. Veuillez réessayer.",
  'ai.error.responseTokenLimit':
    "La réponse de l'IA a atteint la limite de jetons de sortie avant la fin.",
  'ai.error.apiError': "Erreur du service d'IA. Veuillez réessayer.",
  'ai.error.noResponseBody': "Aucune réponse du service d'IA.",
}
