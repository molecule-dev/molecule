import type { ChatTranslations } from './types.js'

/** Ai Chat translations for French. */
export const fr: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}} : {{text}}',
  'chat.error.noResponseBody': 'Aucun corps de réponse',
  'chat.error.streamError': 'Erreur de diffusion',
  'chat.error.unknownError': 'Erreur inconnue',
  'chat.error.sendFailed': "Échec de l'envoi du message",
  'chat.error.stalled':
    '{{agentName}} ne répond plus. Le traitement est peut-être toujours en cours en arrière-plan ; actualisez la page pour afficher les dernières informations ou envoyez un nouveau message.',
}
