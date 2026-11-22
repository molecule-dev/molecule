/** Native ESLint feedback for registry icon classes, independent of any supplied tests. */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { ESLint, Linter } from 'eslint'
import { afterEach, describe, expect, it } from 'vitest'

import { iconFonts } from '../registry-snapshot.mjs'
import { type LintProject, lintProject } from './project.js'

const ruleId = 'molecule-local/require-icon-font-setup'
const projects: LintProject[] = []
const icon =
  '<i className="ion-trash-a" role="button" tabIndex={0} aria-label="Remove equipment" onClick={act} onKeyDown={act} />'
const component = (markup = icon): string =>
  `export function Control({ act }: { act: () => void }) {\n  return ${markup}\n}\n`
const bond = `import { setFont } from '@molecule/app-fonts'\nimport { font } from '@molecule/app-fonts-ionicons'\nsetFont(font)\n`

afterEach(async () => {
  await Promise.all(projects.splice(0).map((project) => project.remove()))
})

/** A Vite app whose entry imports the control; `files` adds or replaces files. */
async function fixture(
  files: Record<string, string> = {},
): Promise<{ root: string; engine: ESLint }> {
  const project = await lintProject(
    { type: 'module' },
    {
      'index.html': '<script type="module" src="/src/main.tsx"></script>',
      'src/main.tsx': "import './Control.js'\n",
      'src/Control.tsx': component(),
      ...files,
    },
  )
  projects.push(project)
  return { root: project.root, engine: project.engine }
}

async function messages(
  files: Record<string, string> = {},
  source = component(),
): Promise<Linter.LintMessage[]> {
  const { root, engine } = await fixture(files)
  const [result] = await engine.lintText(source, { filePath: join(root, 'src/Control.tsx') })
  expect(result.messages.filter((row) => row.fatal)).toEqual([])
  return result.messages.filter(
    (row) =>
      row.ruleId === ruleId ||
      (row.ruleId === 'molecule-local/no-empty-interactive-target' && row.messageId === 'font'),
  )
}

