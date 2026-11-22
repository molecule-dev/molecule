import type { VueTranslations } from './types.js'

/** Vue translations for Telugu. */
export const te: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ఇక్కడ రౌటర్ లేదు. రౌటింగ్ బాండ్ (`@molecule/app-routing-vue-router`) నుండి యాప్‌ను `MoleculeRouterProvider` లో చుట్టండి, లేదా `router` `moleculePlugin` కు పంపండి. ఒకవేళ యాప్ ఇప్పటికే ఇలా చేస్తుంటే, దాని రౌటింగ్ బాండ్ ఈ బైండింగ్ కంటే పాతది: దానిని అప్‌డేట్ చేయండి (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'ఈ రూటింగ్ బాండ్‌లో ఇక్కడ రెండర్ చేయడానికి రూట్ చేయబడిన వ్యూ ఏదీ లేదు: దానికి బదులుగా పేజీని చిల్డ్రన్‌గా పంపండి. ఒకవేళ యాప్ `@molecule/app-routing-vue-router` తో రూట్ చేస్తే, ఆ బాండ్ ఈ బైండింగ్ కంటే పాతది: దానిని అప్‌డేట్ చేయండి (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider StateProvider లోపల ఉపయోగించాలి',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider లోపల ఉపయోగించాలి',
  'vue.error.useAuthOutsideProvider': 'useAuthClient AuthProvider లోపల ఉపయోగించాలి',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider StorageProvider లోపల ఉపయోగించాలి',
  'vue.error.useHttpOutsideProvider': 'useHttpClient HttpProvider లోపల ఉపయోగించాలి',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider LoggerProvider లోపల ఉపయోగించాలి',
  'vue.error.useToastOutsideProvider': 'useToast ToastProvider లోపల ఉపయోగించాలి',
  'vue.error.unsupportedMethod': 'మద్దతు లేని పద్ధతి: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ChatProvider లోపల ఉపయోగించాలి',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider తప్పనిసరిగా EditorProvider లోపల ఉపయోగించబడాలి',
  'vue.error.oauthFailed': 'OAuth లాగిన్ విఫలమైంది',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProviderను తప్పనిసరిగా PreviewProvider లోపల ఉపయోగించాలి',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider తప్పనిసరిగా WorkspaceProvider లోపల ఉపయోగించబడాలి',
}
