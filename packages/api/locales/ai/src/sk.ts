import type { AiTranslations } from './types.js'

/** Ai translations for Slovak. */
export const sk: AiTranslations = {
  'ai.error.noProvider':
    'AI poskytovateľ nie je nakonfigurovaný. Najprv pripojte AI poskytovateľa.',
  'ai.error.ambiguousProvider':
    'Je pripojených viacero pomenovaných AI poskytovateľov a nebol nastavený žiadny predvolený. Použite getProviderByName(name) na výber jedného.',
  'ai.error.responseIncomplete':
    'Odpoveď umelej inteligencie sa skončila pred dokončením. Skúste to znova.',
  'ai.error.responseTokenLimit':
    'Odpoveď umelej inteligencie dosiahla limit výstupných tokenov pred dokončením.',
  'ai.error.apiError': 'Chyba služby AI. Skúste to znova.',
  'ai.error.noResponseBody': 'Žiadna odpoveď od služby AI.',
}
