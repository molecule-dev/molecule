import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Maltese. */
export const mt: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Ebda korp tar-risposta',
  'chat.error.streamError': 'Zball tal-istreaming',
  'chat.error.unknownError': 'Zball mhux maghruf',
  'chat.error.sendFailed': 'Ma rnexxiex nibgħat il-messaġġ',
  'chat.error.stalled':
    "{{agentName}} waqaf jirrispondi. Jista' jkun li għadu qed itemm fl-isfond — erġa' għabbi biex tara l-aħħar aħbarijiet, jew ibgħat messaġġ ġdid.",
  'aiChat.error.noProvider':
    'Il-fornitur taċ-chat tal-AI mhux ikkonfigurat. L-ewwel waħħal fornitur taċ-chat tal-AI.',
}
