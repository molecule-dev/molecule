/**
 * Tests for the react-native-ui package's exported API surface.
 *
 * react-native-ui ships React Native component functions; node-env vitest
 * can't render them (RN has no node renderer), so this verifies the package
 * loads and exposes a component per `@molecule/app-ui` primitive. The
 * `react-native` runtime, `@molecule/app-ui`, `@molecule/app-icons`, and
 * `@molecule/app-i18n` are stubbed so module evaluation stays self-contained.
 *
 * @module
 */
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

// Minimal react-native stub — every primitive the components import maps to a
// plain host-ish component so the modules evaluate in node.
vi.mock('react-native', () => {
  const stub = (tag: string) => {
    const C = (props: Record<string, unknown>) =>
      createElement('div', { 'data-rn': tag }, props.children as never)
    C.displayName = tag
    return C
  }
  return {
    View: stub('View'),
    Text: stub('Text'),
    Pressable: stub('Pressable'),
    ScrollView: stub('ScrollView'),
    Image: stub('Image'),
    ActivityIndicator: stub('ActivityIndicator'),
    FlatList: stub('FlatList'),
    TextInput: stub('TextInput'),
    Modal: stub('Modal'),
    Switch: stub('Switch'),
    StyleSheet: { create: (s: unknown) => s, flatten: (s: unknown) => s },
    Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios ?? o.default },
    Animated: { View: stub('Animated.View'), Value: class {}, timing: () => ({ start: () => {} }) },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
  }
})

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) => cls.filter(Boolean).join(' ')
        }
        const token = String(prop)
        const fn = (..._args: unknown[]) => token
        fn.toString = () => token
        return fn
      },
    }
    return new Proxy({}, handler)
  },
}))

vi.mock('@molecule/app-icons', () => ({
  getIcon: vi.fn((name: string) => ({ name, viewBox: '0 0 24 24', paths: [] })),
}))

vi.mock('@molecule/app-i18n', () => ({
  t: (_key: string, _values: unknown, opts?: { defaultValue?: string }) =>
    opts?.defaultValue ?? _key,
}))

const pkg = await import('../index.js')

describe('@molecule/app-ui-react-native exports', () => {
  it('exposes a component for every primitive', () => {
    for (const name of [
      'Accordion',
      'Alert',
      'Avatar',
      'Badge',
      'Button',
      'Card',
      'Checkbox',
      'Dropdown',
      'Form',
      'Input',
      'Modal',
      'Pagination',
      'Progress',
      'RadioGroup',
      'Select',
      'Separator',
      'Skeleton',
      'Spinner',
      'Switch',
      'Table',
      'Tabs',
      'Textarea',
      'Toast',
      'Tooltip',
    ]) {
      expect((pkg as Record<string, unknown>)[name], name).toBeDefined()
    }
  })

  it('exposes the Card and Skeleton sub-components', () => {
    for (const name of [
      'CardHeader',
      'CardTitle',
      'CardDescription',
      'CardContent',
      'CardFooter',
      'SkeletonCircle',
      'SkeletonText',
    ]) {
      expect((pkg as Record<string, unknown>)[name], name).toBeDefined()
    }
  })

  it('exposes layout primitives + the toast provider/container/hook', () => {
    expect(pkg.Flex).toBeDefined()
    expect(pkg.Grid).toBeDefined()
    expect(pkg.Container).toBeDefined()
    expect(pkg.Spacer).toBeDefined()
    expect(pkg.ToastProvider).toBeDefined()
    expect(pkg.ToastContainer).toBeDefined()
    expect(typeof pkg.useToast).toBe('function')
  })
})
