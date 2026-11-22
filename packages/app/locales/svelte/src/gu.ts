import type { SvelteTranslations } from './types.js'

/** Svelte translations for Gujarati. */
export const gu: SvelteTranslations = {
  'svelte.error.noStateProvider': 'સ્ટેટ પ્રોવાઇડર કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.noAuthClient': 'ઓથ ક્લાયન્ટ કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.noThemeProvider': 'થીમ પ્રોવાઇડર કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.noRouter':
    'અહીં કોઈ રાઉટર નથી. રૂટ `+layout.svelte` માં રૂટીંગ બોન્ડ (`@molecule/app-routing-sveltekit`) માંથી `MoleculeRouterProvider` માઉન્ટ કરો, અથવા ત્યાં `setMoleculeContext({ router })` કૉલ કરો. જો એપ્લિકેશન પહેલાથી જ આ કરે છે, તો તેનું રૂટીંગ બોન્ડ આ બાઈન્ડિંગ કરતા જૂનું છે: તેને અપડેટ કરો (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noI18nProvider': 'I18n પ્રોવાઇડર કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.noHttpClient': 'HTTP ક્લાયન્ટ કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.noStorageProvider': 'સ્ટોરેજ પ્રોવાઇડર કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.noLoggerProvider': 'લોગર પ્રોવાઇડર કોન્ટેક્સ્ટમાં મળ્યું નથી',
  'svelte.error.unknownPaginationDirection': 'અજાણી પેજિનેશન દિશા: "{{direction}}"',
  'svelte.error.useChatOutsideProvider': 'useChatProvider એ ChatProvider ની અંદર વાપરવું આવશ્યક છે',
  'svelte.error.useToastOutsideProvider': 'useToast એ ToastProvider ની અંદર વાપરવું આવશ્યક છે',
  'svelte.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider નો ઉપયોગ WorkspaceProvider ની અંદર થવો જોઈએ.',
  'svelte.error.useEditorOutsideProvider':
    'useEditorProvider નો ઉપયોગ EditorProvider માં થવો જોઈએ.',
  'svelte.error.usePreviewOutsideProvider':
    'usePreviewProvider નો ઉપયોગ PreviewProvider ની અંદર જ થવો જોઈએ.',
  'svelte.error.useAuthOutsideProvider': 'useAuthClient નો ઉપયોગ AuthProvider માં થવો જોઈએ.',
  'svelte.error.useThemeOutsideProvider':
    'useThemeProvider નો ઉપયોગ ThemeProvider ની અંદર જ થવો જોઈએ.',
  'svelte.error.useRouterOutsideProvider':
    'અહીં કોઈ રાઉટર નથી. રૂટ `+layout.svelte` માં રૂટીંગ બોન્ડ (`@molecule/app-routing-sveltekit`) માંથી `MoleculeRouterProvider` માઉન્ટ કરો, અથવા ત્યાં `setMoleculeContext({ router })` કૉલ કરો. જો એપ્લિકેશન પહેલાથી જ આ કરે છે, તો તેનું રૂટીંગ બોન્ડ આ બાઈન્ડિંગ કરતા જૂનું છે: તેને અપડેટ કરો (`npm install @molecule/app-routing-sveltekit@latest`).',
  'svelte.error.noRoutedView':
    'અહીં કોઈ રૂટેડ વ્યૂ નથી. SvelteKit તેના પેજને `children` તરીકે લેઆઉટ આપે છે: આ ઘટકની અંદર `{@render children()}` પાસ કરો.',
  'svelte.error.useHttpOutsideProvider': 'useHttpClient નો ઉપયોગ HttpProvider માં થવો જોઈએ.',
  'svelte.error.useStorageOutsideProvider':
    'useStorageProvider નો ઉપયોગ StorageProvider ની અંદર જ થવો જોઈએ.',
  'svelte.error.useLoggerOutsideProvider':
    'useLoggerProvider નો ઉપયોગ LoggerProvider ની અંદર જ થવો જોઈએ.',
  'svelte.error.useStoreOutsideProvider':
    'useStateProvider નો ઉપયોગ StateProvider ની અંદર જ થવો જોઈએ.',
  'svelte.error.unsupportedMethod': 'અસમર્થિત પદ્ધતિ: {{method}}',
  'svelte.error.oauthFailed': 'OAuth લૉગિન નિષ્ફળ થયું',
}
