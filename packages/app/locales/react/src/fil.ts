import type { ReactTranslations } from './types.js'

/** React translations for Filipino. */
export const fil: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Ang mga komponent ng Accordion ay dapat gamitin sa loob ng Accordion',
  'react.error.useAuthOutsideProvider':
    'Ang useAuthClient ay dapat gamitin sa loob ng AuthProvider',
  'react.error.useChatOutsideProvider':
    'Ang useChatProvider ay dapat gamitin sa loob ng ChatProvider',
  'react.error.useEditorOutsideProvider':
    'Ang useEditorProvider ay dapat gamitin sa loob ng EditorProvider',
  'react.error.useHttpOutsideProvider':
    'Ang useHttpClient ay dapat gamitin sa loob ng HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'Ang useLoggerProvider ay dapat gamitin sa loob ng LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'Ang usePreviewProvider ay dapat gamitin sa loob ng PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Walang router dito. Mag-mount ng router component mula sa routing bond ng app (`BrowserRouter` mula sa `@molecule/app-routing-react-router`), o ipasa ang `router` sa `MoleculeProvider`. Kung ginagawa na ito ng app, ang routing bond nito ay mas luma kaysa sa binding na ito: i-update ito (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Walang routed view na ire-render dito ang routing bond na ito: ipasa ang page bilang children sa halip. Kung ang app ay nagroute gamit ang `@molecule/app-routing-react-router`, ang bond na iyon ay mas luma kaysa sa binding na ito: i-update ito (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'Ang useStateProvider ay dapat gamitin sa loob ng StateProvider',
  'react.error.useStorageOutsideProvider':
    'Ang useStorageProvider ay dapat gamitin sa loob ng StorageProvider',
  'react.error.useThemeOutsideProvider':
    'Ang useThemeProvider ay dapat gamitin sa loob ng ThemeProvider',
  'react.error.useToastOutsideProvider': 'Ang useToast ay dapat gamitin sa loob ng ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'Ang useWorkspaceProvider ay dapat gamitin sa loob ng WorkspaceProvider',
  'react.error.unsupportedMethod': 'Hindi sinusuportahang paraan: {{method}}',
  'react.error.oauthFailed': 'Nabigo ang pag-login sa OAuth',
}
