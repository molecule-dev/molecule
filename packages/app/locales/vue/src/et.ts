import type { VueTranslations } from './types.js'

/** Vue translations for Estonian. */
export const et: VueTranslations = {
  'vue.error.useRouterOutsideProvider':
    'Siin pole ruuterit. Mähi rakendus marsruutimissidemest (`@molecule/app-routing-vue-router`) `MoleculeRouterProvider`-i või anna `router` edasi `moleculePlugin`. Kui rakendus seda juba teeb, on selle marsruutimisside sellest sidemest vanem: uuenda seda (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.noRoutedView':
    'Sellel marsruutimissidemel pole siin renderdamiseks marsruutitud vaadet: edasta leht hoopis lastena. Kui rakendus marsruutib `@molecule/app-routing-vue-router` abil, on see side sellest sidumisest vanem: uuenda seda (`npm install @molecule/app-routing-vue-router@latest`).',
  'vue.error.useStoreOutsideProvider': 'useStateProvider tuleb kasutada StateProvider sees',
  'vue.error.useThemeOutsideProvider': 'useThemeProvider tuleb kasutada ThemeProvider sees',
  'vue.error.useAuthOutsideProvider': 'useAuthClient tuleb kasutada AuthProvider sees',
  'vue.error.useStorageOutsideProvider': 'useStorageProvider tuleb kasutada StorageProvider sees',
  'vue.error.useHttpOutsideProvider': 'useHttpClient tuleb kasutada HttpProvider sees',
  'vue.error.useLoggerOutsideProvider': 'useLoggerProvider tuleb kasutada LoggerProvider sees',
  'vue.error.useToastOutsideProvider': 'useToast tuleb kasutada ToastProvider sees',
  'vue.error.unsupportedMethod': 'Toetamata meetod: {{method}}',
  'vue.error.useChatOutsideProvider': 'useChatProvider tuleb kasutada ChatProvider sees',
  'vue.error.useEditorOutsideProvider':
    'useEditorProvider peab olema kasutatud EditorProvideri sees.',
  'vue.error.oauthFailed': 'OAuthi sisselogimine ebaõnnestus',
  'vue.error.usePreviewOutsideProvider': 'EelvaatePakkuja sees tuleb kasutada usePreviewProviderit',
  'vue.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider peab olema kasutusel WorkspaceProvideri sees.',
}
