// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { Box } from '../elements/Box.js'
import { Text } from '../elements/Text.js'

vi.mock('@molecule/app-ui', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  getClassMap: () => ({}),
}))
vi.mock('react-native', () => vi.importActual('react-native-web'))

it('sets HTML language on text and containers through React Native Web', () => {
  const { getByTestId } = render(
    <Box as="section" lang="fr-CA" data-testid="label" aria-label="Bonjour">
      <Text as="span" lang="es-MX" aria-live="polite" data-testid="cue">
        Buenos días
      </Text>
      <Text as="span" data-testid="ambient">
        Bonjour
      </Text>
    </Box>,
  )

  expect(getByTestId('cue').getAttribute('lang')).toBe('es-MX')
  expect(getByTestId('cue').getAttribute('aria-live')).toBe('polite')
  expect(getByTestId('label').getAttribute('lang')).toBe('fr-CA')
  expect(getByTestId('ambient').getAttribute('lang')).toBeNull()
})
