import type { SvelteTranslations } from './types.js'

/** Svelte translations for Sinhala. */
export const si: SvelteTranslations = {
  'svelte.error.noStateProvider':
    '\u0dc3\u0dca\u0dae\u0dcf\u0db1\u0dba \u0dc3\u0db4\u0dba\u0db1\u0dca\u0db1\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.noAuthClient':
    '\u0d85\u0db0\u0dd2\u0db4\u0dca\u200d\u0dbb\u0db8\u0dcf\u0dab\u0dd3\u0d9a\u0dbb\u0dab \u0dc3\u0dda\u0dc0\u0dcf\u0daf\u0dcf\u0dba\u0d9a\u0dba\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.noThemeProvider':
    '\u0dad\u0dd2\u0dbb\u0dc3\u0dca\u0dae\u0dcf\u0db1\u0dba \u0dc3\u0db4\u0dba\u0db1\u0dca\u0db1\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.noRouter':
    'මෙහි රවුටරයක් නැත. `+layout.svelte` මූලයේ රවුටින් බන්ධනයෙන් (`@molecule/app-routing-sveltekit`) `MoleculeRouterProvider` සවි කරන්න, නැතහොත් එහි `setMoleculeContext({ router })` අමතන්න. යෙදුම දැනටමත් මෙය කරන්නේ නම්, එහි රවුටින් බන්ධනය මෙම බන්ධනයට වඩා පැරණි ය: එය යාවත්කාලීන කරන්න (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider':
    'I18n \u0dc3\u0db4\u0dba\u0db1\u0dca\u0db1\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.noHttpClient':
    'HTTP \u0dc3\u0dda\u0dc0\u0dcf\u0daf\u0dcf\u0dba\u0d9a\u0dba\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.noStorageProvider':
    '\u0d9c\u0dd2\u0dad\u0db4\u0dca\u0dbb\u0db8\u0dcf\u0db1\u0dc0 \u0dc3\u0db4\u0dba\u0db1\u0dca\u0db1\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.noLoggerProvider':
    '\u0dbd\u0ddc\u0d9c\u0dbb\u0dba \u0dc3\u0db4\u0dba\u0db1\u0dca\u0db1\u0dcf \u0db4\u0dca\u200d\u0dbb\u0dc3\u0d82\u0d9c\u0dba\u0dd9\u0dc4\u0dd2 \u0dc3\u0ddc\u0dba\u0dcf \u0d9c\u0dad \u0db1\u0ddc\u0dc4\u0dd0\u0d9a\u0dd2\u0dba',
  'svelte.error.unknownPaginationDirection':
    '\u0db1\u0ddc\u0daf\u0db1\u0dca\u0db1\u0dcf \u0db4\u0dd2\u0da7\u0dd4 \u0db1\u0dd2\u0dc0\u0dd4\u0dbb\u0dd4\u0dc0 \u0daf\u0dd2\u0dc1\u0dcf\u0dc0: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider ChatProvider තුළ භාවිතා කළ යුතුය',
  'svelte.error.useToastOutsideProvider': 'useToast ToastProvider තුළ භාවිතා කළ යුතුය',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider, EditorProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient AuthProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useRouterOutsideProvider':
    'මෙහි රවුටරයක් නැත. `+layout.svelte` මූලයේ රවුටින් බන්ධනයෙන් (`@molecule/app-routing-sveltekit`) `MoleculeRouterProvider` සවි කරන්න, නැතහොත් එහි `setMoleculeContext({ router })` අමතන්න. යෙදුම දැනටමත් මෙය කරන්නේ නම්, එහි රවුටින් බන්ධනය මෙම බන්ධනයට වඩා පැරණි ය: එය යාවත්කාලීන කරන්න (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'මෙහි මාර්ගගත දසුනක් නොමැත. SvelteKit එහි පිටුවට `children` ලෙස පිරිසැලසුමක් ලබා දෙයි: මෙම සංරචකය තුළ `{@render children()}` යන්න ලබා දෙන්න.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient HttpProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider StateProvider එකක් තුළ භාවිතා කළ යුතුය.',
  'svelte.error.unsupportedMethod': 'සහාය නොදක්වන ක්‍රමය: {{method}}',
  'svelte.error.oauthFailed': 'OAuth පුරනය වීම අසාර්ථක විය',
}
