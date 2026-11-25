/**
 * The Tailwind preset (`@molecule/app-ui-nativewind/preset`): its colours are
 * `@molecule/app-ui-tailwind`'s token table, and every class this ClassMap
 * returns compiles, on the web and for a device.
 *
 * @module
 */

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { beforeAll, describe, expect, it } from 'vitest'

import { colorTokens, themeVariables } from '@molecule/app-ui-tailwind'

import {
  deviceOnlyClasses,
  expandBraces,
  inlineSourceClasses,
  ruleClasses,
  words,
} from '../../scripts/device-classes.mjs'
import { classMap } from '../classMap.js'
import { descendantRule, forDevice, stateRule } from '../device.js'

interface Compile {
  loadPreset(os: string | undefined): {
    darkMode: string
    moleculeContent(fromDir?: string): string[]
    theme: { extend: { colors: Record<string, (options: { opacityValue?: string }) => string> } }
  }
  tailwindCss(classes: string[], os: string | undefined): Promise<{ css: string; root: unknown }>
  classesWithRules(root: unknown): Set<string>
  classesWithNativeStyles(css: string): Set<string>
}

const compile = createRequire(import.meta.url)('./helpers/compile.cjs') as Compile

/**
 * The JavaScript files under a directory.
 *
 * @param dir - The directory.
 * @returns Each file's text.
 */
const scripts = (dir: string): string[] =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.c?[jt]s$/.test(file) && !file.includes('__tests__'))
    .map((file) => readFileSync(join(dir, file), 'utf8'))

/**
 * Every class the ClassMap returns: its static entries, each function called
 * with no options, and the calls the React Native components make.
 */
const staticClasses = (() => {
  const strings: string[] = []
  for (const [key, value] of Object.entries(classMap)) {
    if (typeof value === 'string') strings.push(value)
    else if (typeof value === 'function' && key !== 'cn') {
      let result: unknown
      try {
        result = (value as () => unknown)()
      } catch (_error) {
        // A function that needs an argument is covered by the calls below.
        continue
      }
      if (typeof result === 'string' && !result.includes('undefined')) strings.push(result)
    }
  }
  strings.push(
    classMap.input({ error: true, size: 'sm' }),
    classMap.label({ required: true }),
    classMap.checkbox({ error: true }),
  )
  for (const variant of ['default', 'info', 'success', 'warning', 'error'] as const)
    strings.push(classMap.alert({ variant }), classMap.toast({ variant }))
  // A descendant rule (`[&_p]:leading-relaxed`) is applied by the descendant as its own class,
  // and a data-attribute class (`data-[state=open]:bg-x`) by its element, without the variant.
  return [
    ...new Set(
      strings
        .flatMap((value) => value.split(/\s+/))
        .filter(Boolean)
        .map((cls) => descendantRule(cls)?.cls ?? cls)
        .map((cls) => stateRule(cls)?.cls ?? cls),
    ),
  ]
})()

