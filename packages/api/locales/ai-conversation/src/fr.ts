import type { ConversationTranslations } from './types.js'

/** Conversation translations for French. */
export const fr: ConversationTranslations = {
  'conversation.error.messageRequired': 'Un message est requis',
  'conversation.error.aiNotConfigured': "Fournisseur d'IA non configuré",
  'conversation.error.unknownAiError': "Erreur d'IA inconnue",
  'conversation.error.notFound': 'Aucune conversation trouvée',
  'conversation.error.streamError': 'Erreur de diffusion IA',
  'conversation.error.forbidden': 'Accès refusé',
  'conversation.error.unauthorized': 'Non autorisé',
  'conversation.error.clearFailed': 'Échec de la conversation',
  'conversation.error.idRequired':
    "L'identifiant de conversation est requis lorsque le projet comporte plusieurs conversations.",
  'conversation.error.historyFailed': "Impossible de charger l'historique de la conversation",
  'conversation.error.readFailed': 'Échec de la lecture de la conversation',
  'conversation.error.updateFailed': 'Échec de la mise à jour de la conversation',
}
