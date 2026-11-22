import type { ReactTranslations } from './types.js'

/** React translations for Czech. */
export const cs: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Komponenty Accordion musí být použity uvnitř Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient musí být použit uvnitř AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider musí být použit uvnitř ChatProvider',
  'react.error.useEditorOutsideProvider': 'useEditorProvider musí být použit uvnitř EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient musí být použit uvnitř HttpProvider',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider musí být použit uvnitř LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider musí být použit uvnitř PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Žádný router zde není. Připojte komponentu routeru z routing bond aplikace (`BrowserRouter` z `@molecule/app-routing-react-router`) nebo předejte `router` do `MoleculeProvider`. Pokud to aplikace již dělá, její routing bond je starší než tato vazba: aktualizujte ji (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Tato vazba směrování nemá žádný směrovaný pohled k vykreslení: předejte stránku jako podřízené objekty. Pokud aplikace směruje s `@molecule/app-routing-react-router`, je tato vazba starší než tato: aktualizujte ji (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider musí být použit uvnitř StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider musí být použit uvnitř StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider musí být použit uvnitř ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast musí být použit uvnitř ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musí být použit uvnitř WorkspaceProvider',
  'react.error.unsupportedMethod': 'Nepodporovaná metoda: {{method}}',
  'react.error.oauthFailed': 'Přihlášení přes OAuth se nezdařilo',
}
