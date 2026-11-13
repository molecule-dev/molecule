import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Telugu. */
export const te: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'ప్రతిస్పందన బాడీ లేదు',
  'chat.error.streamError': 'స్ట్రీమ్ లోపం',
  'chat.error.unknownError': 'తెలియని లోపం',
  'chat.error.sendFailed': 'సందేశం పంపడంలో విఫలమైంది',
  'chat.error.stalled':
    '{{agentName}} స్పందించడం ఆపివేసింది. అది నేపథ్యంలో ఇంకా పూర్తి అవుతూ ఉండవచ్చు — తాజా సమాచారం చూడటానికి రీలోడ్ చేయండి లేదా కొత్త సందేశం పంపండి.',
  'aiChat.error.noProvider':
    'AI చాట్ ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు. ముందుగా ఒక AI చాట్ ప్రొవైడర్‌ను బాండ్ చేయండి.',
}