describe('registry icon fonts in the lint contract', () => {
  it.each([
    ['l3175-Editor.tsx.txt', 'ion-close-round'],
    ['l3175-ArticlePage.tsx.txt', 'ion-trash-a'],
    ['l3176-Editor.tsx.txt', 'ion-close-round'],
    ['l3176-Article.tsx.txt', 'ion-trash-a'],
  ])('rejects the retained P415 missing font in %s', async (name, glyph) => {
    const source = await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
    const rows = await messages({}, source)
    expect(rows.some((row) => row.messageId === 'font' && row.message.includes(`'${glyph}'`))).toBe(
      true,
    )
    expect(rows.every((row) => row.severity === 2)).toBe(true)
    expect(await messages({ 'src/main.tsx': bond }, source)).toEqual([])
  })

  it('does not let an empty-target exception hide a missing icon font', async () => {
    const source = `export function Control({ act }) {
      return <span>
        {/* eslint-disable-next-line molecule-local/no-empty-interactive-target -- target geometry is supplied by the theme */}
        <i className="ion-trash-a" role="button" onClick={act} />
      </span>
    }`
    const rows = await messages({}, source)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ severity: 2, messageId: 'font', line: 4 })
    expect(await messages({ 'src/main.tsx': bond }, source)).toEqual([])
  })

  it('does not count a font setter inside an uncalled imported setup function', async () => {
    const files = {
      'src/main.tsx': "import './bonds/index.js'",
      'src/bonds/index.ts':
        "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; export function setupIcons() { setFont(font) }",
    }
    const rows = await messages(files)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ messageId: 'font', severity: 2 })
    expect(
      await messages({
        ...files,
        'src/main.tsx': "import { setupIcons } from './bonds/index.js'; setupIcons()",
      }),
    ).toEqual([])
  })

  it('does not count an uncalled local or event-only font setup', async () => {
    const files = {
      'src/main.tsx':
        "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; const setup = () => setFont(font); export const App = () => <button onClick={setup}>Enable icons</button>",
    }
    expect(await messages(files)).toHaveLength(1)
    expect(
      await messages({ ...files, 'src/main.tsx': files['src/main.tsx'] + '; setup()' }),
    ).toEqual([])
  })

  it('follows a called setup through a relative re-export and a local alias', async () => {
    expect(
      await messages({
        'src/main.tsx': "import { setup } from './bonds/index.js'; const boot = setup; boot()",
        'src/bonds/index.ts': "export { setupIcons as setup } from './icons.js'",
        'src/bonds/icons.ts':
          "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; export const setupIcons = () => setFont(font)",
      }),
    ).toEqual([])
  })

  it('follows an invoked default-exported setup and an immediately invoked wrapper', async () => {
    expect(
      await messages({
        'src/main.tsx': "import setup from './bonds/icons.js'; (() => setup())()",
        'src/bonds/icons.ts':
          "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; export default function setup() { setFont(font) }",
      }),
    ).toEqual([])
  })

  it('does not count a generator body when startup only creates its iterator', async () => {
    const source =
      "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; function* setup() { setFont(font) }; setup()"
    expect(await messages({ 'src/main.tsx': source })).toHaveLength(1)
    expect(
      await messages({ 'src/main.tsx': source.replace('function* setup', 'function setup') }),
    ).toEqual([])
  })

  it.each([
    'const real = () => setFont(font); let setup = real; setup = () => {}; setup()',
    'function setup() { setFont(font) }; setup = () => {}; setup()',
  ])('does not follow a replaced setup initializer: %s', async (body) => {
    const imports =
      "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; "
    expect(await messages({ 'src/main.tsx': imports + body })).toHaveLength(1)
    expect(
      await messages({ 'src/main.tsx': imports + body.replace('setup = () => {}; ', '') }),
    ).toEqual([])
  })

  it('keeps an immutable function alias captured before a later reassignment', async () => {
    expect(
      await messages({
        'src/main.tsx':
          "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; let setup = () => setFont(font); const boot = setup; setup = () => {}; boot()",
      }),
    ).toEqual([])
  })

  it.each([
    'export function setup() { setFont(font) }; setup = () => {}',
    'export let setup = () => setFont(font); setup = () => {}',
  ])(
    'does not follow an exported setup replaced during module initialization: %s',
    async (body) => {
      expect(
        await messages({
          'src/main.tsx': "import { setup } from './bonds/icons.js'; setup()",
          'src/bonds/icons.ts':
            "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; " +
            body,
        }),
      ).toHaveLength(1)
    },
  )

  it('distinguishes a replaced default function from a captured default expression', async () => {
    const imports =
      "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; "
    const main = "import setup from './bonds/icons.js'; setup()"
    expect(
      await messages({
        'src/main.tsx': main,
        'src/bonds/icons.ts':
          imports + 'export default function setup() { setFont(font) }; setup = () => {}',
      }),
    ).toHaveLength(1)
    expect(
      await messages({
        'src/main.tsx': main,
        'src/bonds/icons.ts':
          imports + 'let setup = () => setFont(font); export default setup; setup = () => {}',
      }),
    ).toEqual([])
  })

  it('names the missing provider and exact bond at the icon class source line', async () => {
    const rows = await messages()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ line: 2, severity: 2, messageId: 'font' })
    expect(rows[0].message).toContain('@molecule/app-fonts-ionicons')
    expect(rows[0].message).toContain("{ setFont } from '@molecule/app-fonts'")
    expect(rows[0].message).toContain("{ font } from '@molecule/app-fonts-ionicons'")
    expect(rows[0].message).toContain('setFont(font)')
    expect(rows[0].message).toContain('src/bonds/index.ts')
  })

  it.each([
    '<button onClick={act}><i className="ion-trash-a" aria-hidden="true" />Remove equipment</button>',
    '<span className={"ion-heart"} />',
  ])('checks empty decorative and nested icons too: %s', async (markup) => {
    const rows = await messages({}, component(markup))
    expect(rows).toHaveLength(1)
    expect(rows[0].messageId).toBe('font')
  })

  it.each([
    '<span className={`material-symbols-outlined`}>inventory_2</span>',
    '<i className="ion-trash-a" role="button" onClick={act}>Remove equipment</i>',
  ])('accepts visible text when an icon class has no font: %s', async (markup) => {
    expect(await messages({}, component(markup))).toEqual([])
  })

  it('accepts a directly bonded font and its glyph-only click target', async () => {
    expect(await messages({ 'src/main.tsx': bond + "import './Control.js'\n" })).toEqual([])
  })

  it('follows the app entry through its bond setup and import aliases', async () => {
    expect(
      await messages({
        'src/main.tsx': "import { setupProviders } from './bonds/index.js'; setupProviders()",
        'src/bonds/index.ts':
          "import { setupIcons } from './icons.js'; export function setupProviders() { setupIcons() }",
        'src/bonds/icons.ts':
          "import { setFont as wire } from '@molecule/app-fonts'; import { font as icons } from '@molecule/app-fonts-ionicons'; export function setupIcons() { wire(icons) }",
      }),
    ).toEqual([])
  })

  it('accepts namespace imports of the setter and provider', async () => {
    expect(
      await messages({
        'src/main.tsx':
          "import * as fonts from '@molecule/app-fonts'; import * as icons from '@molecule/app-fonts-ionicons'; fonts.setFont(icons.font)",
      }),
    ).toEqual([])
  })

  it.each<Record<string, string>>([
    { 'src/unused.ts': bond },
    { 'src/main.tsx': "import { font } from '@molecule/app-fonts-ionicons'; console.log(font)" },
    { 'src/main.tsx': '// ' + bond.replaceAll('\n', '\n// ') },
    {
      'src/main.tsx':
        "import { font } from '@molecule/app-fonts-ionicons'; function setFont(value: unknown) { return value }; setFont(font)",
    },
    {
      'src/main.tsx':
        "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-material-symbols'; setFont(font)",
    },
    {
      'src/main.tsx':
        "import { setFont } from '@molecule/app-fonts'; import { font } from '@molecule/app-fonts-ionicons'; function pretend(setFont: (value: unknown) => void) { setFont(font) }",
    },
  ])('does not count an unused, absent, shadowed or wrong font setup: %j', async (files) => {
    const rows = await messages(files)
    expect(rows).toHaveLength(1)
    expect(rows[0].messageId).toBe('font')
  })

  it('accepts an imported project-owned font face and glyph stylesheet', async () => {
    expect(
      await messages({
        'src/main.tsx': "import './icons.css'",
        'src/icons.css':
          '@font-face { font-family: "Ionicons"; src: url("/equipment.woff") } .ion-trash-a::before { font-family: "Ionicons"; content: "\\f252" }',
      }),
    ).toEqual([])
  })

  it('accepts a project-owned replacement font family for the same class', async () => {
    expect(
      await messages({
        'src/main.tsx': "import './icons.css'",
        'src/icons.css':
          '@font-face { font-family: EquipmentIcons; src: url("/equipment.woff") } .ion-trash-a::before { font-family: EquipmentIcons; content: "\\e001" }',
      }),
    ).toEqual([])
  })

  it('accepts a project stylesheet that draws its own ordinary glyph', async () => {
    expect(
      await messages({
        'src/main.tsx': "import './icons.css'",
        'src/icons.css': '.ion-trash-a::before { content: "×" }',
      }),
    ).toEqual([])
  })

  it('does not let box-only styling or an unloaded private-use glyph replace the font', async () => {
    const rows = await messages({
      'src/main.tsx': "import './icons.css'",
      'src/icons.css':
        '.ion-trash-a { display: inline-block; width: 20px; height: 20px } .ion-trash-a::before { content: "\\f252" }',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].messageId).toBe('font')
  })

  it('also checks the JSX class attribute used by other frameworks', async () => {
    const rows = await messages({}, component('<span class="ion-heart" />'))
    expect(rows).toHaveLength(1)
    expect(rows[0].messageId).toBe('font')
  })

  it('follows a public stylesheet linked by the shell and its CSS imports', async () => {
    expect(
      await messages({
        'index.html': '<link rel="stylesheet" href="/icons.css">',
        'public/icons.css': '@import "./glyphs.css";',
        'public/glyphs.css':
          '@font-face { font-family: Ionicons; src: url("/equipment.woff") } .ion-trash-a::before { font-family: Ionicons; content: "\\f252" }',
      }),
    ).toEqual([])
  })

  it('does not treat unused or commented font CSS as loaded', async () => {
    const rows = await messages({
      'src/unused.css': '@font-face { font-family: Ionicons; src: url("/equipment.woff") }',
      'src/main.tsx': "import './comments.css'",
      'src/comments.css': '/* @font-face { font-family: Ionicons; src: url("/equipment.woff") } */',
    })
    expect(rows).toHaveLength(1)
    expect(rows[0].messageId).toBe('font')
  })

  it.each(['ionic-panel', 'ionization', 'ion-trash-a-extra', 'unknown-icons-trash'])(
    'leaves unrelated classes alone: %s',
    async (className) => {
      expect(
        await messages(
          {},
          component(
            `<button onClick={act}><i className="${className}" />Remove equipment</button>`,
          ),
        ),
      ).toEqual([])
    },
  )

  it('reads selectors from the registry snapshot, never package names or class-prefix guesses', async () => {
    const { root, engine } = await fixture()
    const config = await engine.calculateConfigForFile(join(root, 'src/Control.tsx'))
    const options = (
      config.rules[ruleId] as [number, { iconFonts: { package: string; classes: string }[] }]
    )[1]
    expect(options).toBeDefined()
    const providers = options.iconFonts
    expect(providers.map((provider) => provider.package).sort()).toEqual(
      iconFonts.map((font) => font.package).sort(),
    )
    expect(
      providers.find((provider) => provider.package.endsWith('-ionicons'))?.classes.split(' '),
    ).toContain('ion-trash-a')
  })
})
