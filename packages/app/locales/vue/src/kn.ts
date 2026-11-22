import type { VueTranslations } from './types.js'

/** Vue translations for Kannada. */
export const kn: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'ಇಲ್ಲಿ ರೂಟರ್ ಇಲ್ಲ. ಅಪ್ಲಿಕೇಶನ್ ಅನ್ನು ರೂಟಿಂಗ್ ಬಾಂಡ್‌ನಿಂದ (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider` ನಲ್ಲಿ ಸುತ್ತಿ, ಅಥವಾ `router` `moleculePlugin` ಗೆ ರವಾನಿಸಿ. ಅಪ್ಲಿಕೇಶನ್ ಈಗಾಗಲೇ ಇದನ್ನು ಮಾಡುತ್ತಿದ್ದರೆ, ಅದರ ರೂಟಿಂಗ್ ಬಾಂಡ್ ಈ ಬೈಂಡಿಂಗ್‌ಗಿಂತ ಹಳೆಯದಾಗಿದೆ: ಅದನ್ನು ನವೀಕರಿಸಿ (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'ಈ ರೂಟಿಂಗ್ ಬಾಂಡ್ ಇಲ್ಲಿ ರೆಂಡರ್ ಮಾಡಲು ಯಾವುದೇ ರೂಟೆಡ್ ವ್ಯೂ ಹೊಂದಿಲ್ಲ: ಬದಲಿಗೆ ಪುಟವನ್ನು ಚಿಲ್ಡ್ರನ್ ಆಗಿ ಪಾಸ್ ಮಾಡಿ. ಅಪ್ಲಿಕೇಶನ್ `@molecule/app-routing-vue-router` ನೊಂದಿಗೆ ರೂಟ್ ಮಾಡಿದರೆ, ಆ ಬಾಂಡ್ ಈ ಬೈಂಡಿಂಗ್‌ಗಿಂತ ಹಳೆಯದಾಗಿದೆ: ಅದನ್ನು ನವೀಕರಿಸಿ (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider ಅನ್ನು StateProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider ಅನ್ನು ThemeProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useAuthOutsideProvider': 'useAuthClient ಅನ್ನು AuthProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider ಅನ್ನು StorageProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useHttpOutsideProvider': 'useHttpClient ಅನ್ನು HttpProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider ಅನ್ನು LoggerProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useToastOutsideProvider': 'useToast ಅನ್ನು ToastProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.unsupportedMethod': 'ಬೆಂಬಲಿಸದ ವಿಧಾನ: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider ಅನ್ನು ChatProvider ಒಳಗೆ ಬಳಸಬೇಕು',
  'vue.error.useEditorOutsideProvider': 'useEditorProvider ಅನ್ನು EditorProvider ನಲ್ಲಿಯೇ ಬಳಸಬೇಕು.',
  'vue.error.oauthFailed': 'OAuth ಲಾಗಿನ್ ವಿಫಲವಾಗಿದೆ',
  'vue.error.usePreviewOutsideProvider': 'usePreviewProvider ಅನ್ನು PreviewProvider ನ ಒಳಗೆ ಬಳಸಬೇಕು.',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider ಅನ್ನು WorkspaceProvider ನೊಳಗೆ ಬಳಸಬೇಕು.',
}
