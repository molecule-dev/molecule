/**
 * The Solid item-list type gate: a Solid port's node prop accepts an accessor item
 * (`() => <Row />`) exactly when its family declares the list in `itemLists`. Node only: it reads
 * the port's own `src/index.ts` with the TypeScript compiler.
 *
 * A Solid consumer writes accessor items only where the prop's type allows them, so the type is
 * what decides how a list may be passed (`NodeItems` from `@molecule/app-solid` for a declared list,
 * `JSX.Element` for every other one). The kit runs a declared list as accessor items and every
 * other list as plain JSX; a prop type that disagrees with the declaration lets a consumer write
 * input the cases never ran (an accessor item in an undeclared list), or refuses input the
 * component documents (accessor rows in a declared one).
 *
 * A list the props type does not have refuses an accessor item too, so it agrees with an undeclared
 * list: such a case passes what only an untyped consumer can (`"children are ignored"`, whose React
 * props type refuses it as well). It disagrees with a declared one.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'

import ts from 'typescript'

import type { UIComponentCases } from '../ui/spec.js'

/** What {@link solidListTypeProblems} reads. */
export interface SolidListTypeInput {
  /** The port's package directory (its `package.json`, `tsconfig.json` and `src/index.ts`). */
  packageDir: string
  /** The case families the port's suite runs. */
  families: readonly UIComponentCases[]
  /**
   * Files that stand in for the disk, by absolute path (the kit's own tests). A path not here is
   * read from the disk.
   */
  files?: Readonly<Record<string, string>>
}

/** The virtual module that gives the gate an accessor item's type, from solid-js alone. */
const LAZY_NODE_FILE = '__conformance_lazy_node__.ts'
const LAZY_NODE_SOURCE =
  "import type { JSX } from 'solid-js'\nexport type ConformanceLazyNode = () => JSX.Element\n"

/**
 * Every list a family's cases pass: `children` when a case or a `children` step passes children,
 * every slot a case or a step fills, and every list the family declares in `itemLists`.
 *
 * @param family - The family.
 * @returns The list names.
 */
export function familyLists(family: UIComponentCases): string[] {
  const lists = new Set<string>()
  for (const c of family.cases) {
    if (c.children !== undefined) lists.add('children')
    for (const slot of Object.keys(c.slots ?? {})) lists.add(slot)
    for (const step of c.interactions ?? []) {
      if (step.type !== 'children') continue
      if (step.children !== undefined) lists.add('children')
      for (const slot of Object.keys(step.slots ?? {})) lists.add(slot)
    }
  }
  for (const list of Object.keys(family.itemLists ?? {})) lists.add(list)
  return [...lists]
}

/**
 * Where a declaration is, for a message: its path in the port (`src/types.ts:34`), or the package
 * that owns it and its path there (`@molecule/app-ui src/types.ts:31`).
 *
 * @param declaration - The declaration.
 * @param packageDir - The port's package directory.
 * @param readFile - Reads a file.
 * @returns The location.
 */
function locate(
  declaration: ts.Declaration | undefined,
  packageDir: string,
  readFile: (path: string) => string | undefined,
): string {
  if (!declaration) return 'unknown location'
  const source = declaration.getSourceFile()
  const line = source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1
  const path = source.fileName
  if (!relative(packageDir, path).startsWith('..')) return `${relative(packageDir, path)}:${line}`
  for (let dir = dirname(path); dir !== dirname(dir); dir = dirname(dir)) {
    const manifest = readFile(join(dir, 'package.json'))
    if (manifest === undefined) continue
    const name = (JSON.parse(manifest) as { name?: string }).name ?? relative(packageDir, dir)
    return `${name} ${relative(dir, path)}:${line}`
  }
  return `${path}:${line}`
}

/**
 * Checks a Solid port's prop types against its families' `itemLists`: for every component of the
 * port's `src/index.ts` that a family covers, and every list its cases pass, the prop must accept
 * an accessor item (`() => JSX.Element`) when the list is declared and refuse one when it is not.
 * `unknown` and `any` accept one. A declared list the props type does not have is a problem too: a
 * typed consumer cannot pass it.
 *
 * @param input - The port's directory and the families its suite runs.
 * @returns One message per prop that disagrees; empty when every one agrees.
 */
