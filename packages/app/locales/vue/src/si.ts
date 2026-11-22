import type { VueTranslations } from './types.js'

/** Vue translations for Sinhala. */
export const si: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'මෙහි රවුටරයක් නැත. රවුටින් බන්ධනයෙන් (`@molecule/app-routing-vue-router`) යෙදුම `MoleculeRouterProvider` තුළට ඔතා, නැතහොත් `moleculePlugin` වෙත `router` යවන්න. යෙදුම දැනටමත් මෙය කරන්නේ නම්, එහි රවුටින් බන්ධනය මෙම බන්ධනයට වඩා පැරණි ය: එය යාවත්කාලීන කරන්න (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'මෙම රවුටින් බන්ධනයට මෙහි විදැහුම් කිරීමට රවුටඩ් දසුනක් නොමැත: ඒ වෙනුවට පිටුව ළමා ලෙස යවන්න. යෙදුම `@molecule/app-routing-vue-router` සමඟ රවුට් කරන්නේ නම්, එම බන්ධනය මෙම බන්ධනයට වඩා පැරණි ය: එය යාවත්කාලීන කරන්න (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider StateProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ThemeProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useAuthOutsideProvider': 'useAuthClient AuthProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider StorageProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useHttpOutsideProvider': 'useHttpClient HttpProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider LoggerProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useToastOutsideProvider': 'useToast ToastProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.unsupportedMethod': 'සහාය නොදක්වන ක්\u200dරමය: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ChatProvider තුළ භාවිතා කළ යුතුය',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider, EditorProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'vue.error.oauthFailed': 'OAuth පුරනය වීම අසාර්ථක විය',
  'vue.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider එකක් තුළ භාවිතා කළ යුතුය.',
}
