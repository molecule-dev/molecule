/**
 * The Svelte, Vue and Angular examples in a package's JSDoc are what a model copies: the
 * module JSDoc becomes the README `read_package_doc` returns, and every other JSDoc block
 * reaches the editor through the `.d.ts`. An example its own framework cannot compile teaches
 * a bug. On 2026-11-22, 13 of 317 Svelte examples and 3 of 59 Vue examples did not compile.
 * They had an unclosed `<button>`, a `{#snippet}` inside `<script>`, `<tr>` directly in
 * `<table>`, and a `{...}` placeholder. 31 more used Svelte 4's `export let` and `$:`, which
 * fail in a component that also uses runes; every molecule Svelte component uses runes.
 *
 * So each example goes through its framework's own compiler, as a project would compile it:
 * - `svelte`: `svelte/compiler` in runes mode; markup with no `<script>` is compiled as
 *   part of a `lang="ts"` component.
 * - `vue`: `@vue/compiler-sfc` (parse, `compileScript`, `compileTemplate`).
 * - Angular: the `template` of an `@Component` in a `ts` example, and an `html` example in
 *   an Angular package, through `@angular/compiler`'s `parseTemplate`.
 *
 * The compilers check syntax and template structure, not imports or types: an example may
 * name a value it does not define (`thread`, `login`), as a fragment of a real component does.
 *
 * @module
 */
import {
  ImplicitReceiver,
  parseTemplate,
  PropertyRead,
  TmplAstLetDeclaration,
  TmplAstReference,
  TmplAstVariable,
} from '@angular/compiler'
import { compileScript, compileTemplate, parse as parseSfc } from '@vue/compiler-sfc'
import { compile as compileSvelte } from 'svelte/compiler'
import ts from 'typescript'

/** A fenced example a JSDoc block holds. */
const FENCE_OPEN = /^(\s*)```(svelte|vue|ts|typescript|html)\s*$/
const FENCE_CLOSE = /^\s*```\s*$/

/**
 * The fenced examples in a source file's JSDoc blocks, as a reader of the docs sees them: the
 * leading `*` of each line removed, the block's indentation removed, and `*\/` (how JSDoc
 * writes a comment's closer) read as `*\/`'s meaning, `*` then `/`.
 *
 * @param text - The source file.
 * @param fileName - Its name.
 * @returns Each example's language, 1-based line of its opening fence, and code.
 */
export function jsdocExamples(text, fileName) {
  if (!text.includes('```')) return []
  // The parser's comment ranges, before every token: a bare scanner loses its place after a
  // template literal with a substitution and reads the rest of the file as one.
  const source = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const starts = new Set()
  const visit = (node) => {
    for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? [])
      if (range.kind === ts.SyntaxKind.MultiLineCommentTrivia) starts.add(range.pos)
    for (const child of node.getChildren(source)) visit(child)
  }
  visit(source)
  const examples = []
  for (const start of [...starts].sort((a, b) => a - b)) {
    const end = text.indexOf('*/', start + 2)
    const comment = text.slice(start, end + 2)
    if (!comment.startsWith('/**') || !comment.includes('```')) continue
    const firstLine = text.slice(0, start).split('\n').length
    const lines = comment
      .slice(3, -2)
      .split('\n')
      .map((line) =>
        line
          .replace(/^\s*\* ?/, '')
          .split('*\\/')
          .join('*/'),
      )
    for (let i = 0; i < lines.length; i++) {
      const open = FENCE_OPEN.exec(lines[i])
      if (!open) continue
      let j = i + 1
      while (j < lines.length && !FENCE_CLOSE.test(lines[j])) j++
      const body = lines.slice(i + 1, j)
      const indent = Math.min(...body.filter((l) => l.trim()).map((l) => /^ */.exec(l)[0].length))
      examples.push({
        lang: open[2] === 'typescript' ? 'ts' : open[2],
        line: firstLine + i,
        code: body.map((l) => l.slice(Number.isFinite(indent) ? indent : 0)).join('\n'),
        file: fileName,
      })
      i = j
    }
  }
  return examples
}

/**
 * Why Svelte cannot compile an example, if it cannot.
 *
 * @param code - The example.
 * @returns The compiler's message, or null.
 */
function svelteProblem(code) {
  const source = /<script[\s>]/.test(code) ? code : `<script lang="ts"></script>\n${code}`
  try {
    compileSvelte(source, { generate: false, runes: true, filename: 'Example.svelte' })
    return null
  } catch (error) {
    return String(error.message).split('\n')[0]
  }
}

/**
 * Why Vue cannot compile an example, if it cannot.
 *
 * @param code - The example (a single-file component).
 * @returns The compiler's message, or null.
 */
function vueProblem(code) {
  const { descriptor, errors } = parseSfc(code, { filename: 'Example.vue' })
  if (errors.length > 0) return String(errors[0].message ?? errors[0]).split('\n')[0]
  if (!descriptor.template && !descriptor.script && !descriptor.scriptSetup)
    return 'no <template> or <script>: a vue example is a single-file component'
  try {
    if (descriptor.script || descriptor.scriptSetup) compileScript(descriptor, { id: 'example' })
  } catch (error) {
    return String(error.message).split('\n')[0]
  }
  if (descriptor.template) {
    const { errors: templateErrors } = compileTemplate({
      source: descriptor.template.content,
      filename: 'Example.vue',
      id: 'example',
      compilerOptions: { isTS: Boolean(descriptor.scriptSetup?.lang ?? descriptor.script?.lang) },
    })
    if (templateErrors.length > 0) return String(templateErrors[0].message ?? templateErrors[0])
  }
  return null
}

