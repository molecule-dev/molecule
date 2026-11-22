import type { VueTranslations } from './types.js'

/** Vue translations for Welsh. */
export const cy: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    "Dim llwybrydd yma. Lapio'r ap yn `MoleculeRouterProvider` o'r bond llwybro (`@molecule/app-routing-vue-router`), neu basio `router` i `moleculePlugin`. Os yw'r ap eisoes yn gwneud hyn, mae ei fond llwybro yn hŷn na'r rhwymiad hwn: diweddaru ef (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.noRoutedView':
    "Nid oes gan y bond llwybro hwn olygfa llwybro i'w rendro yma: pasiwch y dudalen fel plant yn lle. Os yw'r ap yn llwybro gyda `@molecule/app-routing-vue-router`, mae'r bond hwnnw'n hŷn na'r rhwymiad hwn: diweddarwch ef (`npm install @molecule/app-routing-vue-router@latest`).",
  'vue.error.useStoreOutsideProvider': 'Rhaid defnyddio useStateProvider o fewn StateProvider',
  'vue.error.useThemeOutsideProvider': 'Rhaid defnyddio useThemeProvider o fewn ThemeProvider',
  'vue.error.useAuthOutsideProvider': 'Rhaid defnyddio useAuthClient o fewn AuthProvider',
  'vue.error.useStorageOutsideProvider':
    'Rhaid defnyddio useStorageProvider o fewn StorageProvider',
  'vue.error.useHttpOutsideProvider': 'Rhaid defnyddio useHttpClient o fewn HttpProvider',
  'vue.error.useLoggerOutsideProvider': 'Rhaid defnyddio useLoggerProvider o fewn LoggerProvider',
  'vue.error.useToastOutsideProvider': 'Rhaid defnyddio useToast o fewn ToastProvider',
  'vue.error.unsupportedMethod': 'Dull heb ei gefnogi: {{method}}',
  'vue.error.useChatOutsideProvider': 'Rhaid defnyddio useChatProvider o fewn ChatProvider',
  'vue.error.useEditorOutsideProvider': 'Rhaid defnyddio useEditorProvider o fewn EditorProvider',
  'vue.error.oauthFailed': 'Methodd mewngofnodi OAuth',
  'vue.error.usePreviewOutsideProvider':
    'Rhaid defnyddio usePreviewProvider o fewn PreviewProvider',
  'vue.error.useWorkspaceOutsideProvider':
    'Rhaid defnyddio useWorkspaceProvider o fewn WorkspaceProvider',
}
