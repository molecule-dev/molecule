import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Armenian. */
export const hy: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Patasxani marminy bakutyun',
  'chat.error.streamError': 'Hoshqi skhalmunk',
  'chat.error.unknownError': 'Anhayt skhalmunk',
  'chat.error.sendFailed': 'Չհաջողվեց ուղարկել հաղորդագրությունը',
  'chat.error.stalled':
    '{{agentName}} դադարեց պատասխանել։ Հնարավոր է՝ այն դեռ աշխատում է ֆոնային ռեժիմով՝ վերաբեռնեք՝ վերջինը տեսնելու կամ նոր հաղորդագրություն ուղարկելու համար։',
  'aiChat.error.noProvider':
    'Արհեստական բանականության չաթի մատակարարը կարգավորված չէ: Նախ կապվեք արհեստական բանականության չաթի մատակարարի հետ:',
}