describe('the preset', () => {
  it('names every colour token of base.css, as a variable a theme can change', () => {
    const preset = compile.loadPreset('ios')
    const colors = preset.theme.extend.colors
    // Each token is a function of the opacity; the default palette's colours are plain values.
    expect(Object.keys(colors).filter((name) => typeof colors[name] === 'function')).toEqual(
      colorTokens.map((token) => token.name),
    )
    expect(colors['surface-container']({})).toBe('var(--color-surface-container)')
    expect(colors.primary({ opacityValue: '0.25' })).toBe('rgb(var(--color-primary-rgb) / 0.25)')
    expect(preset.darkMode).toBe('class')
  })

  it('carries the light defaults of base.css on :root', async () => {
    const { css } = await compile.tailwindCss(['bg-background'], 'ios')
    for (const [name, value] of Object.entries(themeVariables()))
      expect(css).toContain(`${name}: ${value}`)
  })

  it('gives classes the web values where Tailwind v3 and v4 differ', async () => {
    const classes = ['rounded-sm', 'shadow-sm', 'border', 'duration-250']
    const { css } = await compile.tailwindCss(classes, 'ios')
    expect(css).toMatch(/\.rounded-sm \{\s*border-radius: 0\.25rem/)
    // NativeWind turns a shadow into react-native's shadow props: v4's, not its own stronger one.
    expect(css).toMatch(
      /\.shadow-sm \{[^}]*--tw-shadow-color: rgb\(0 0 0 \/ 0\.1\)[^}]*-rn-shadow-radius: 3px/,
    )
    const web = await compile.tailwindCss(classes, undefined)
    expect(web.css).toContain(
      '--tw-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    )
    // A bare border is currentColor on Expo web, as in v4 (a device has no preflight:
    // forDevice colours it there).
    expect(web.css).toMatch(/\*,\s*::before,\s*::after \{[^}]*border-color: currentColor/)
    expect(css).toMatch(/\.duration-250 \{\s*transition-duration: 250ms/)
  })

  it("paints the default palette in the web's (v4) colours, on a device and on Expo web", async () => {
    const classes = ['text-gray-400', 'bg-red-500', 'border-slate-900', 'bg-black']
    for (const os of ['ios', undefined]) {
      const { css } = await compile.tailwindCss(classes, os)
      expect(css).toMatch(/\.text-gray-400 \{\s*color: #99a1af/)
      expect(css).toMatch(/\.bg-red-500 \{\s*background-color: #fb2c36/)
      expect(css).toMatch(/\.bg-black \{\s*background-color: #000/)
    }
  })
})

describe('every class the ClassMap returns', () => {
  let device: { css: string; root: unknown }
  let web: { css: string; root: unknown }

  beforeAll(async () => {
    device = await compile.tailwindCss(staticClasses, 'ios')
    web = await compile.tailwindCss(staticClasses, undefined)
  })

  it('has a rule in a device build and in an Expo web build', () => {
    expect(staticClasses.length).toBeGreaterThan(400)
    const onDevice = compile.classesWithRules(device.root)
    const onWeb = compile.classesWithRules(web.root)
    expect(staticClasses.filter((c) => !onDevice.has(c))).toEqual([])
    expect(staticClasses.filter((c) => !onWeb.has(c))).toEqual([])
  })

  it('compiles to a style NativeWind applies on a device', () => {
    const styled = compile.classesWithNativeStyles(device.css)
    expect(staticClasses.filter((c) => !styled.has(c))).toEqual([])
  })
})

describe("what an app's Tailwind scan finds", () => {
  it('names every class the ClassMap returns in a file moleculeContent() lists', () => {
    const packageDir = fileURLToPath(new URL('../..', import.meta.url))
    const globs = compile.loadPreset(undefined).moleculeContent(packageDir)
    const webDir = globs
      .map((glob) => glob.replace(/[\\/]dist[\\/].*$/, ''))
      .find(
        (dir) =>
          JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name ===
          '@molecule/app-ui-tailwind',
      )
    expect(webDir, 'moleculeContent() finds @molecule/app-ui-tailwind').toBeDefined()
    const web = scripts(join(webDir ?? '', 'dist'))
    // This package's dist holds its source's literals and the generated list.
    const own = [
      ...scripts(join(packageDir, 'src')),
      readFileSync(join(packageDir, 'dist/device-classes.cjs'), 'utf8'),
    ]
    const named = new Set([...web, ...own].flatMap(words))
    expect(staticClasses.filter((cls) => !named.has(cls))).toEqual([])
  })

  it("lists every class base.css's @source inline() asks for (classes built at run time)", () => {
    const packageDir = fileURLToPath(new URL('../..', import.meta.url))
    const listed = new Set(
      words(readFileSync(join(packageDir, 'dist/device-classes.cjs'), 'utf8')).map((w) =>
        w.replace(/,$/, ''),
      ),
    )
    const webCss = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.resolve('@molecule/app-ui-tailwind'))),
        '..',
        'base.css',
      ),
      'utf8',
    )
    const wanted = inlineSourceClasses(webCss).flatMap((cls) => forDevice(cls).split(/\s+/))
    expect(wanted).toContain('text-4xl')
    expect(wanted.filter((cls) => cls && !listed.has(cls))).toEqual([])
  })

  it('expands @source inline() patterns as Tailwind 4 does', () => {
    expect(expandBraces('text-{xs,4xl}')).toEqual(['text-xs', 'text-4xl'])
    expect(expandBraces('{w,h}-{0,{1..3}}')).toEqual([
      'w-0',
      'w-1',
      'w-2',
      'w-3',
      'h-0',
      'h-1',
      'h-2',
      'h-3',
    ])
    expect(expandBraces('gap-{0..20..10}')).toEqual(['gap-0', 'gap-10', 'gap-20'])
    expect(
      inlineSourceClasses('@source inline("sm:a-{1,2} b");\n@source not inline("c");'),
    ).toEqual(['b', 'sm:a-1', 'sm:a-2'])
  })

  it('lists a rewritten class no web file names, and nothing a web file names', () => {
    const web = ["export const stack = 'flex flex-col space-y-2 sm:space-x-3 -space-y-1 border'"]
    expect(deviceOnlyClasses(web, forDevice)).toEqual([
      'border-foreground',
      'gap-y-2',
      'sm:gap-x-3',
    ])
    expect(deviceOnlyClasses(["'gap-y-2 space-y-2'"], forDevice)).toEqual([])
  })

  it("lists what a descendant applies from its container's descendant rule", () => {
    const web = ["export const alertDescription = 'text-sm [&_p]:leading-relaxed [&>svg]:top-4'"]
    expect(ruleClasses(web, forDevice, descendantRule)).toEqual(['leading-relaxed'])
  })

  it('lists what an element applies when its data attributes match a class', () => {
    const web = [
      "export const tab = 'px-3 data-[state=active]:bg-background dark:data-[disabled]:opacity-50'",
    ]
    expect(ruleClasses(web, forDevice, stateRule)).toEqual(['!bg-background', 'dark:!opacity-50'])
  })
})
