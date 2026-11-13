import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Latvian. */
export const lv: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'Nav atbildes satura',
  'chat.error.streamError': 'Straumes kļūda',
  'chat.error.unknownError': 'Nezināma kļūda',
  'chat.error.sendFailed': 'Neizdevās nosūtīt ziņojumu',
  'chat.error.stalled':
    '{{agentName}} pārstāja reaģēt. Iespējams, ka tas joprojām pabeidz darbu fonā — ielādējiet lapu atkārtoti, lai skatītu jaunāko informāciju, vai nosūtiet jaunu ziņojumu.',
  'aiChat.error.noProvider':
    'Mākslīgā intelekta tērzēšanas pakalpojumu sniedzējs nav konfigurēts. Vispirms piesaistiet mākslīgā intelekta tērzēšanas pakalpojumu sniedzēju.',
}
