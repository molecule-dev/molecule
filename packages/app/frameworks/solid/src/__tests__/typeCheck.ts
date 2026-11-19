/**
 * Compiles a probe as a file of this package, for the tests that pin the types an
 * API gives its callers with the TypeScript API.
 *
 * A probe is a whole module: compiling one means parsing the type graph it
 * imports (this package's sources and the `@molecule/*` declarations behind
 * them). A test file that compiled every probe from scratch therefore paid that
 * cost once per assertion, which is minutes per file on a shared, loaded machine
 * and turned these tests into timeouts. A checker made by {@link createTypeCheck}
 * keeps its compiler host and hands the previous program to the next one, so an
 * unchanged dependency keeps its parsed `SourceFile` and only the probe itself is
 * re-parsed. The diagnostics each call returns are the same as a fresh program's.
 *
 * One program still reads a few hundred files, so a shared, loaded machine can
 * stretch a few seconds of CPU into a minute of wall time; callers give each
 * probe a load-tolerant timeout (240 s) rather than a tight second-scale one.
 *
 * @module
 */

import { join } from 'node:path'

import ts from 'typescript'

/** Where and how one probe is compiled. */
export interface TypeCheckSettings {
  /** The syntax of the probe source: plain TypeScript, or TSX for JSX probes. */
  scriptKind?: ts.ScriptKind
  /** The compiler options to use; this package's own `tsconfig.json` when omitted. */
  compilerOptions?: ts.CompilerOptions
  /** Keep only the probe file's diagnostics, dropping any reported in a dependency. */
  probeOnly?: boolean
}

/**
 * Compiles one probe source and returns its diagnostic messages.
 *
 * @param source - The probe's TypeScript source.
 * @returns The diagnostic messages, flattened to plain text.
 */
export type TypeCheck = (source: string) => string[]

/**
 * This package's compiler options, read once from its own tsconfig.
 *
 * @returns The parsed options, with emit turned off.
 */
function packageCompilerOptions(): ts.CompilerOptions {
  const configPath = join(import.meta.dirname, '..', '..', 'tsconfig.json')
  const parsed = ts.getParsedCommandLineOfConfigFile(
    configPath,
    { noEmit: true },
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: () => undefined,
    },
  )
  return { ...(parsed?.options ?? {}), noEmit: true }
}

/**
 * Builds a probe compiler for one virtual file path.
 *
 * The returned function may be called any number of times: each call compiles the
 * source it is given and reuses the work the previous call left behind.
 *
 * @param fileName - The absolute path the probe is compiled as; relative imports
 *   in the probe resolve from it.
 * @param settings - Its syntax, compiler options and diagnostic filter.
 * @returns The compiler for that probe path.
 */
export function createTypeCheck(fileName: string, settings: TypeCheckSettings = {}): TypeCheck {
  const scriptKind = settings.scriptKind ?? ts.ScriptKind.TS
  const options = settings.compilerOptions ?? packageCompilerOptions()
  const probeOnly = settings.probeOnly ?? false
  let source = ''
  let previous: ts.Program | undefined

  // One host for every call: a dependency the previous program already parsed is
  // handed back as the same object, which is what lets the next program reuse it.
  const host = ts.createCompilerHost(options)
  const parsed = new Map<string, ts.SourceFile | undefined>()
  const getSourceFile = host.getSourceFile.bind(host)
  const fileExists = host.fileExists.bind(host)
  const readFile = host.readFile.bind(host)
  host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => {
    // The probe is compiled afresh every call: its source is what changed.
    if (name === fileName)
      return ts.createSourceFile(name, source, languageVersion, true, scriptKind)
    if (parsed.has(name)) return parsed.get(name)
    const file = getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile)
    parsed.set(name, file)
    return file
  }
  host.fileExists = (name) => name === fileName || fileExists(name)
  host.readFile = (name) => (name === fileName ? source : readFile(name))

  return (text: string): string[] => {
    source = text
    const program = ts.createProgram([fileName], options, host, previous)
    previous = program
    return ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => !probeOnly || diagnostic.file?.fileName === fileName)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
  }
}
