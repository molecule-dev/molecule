import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Amharic. */
export const am: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'ምንም የምላሽ ይዘት የለም',
  'chat.error.streamError': 'የዥረት ስህተት',
  'chat.error.unknownError': 'ያልታወቀ ስህተት',
  'chat.error.sendFailed': 'መልእክት መላክ አልተሳካም',
  'chat.error.stalled':
    '{{agentName}} ምላሽ መስጠት አቁሟል። አሁንም ከበስተጀርባ እየተጠናቀቀ ሊሆን ይችላል — የቅርብ ጊዜውን ለማየት እንደገና ይጫኑ ወይም አዲስ መልእክት ይላኩ።',
}