/**
 * Why Angular cannot parse a component template, if it cannot.
 *
 * @param template - The template.
 * @returns The parser's first error, or null.
 */
function angularTemplateProblem(template) {
  const { errors } = parseTemplate(template, 'Example.html', { preserveWhitespaces: false })
  return errors?.length ? String(errors[0].msg ?? errors[0]).split('\n')[0] : null
}

/** Names every Angular template can read without declaring them. */
const ANGULAR_TEMPLATE_GLOBALS = new Set([
  '$any',
  '$event',
  '$implicit',
  '$index',
  '$count',
  '$first',
  '$last',
  '$even',
  '$odd',
])

/** Span fields of the template AST, which hold no expressions. */
const SPAN_FIELD = /(^|[a-z])(s|S)pan$|^i18n$/

/**
 * The names a parsed template reads from its component, and the names it declares itself
 * (`#ref`, `let-x`, `@for (x of …)`, `@if (…; as x)`, `@let x = …`).
 *
 * @param nodes - The template's nodes, from `parseTemplate`.
 * @returns The two sets.
 */
function templateNames(nodes) {
  const reads = new Set()
  const declared = new Set()
  const seen = new Set()
  const walk = (value) => {
    if (Array.isArray(value)) return value.forEach(walk)
    if (!value || typeof value !== 'object' || seen.has(value)) return
    seen.add(value)
    if (value instanceof PropertyRead && value.receiver instanceof ImplicitReceiver)
      reads.add(value.name)
    if (
      value instanceof TmplAstReference ||
      value instanceof TmplAstVariable ||
      value instanceof TmplAstLetDeclaration
    )
      declared.add(value.name)
    for (const [key, field] of Object.entries(value)) if (!SPAN_FIELD.test(key)) walk(field)
  }
  walk(nodes)
  return { reads, declared }
}

/**
 * Why an Angular `ts` example cannot compile, if it cannot: its TypeScript syntax, then the
 * `template` of each `@Component` it declares, then the names that template reads. A
 * template's scope is its class, so a name it reads must be a member of that class (or a
 * constructor parameter property), a name the template declares, or an Angular template
 * global; Angular's template type check refuses any other. A class that `extends` another is
 * not checked for names, since its members are not all in the example.
 *
 * @param code - The example.
 * @returns The first problem, or null (also for a `ts` example with no `@Component`).
 */
function angularComponentProblem(code) {
  if (!/@Component\s*\(/.test(code)) return null
  const source = ts.createSourceFile('example.ts', code, ts.ScriptTarget.Latest, true)
  const syntax = source.parseDiagnostics?.[0]
  if (syntax) return ts.flattenDiagnosticMessageText(syntax.messageText, '\n')
  let problem = null
  const visit = (node) => {
    if (problem) return
    const decorator =
      ts.isClassDeclaration(node) &&
      ts
        .getDecorators(node)
        ?.find(
          (d) =>
            ts.isCallExpression(d.expression) &&
            ts.isIdentifier(d.expression.expression) &&
            d.expression.expression.text === 'Component',
        )
    if (decorator) {
      const config = decorator.expression.arguments[0]
      const template =
        config && ts.isObjectLiteralExpression(config)
          ? config.properties.find(
              (p) => ts.isPropertyAssignment(p) && p.name.getText(source) === 'template',
            )
          : undefined
      const value = template?.initializer
      if (value && (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) {
        problem = angularTemplateProblem(value.text)
        const extendsAnother = node.heritageClauses?.some(
          (clause) => clause.token === ts.SyntaxKind.ExtendsKeyword,
        )
        if (!problem && !extendsAnother) {
          const members = new Set()
          for (const member of node.members) {
            if (member.name) members.add(member.name.getText(source))
            if (ts.isConstructorDeclaration(member))
              for (const parameter of member.parameters)
                if (ts.getModifiers(parameter)?.length) members.add(parameter.name.getText(source))
          }
          const { reads, declared } = templateNames(
            parseTemplate(value.text, 'Example.html', { preserveWhitespaces: false }).nodes,
          )
          const missing = [...reads].filter(
            (name) =>
              !members.has(name) && !declared.has(name) && !ANGULAR_TEMPLATE_GLOBALS.has(name),
          )
          if (missing.length > 0)
            problem = `the template reads ${missing.join(', ')}, which class ${node.name?.text ?? '(anonymous)'} does not declare`
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return problem
}

/**
 * Whether a file belongs to an Angular package (its `html` examples are Angular templates).
 *
 * @param fileName - The file's path.
 * @returns True for a path under a package whose directory names Angular.
 */
const isAngularFile = (fileName) => /(^|\/)[^/]*angular[^/]*\/src\//.test(fileName)

/**
 * Why an example cannot compile, if it cannot.
 *
 * @param example - An example from {@link jsdocExamples}.
 * @returns The compiler's message, or null (also for a language this check does not compile).
 */
export function exampleProblem(example) {
  if (example.lang === 'svelte') return svelteProblem(example.code)
  if (example.lang === 'vue') return vueProblem(example.code)
  if (example.lang === 'ts') return angularComponentProblem(example.code)
  if (example.lang === 'html' && isAngularFile(example.file))
    return angularTemplateProblem(example.code)
  return null
}