export function solidListTypeProblems(input: SolidListTypeInput): string[] {
  const { packageDir, families, files = {} } = input
  const readFile = (path: string): string | undefined =>
    files[path] ?? (existsSync(path) ? readFileSync(path, 'utf8') : undefined)
  const configPath = join(packageDir, 'tsconfig.json')
  const configText = readFile(configPath)
  if (configText === undefined) return [`${packageDir} has no tsconfig.json to read its types with`]
  const configHost: ts.ParseConfigHost = {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    fileExists: (path) => readFile(path) !== undefined,
    readFile,
    // Only the options are used: the program's roots are the index and the virtual module.
    readDirectory: () => [],
  }
  const config = ts.parseJsonConfigFileContent(
    ts.parseConfigFileTextToJson(configPath, configText).config,
    configHost,
    packageDir,
  )
  const options: ts.CompilerOptions = { ...config.options, noEmit: true }
  const index = join(packageDir, 'src', 'index.ts')
  const lazyFile = join(packageDir, 'src', LAZY_NODE_FILE)
  const host = ts.createCompilerHost(options)
  const overlay = { ...files, [lazyFile]: LAZY_NODE_SOURCE }
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (path, language, onError, create) =>
    overlay[path] !== undefined
      ? ts.createSourceFile(path, overlay[path], language)
      : getSourceFile(path, language, onError, create)
  const fileExists = host.fileExists.bind(host)
  host.fileExists = (path) => overlay[path] !== undefined || fileExists(path)
  const hostRead = host.readFile.bind(host)
  host.readFile = (path) => overlay[path] ?? hostRead(path)
  const program = ts.createProgram([index, lazyFile], options, host)
  const checker = program.getTypeChecker()

  const lazySource = program.getSourceFile(lazyFile)
  const lazyAlias = lazySource?.statements.find(ts.isTypeAliasDeclaration)
  const indexSource = program.getSourceFile(index)
  const indexSymbol = indexSource && checker.getSymbolAtLocation(indexSource)
  if (!lazyAlias || !indexSymbol)
    return [`${packageDir}: the compiler could not read src/index.ts or solid-js's JSX types`]
  const lazyNode = checker.getTypeAtLocation(lazyAlias.name)

  const exported = new Map(
    checker.getExportsOfModule(indexSymbol).map((symbol) => [symbol.getName(), symbol]),
  )
  const problems = new Set<string>()
  for (const family of families) {
    const exportSymbol = exported.get(family.component)
    // A component another package exports is checked in that package's suite.
    if (!exportSymbol) continue
    const symbol =
      exportSymbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(exportSymbol)
        : exportSymbol
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0]
    if (!declaration) continue
    const signatures = checker.getTypeOfSymbolAtLocation(symbol, declaration).getCallSignatures()
    for (const signature of signatures) {
      const propsParam = signature.getParameters()[0]
      if (!propsParam) continue
      const propsType = checker.getTypeOfSymbolAtLocation(propsParam, declaration)
      const propsName = checker.typeToString(propsType)
      for (const list of familyLists(family)) {
        const declared = family.itemLists?.[list] !== undefined
        const prop = checker.getPropertyOfType(propsType, list)
        if (!prop) {
          // A prop the type lacks refuses an accessor item, as an undeclared list's must.
          if (declared)
            problems.add(
              `${family.component}.${list} is in itemLists, but ${propsName} has no such prop. Add it, typed NodeItems from @molecule/app-solid.`,
            )
          continue
        }
        const propType = checker.getTypeOfSymbolAtLocation(prop, declaration)
        const accepts = checker.isTypeAssignableTo(lazyNode, propType)
        const where = locate(prop.declarations?.[0], packageDir, readFile)
        const typeText = checker.typeToString(propType)
        if (declared && !accepts)
          problems.add(
            `${family.component}.${list} is in itemLists, but its type (${typeText}, ${where}) refuses a function item. Type it NodeItems from @molecule/app-solid.`,
          )
        else if (!declared && accepts)
          problems.add(
            `${family.component}.${list} accepts a function item (its type is ${typeText}, ${where}), and ${family.component}'s cases do not declare it in itemLists. Type it JSX.Element; for a prop inherited from @molecule/app-ui use WithNodes<${propsName}, '${list}'> from @molecule/app-solid. Declare itemLists.${list} (with the reason) and type it NodeItems only if consumers pass separate items the component counts or places one by one.`,
          )
      }
    }
  }
  return [...problems]
}
