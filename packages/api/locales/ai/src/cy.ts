import type { AiTranslations } from './types.js'

/** Ai translations for Welsh. */
export const cy: AiTranslations = {
  'ai.error.noProvider': "Nid yw darparwr AI wedi'i ffurfweddu. Bondiwch ddarparwr AI yn gyntaf.",
  'ai.error.ambiguousProvider':
    "Mae sawl darparwr AI wedi'u henwi wedi'u bondio ac ni osodwyd unrhyw un diofyn. Defnyddiwch getProviderByName(name) i ddewis un.",
  'ai.error.responseIncomplete':
    'Daeth yr ymateb AI i ben cyn ei gwblhau. Rhowch gynnig arall arni.',
  'ai.error.responseTokenLimit': 'Cyrhaeddodd ymateb AI y terfyn tocyn allbwn cyn ei gwblhau.',
  'ai.error.apiError': 'Gwall gwasanaeth AI. Rhowch gynnig arall arni.',
  'ai.error.noResponseBody': 'Dim ymateb gan y gwasanaeth AI.',
}
