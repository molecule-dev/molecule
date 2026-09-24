/**
 * Proves the module-level `@example` in `src/index.ts` (rendered as the README
 * Quick Start) works exactly as written. Only the `react-native` runtime is
 * stubbed (it has no node renderer, and the real package is not installable in
 * this workspace — see `@molecule/app-ui-react-native`'s tests); the molecule
 * providers, hooks, ClassMap and components are all real.
 *
 * @module
 */
import type { JSX } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const reactNativeStub = vi.hoisted(() => async () => {
  const { createElement } = await import('react')
  const stub =
    (tag: string) =>
    (props: Record<string, unknown>): ReturnType<typeof createElement> =>
      createElement(
        'div',
        { 'data-rn': tag, className: props.className, style: props.style },
        props.children as never,
      )
  return {
    View: stub('View'),
    Text: stub('Text'),
    Pressable: stub('Pressable'),
    ScrollView: stub('ScrollView'),
    ActivityIndicator: stub('ActivityIndicator'),
    StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s },
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
  }
})

// `react-native` is an OPTIONAL peer of `@molecule/app-ui-react-native`; with it absent, Vite
// rewrites that package's import to this virtual id, so the stub is registered under both.
vi.mock('react-native', reactNativeStub)
vi.mock('__vite-optional-peer-dep:react-native:@molecule/app-ui-react-native', reactNativeStub)

const { createJWTAuthClient } = await import('@molecule/app-auth')
const { getProvider: getI18nProvider, registerLocaleModule } = await import('@molecule/app-i18n')
const commonLocales = await import('@molecule/app-locales-common')
const { provider: stateProvider } = await import('@molecule/app-state-zustand')
const { setClassMap } = await import('@molecule/app-ui')
const { classMap } = await import('@molecule/app-ui-nativewind')
const { Alert, Container } = await import('@molecule/app-ui-react-native')
const { MoleculeProvider, useAppState, useAuth, useSafeArea, useTranslation } =
  await import('../index.js')

interface User {
  id: string
  name: string
}

describe('README @example', () => {
  it('renders the screen through MoleculeProvider with the RN hooks and components', () => {
    setClassMap(classMap)
    registerLocaleModule(commonLocales)

    const authClient = createJWTAuthClient<User>({ baseURL: 'https://api.example.com' })

    /**
     * The example's screen.
     *
     * @returns The rendered screen.
     */
    function HomeScreen(): JSX.Element {
      const { user, isAuthenticated } = useAuth<User>()
      const { isActive } = useAppState()
      const insets = useSafeArea()
      const { t } = useTranslation()

      return (
        <Container style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <Alert status={isActive ? 'info' : 'warning'}>
            {isAuthenticated
              ? t(
                  'auth.modal.loggedInAs',
                  { who: user?.name ?? '' },
                  { defaultValue: 'Logged in as {{who}}' },
                )
              : t('auth.login.logIn', undefined, { defaultValue: 'Log in' })}
          </Alert>
        </Container>
      )
    }

    /**
     * The example's root component.
     *
     * @returns The provider-wrapped screen.
     */
    function App(): JSX.Element {
      return (
        <MoleculeProvider state={stateProvider} auth={authClient} i18n={getI18nProvider()}>
          <HomeScreen />
        </MoleculeProvider>
      )
    }

    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('Log in')
    // Off-device (no SafeAreaProvider / react-native-safe-area-context) the insets fall back to 0.
    expect(html).toContain('padding-top:0')
    // The real NativeWind ClassMap resolved the classes.
    expect(html).toContain(classMap.container())
  })
})
