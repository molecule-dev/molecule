import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Belarusian. */
export const be: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Няма цела адказу',
  'chat.error.streamError': 'Памылка патоку',
  'chat.error.unknownError': 'Невядомая памылка',
  'chat.error.sendFailed': 'Не атрымалася адправіць паведамленне',
  'chat.error.stalled':
    '{{agentName}} перастаў адказваць. Магчыма, загрузка ўсё яшчэ выконваецца ў фонавым рэжыме — перазагрузіце старонку, каб убачыць апошнія налады, або адпраўце новае паведамленне.',
  'aiChat.error.noProvider':
    'Пастаўшчык чата са штучным інтэлектам не настроены. Спачатку падключыце пастаўшчыка чата са штучным інтэлектам.',
}
