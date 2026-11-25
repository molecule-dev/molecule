/** Read statically named UI-kit bindings and their public component declarations. */
import { dirname, extname, join, relative, resolve } from 'node:path'

import ts from 'typescript'

import { isTestFile, packageNameOf } from '../check-undeclared-imports.mjs'

const sourceExtensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.svelte']
const propertyName = (node) =>
  node && (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) ? node.text : undefined
const literal = (node) => (node && ts.isStringLiteralLike(node) ? node.text : undefined)
const property = (node, name) =>
  node && ts.isObjectLiteralExpression(node)
    ? node.properties.find((p) => ts.isPropertyAssignment(p) && propertyName(p.name) === name)
        ?.initializer
    : undefined

/** Map local identifiers to the actual import and its exported name. */
function importsOf(file) {
  const imports = new Map()
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || statement.importClause?.isTypeOnly) continue
    const specifier = literal(statement.moduleSpecifier)
    if (!specifier) continue
    const { name, namedBindings } = statement.importClause ?? {}
    if (name) imports.set(name.text, { specifier, name: 'default' })
    if (namedBindings && ts.isNamespaceImport(namedBindings))
      imports.set(namedBindings.name.text, { specifier, name: '*' })
    if (namedBindings && ts.isNamedImports(namedBindings))
      for (const entry of namedBindings.elements)
        if (!entry.isTypeOnly)
          imports.set(entry.name.text, {
            specifier,
            name: (entry.propertyName ?? entry.name).text,
          })
  }
  return (local) => {
    const [base, member, ...nested] = local.split('.')
    const entry = imports.get(base)
    if (!entry || nested.length || (entry.name === '*') !== Boolean(member)) return undefined
    return member ? { specifier: entry.specifier, name: member } : entry
  }
}

const accessName = (node) => {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression))
    return `${node.expression.text}.${node.name.text}`
  return ''
}

/** Resolve a local const initializer in the surrounding statement lists. */
function localInitializer(node) {
  for (let scope = node.parent; scope; scope = scope.parent) {
    if (
      ts.isFunctionLike(scope) &&
      scope.parameters.some((param) => propertyName(param.name) === node.text)
    )
      return undefined
    if (!ts.isBlock(scope) && !ts.isSourceFile(scope)) continue
    for (const statement of scope.statements) {
      if (!ts.isVariableStatement(statement)) continue
      const list = statement.declarationList
      const declaration = list.declarations.find((entry) => propertyName(entry.name) === node.text)
      if (declaration)
        return list.flags & ts.NodeFlags.Const && declaration.end <= node.pos
          ? declaration.initializer
          : undefined
    }
  }
  return undefined
}

/**
 * Take explicit keys from object literals, local const objects and their spreads.
 * @yields {[string, number]} A property name and its source offset.
 */
function* objectKeys(node) {
  if (!node) return
  const object = ts.skipOuterExpressions(node)
  if (ts.isIdentifier(object)) {
    yield* objectKeys(localInitializer(object))
    return
  }
  if (!ts.isObjectLiteralExpression(object)) return
  for (const entry of object.properties) {
    if (ts.isSpreadAssignment(entry)) yield* objectKeys(entry.expression)
    else if (entry.name) {
      const name = ts.isComputedPropertyName(entry.name)
        ? literal(entry.name.expression)
        : propertyName(entry.name)
      if (name) yield [name, entry.name.getStart()]
    }
  }
}

/**
 * Read explicitly named keys in a Svelte spread of an object literal.
 * @yields {[string, number]} A property name and its source offset.
 */
function* svelteObjectKeys(node) {
  if (node?.type !== 'ObjectExpression') return
  for (const item of node.properties) {
    if (item.type === 'SpreadElement') yield* svelteObjectKeys(item.argument)
    else if (!item.computed && item.key.type === 'Identifier') yield [item.key.name, item.key.start]
    else if (typeof item.key.value === 'string') yield [item.key.value, item.key.start]
  }
}

const referenceKey = ({ specifier, name }) => `${specifier}:${name}`
const useKey = ({ refs, prop, selector }) =>
  JSON.stringify([refs.map(referenceKey).sort(), prop, selector?.toString()])

let angularCompiler
let svelteCompiler

/** Fetch only the parsers used by the changed sources. */
async function angularParser() {
  angularCompiler ??= import('@angular/compiler')
  return angularCompiler
}

/** Read Angular metadata from its authored decorators. */
function angularDecorator(node, imports, names) {
  for (const decorator of ts.getDecorators(node) ?? []) {
    const call = decorator.expression
    if (!ts.isCallExpression(call)) continue
    const binding = imports(accessName(call.expression))
    if (binding?.specifier === '@angular/core' && names.includes(binding.name)) return call
  }
  return undefined
}

/** Use Angular's own selectors and binding kinds, including attribute directives. */
function angularUses(angular, metadata, imports, kitRef, file, read, add) {
  const list = property(metadata, 'imports')
  if (!list || !ts.isArrayLiteralExpression(list)) return
  const refs = list.elements.map((node) => kitRef(imports(accessName(node)))).filter(Boolean)
  if (!refs.length) return
  const inline = property(metadata, 'template')
  const url = literal(property(metadata, 'templateUrl'))
  const external = url && resolve(dirname(file.fileName), url)
  const target = external ? read(external) : undefined
  const text =
    target ?? (literal(inline) !== undefined ? inline.getText(file).slice(1, -1) : undefined)
  if (text === undefined) return
  const source =
    target === undefined ? file : ts.createSourceFile(external, target, ts.ScriptTarget.Latest)
  const offset = target === undefined ? inline.getStart(file) + 1 : 0
  const { nodes } = angular.parseTemplate(text, source.fileName, {
    escapedString: target === undefined,
  })
  const visit = new angular.TmplAstRecursiveVisitor()
  const visitElement = visit.visitElement.bind(visit)
  const visitTemplate = visit.visitTemplate.bind(visit)
  const bindings = (node) => {
    const selector = angular.createCssSelectorFromNode(node)
    for (const binding of node.inputs) {
      // Literal attributes and attr.* bindings can reach the DOM without a declared input.
      if (![angular.BindingType.Property, angular.BindingType.TwoWay].includes(binding.type))
        continue
      add(
        source,
        binding.name,
        offset + (binding.keySpan ?? binding.sourceSpan).start.offset,
        refs,
        selector,
      )
    }
  }
  visit.visitElement = (node) => {
    bindings(node)
    visitElement(node)
  }
  visit.visitTemplate = (node) => {
    bindings(node)
    visitTemplate(node)
  }
  angular.tmplAstVisitAll(visit, nodes)
}

/** Read the component use sites in one TypeScript or Svelte source. */
async function usesInFile(file, text, read, peers) {
  if (!text?.includes('@molecule/app-ui-')) return []
  const uses = []
  const kitRef = (ref) => (ref && peers.has(packageNameOf(ref.specifier)) ? ref : undefined)
  const add = (source, prop, start, refs, selector) => {
    const { line, character } = source.getLineAndCharacterOfPosition(start)
    uses.push({
      file: source.fileName,
      line: line + 1,
      column: character + 1,
      start,
      prop,
      refs,
      selector,
    })
  }
  const addKeys = (source, ref, keys) => {
    for (const [prop, start] of keys) add(source, prop, start, [ref])
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  if (extname(file) === '.svelte') {
    svelteCompiler ??= import('svelte/compiler')
    const { parse } = await svelteCompiler
    const parsed = parse(text, { filename: file, modern: true })
    const scripts = [parsed.module?.content, parsed.instance?.content]
      .filter(Boolean)
      .map((script) => text.slice(script.start, script.end))
    const imports = importsOf(
      ts.createSourceFile(`${file}.ts`, scripts.join('\n'), ts.ScriptTarget.Latest),
    )
    const visit = (node) => {
      if (!node || typeof node !== 'object') return
      const name =
        node.type === 'Component'
          ? node.name
          : node.type === 'SvelteComponent' && node.expression.type === 'Identifier'
            ? node.expression.name
            : undefined
      if (name) {
        const ref = kitRef(imports(name))
        if (ref)
          for (const attr of node.attributes) {
            if (attr.type === 'Attribute') add(source, attr.name, attr.start, [ref])
            if (attr.type === 'BindDirective')
              add(source, attr.name, attr.start + 'bind:'.length, [ref])
            if (attr.type === 'SpreadAttribute')
              addKeys(source, ref, svelteObjectKeys(attr.expression))
          }
      }
      for (const [key, value] of Object.entries(node))
        if (key !== 'expression' && key !== 'attributes') visit(value)
    }
    visit(parsed.fragment)
    return uses
  }

  const imports = importsOf(source)
  const angular =
    peers.has('@molecule/app-ui-angular') && text.includes('@angular/core')
      ? await angularParser()
      : undefined
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const ref = kitRef(imports(accessName(node.tagName)))
      if (ref)
        for (const attr of node.attributes.properties) {
          if (ts.isJsxAttribute(attr))
            add(source, attr.name.getText(source), attr.name.getStart(source), [ref])
          else addKeys(source, ref, objectKeys(attr.expression))
        }
    }
    if (ts.isCallExpression(node) && node.arguments.length >= 2) {
      const call = imports(accessName(node.expression))
      if (
        (call?.specifier === 'vue' && ['h', 'createVNode'].includes(call.name)) ||
        (call?.specifier === 'react' && call.name === 'createElement')
      ) {
        const ref = kitRef(imports(accessName(node.arguments[0])))
        if (ref) addKeys(source, ref, objectKeys(node.arguments[1]))
      }
    }
    if (angular && ts.isClassDeclaration(node)) {
      const component = angularDecorator(node, imports, ['Component'])
      if (component)
        angularUses(angular, component.arguments[0], imports, kitRef, source, read, add)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return uses
}

/** A TypeScript source with only trailing comments or whitespace changed has the same uses. */
function sameSource(file, previous, current) {
  if (previous === current) return true
  if (previous === undefined || file.endsWith('.svelte')) return false
  const [shorter, longer] =
    previous.length > current.length ? [current, previous] : [previous, current]
  if (!longer.startsWith(shorter)) return false
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    undefined,
    longer.slice(shorter.length),
  )
  return scanner.scan() === ts.SyntaxKind.EndOfFileToken
}

/** Collect changed bindings, or all bindings when explicitly scanning a package. */
export async function collectPropUses(root, dir, peers, changed, before) {
  const src = join(dir, 'src')
  const manifest = relative(root, join(dir, 'package.json'))
  const touched = changed?.filter((path) => path.startsWith(`${relative(root, src)}/`))
  const wholePackage =
    !changed ||
    changed.includes(manifest) ||
    changed.some(
      (path) =>
        dirname(path) === dirname(manifest) &&
        /^tsconfig.*\.json$/.test(path.slice(path.lastIndexOf('/') + 1)),
    )
  const externalTemplate =
    peers.has('@molecule/app-ui-angular') && touched?.some((path) => extname(path) === '.html')
  const files =
    wholePackage || externalTemplate
      ? ts.sys.readDirectory(src, sourceExtensions)
      : touched
          .map((path) => join(root, path))
          .filter((file) => sourceExtensions.includes(extname(file)))
  const uses = []
  const withinPackage = (read) => (file) => (file.startsWith(`${dir}/`) ? read(file) : undefined)
  const read = withinPackage(ts.sys.readFile)
  const readBefore = !wholePackage && before ? withinPackage(before) : undefined
  for (const file of files) {
    const shipped = relative(src, file).replace(/\.([cm]?)js(x?)$/, '.$1ts$2')
    if (isTestFile(shipped)) continue
    const text = read(file)
    if (!text?.includes('@molecule/app-ui-')) continue
    const previousText = readBefore?.(file)
    if (readBefore && !externalTemplate && sameSource(file, previousText, text)) continue
    const current = await usesInFile(file, text, read, peers)
    if (!current.length) continue
    const previous = new Map()
    if (readBefore) {
      for (const use of await usesInFile(file, previousText, readBefore, peers)) {
        const key = useKey(use)
        previous.set(key, (previous.get(key) ?? 0) + 1)
      }
    }
    for (const use of current) {
      const key = useKey(use)
      const count = previous.get(key) ?? 0
      if (count) previous.set(key, count - 1)
      else uses.push(use)
    }
  }
  return uses
}

const typeOf = (checker, symbol) => checker.getTypeOfSymbol(symbol)
const stringType = (type) => (type?.isStringLiteral() ? type.value : undefined)

/** Read the published Angular input aliases and their authored equivalents. */
function angularDeclaration(checker, type, symbol) {
  const declaration = symbol.valueDeclaration
  const field = ['ɵcmp', 'ɵdir']
    .map((name) => type.getProperty(name)?.valueDeclaration)
    .find((member) => member && member.parent === declaration)
  const definition = field?.type
  const metadata =
    definition && ts.isTypeReferenceNode(definition) ? definition.typeArguments : undefined
  const inputs = new Set()
  let selector
  if (metadata?.[3]) {
    selector = stringType(checker.getTypeAtLocation(metadata[1]))
    for (const input of checker.getPropertiesOfType(checker.getTypeAtLocation(metadata[3]))) {
      const value = typeOf(checker, input)
      const alias = value.getProperty('alias')
      inputs.add(stringType(alias ? typeOf(checker, alias) : value) ?? input.name)
    }
  } else if (declaration && ts.isClassDeclaration(declaration)) {
    const imports = importsOf(declaration.getSourceFile())
    const decorator = angularDecorator(declaration, imports, ['Component', 'Directive'])
    const config = decorator?.arguments[0]
    selector = literal(property(config, 'selector'))
    const configured = property(config, 'inputs')
    if (configured && ts.isArrayLiteralExpression(configured))
      for (const item of configured.elements) {
        const alias =
          literal(item)?.split(':').at(-1).trim() ??
          literal(property(item, 'alias')) ??
          literal(property(item, 'name'))
        if (alias) inputs.add(alias)
      }
    for (const member of declaration.members) {
      const name = propertyName(member.name)
      if (!name) continue
      const input = angularDecorator(member, imports, ['Input'])
      const initializer = member.initializer
      if (input)
        inputs.add(
          literal(input.arguments[0]) ?? literal(property(input.arguments[0], 'alias')) ?? name,
        )
      else if (initializer && ts.isCallExpression(initializer)) {
        const callee = initializer.expression
        const required = ts.isPropertyAccessExpression(callee) && callee.name.text === 'required'
        const signal = imports(accessName(required ? callee.expression : callee))
        if (signal?.specifier === '@angular/core' && ['input', 'model'].includes(signal.name))
          inputs.add(literal(property(initializer.arguments[required ? 0 : 1], 'alias')) ?? name)
      }
    }
  }
  const instance = checker.getDeclaredTypeOfSymbol(symbol)
  for (const base of instance.getBaseTypes() ?? []) {
    const parent = base.getSymbol()
    if (parent)
      for (const input of angularDeclaration(checker, typeOf(checker, parent), parent).inputs)
        inputs.add(input)
  }
  return { selector, inputs }
}

/** Resolve the props type through the framework's component signature. */
function propTypes(checker, framework, type) {
  if (type.isUnionOrIntersection())
    return type.types.flatMap((part) => propTypes(checker, framework, part))
  const props = []
  const parameter = framework === 'svelte' ? 1 : 0
  for (const call of type.getCallSignatures()) {
    const symbol = call.getParameters()[parameter]
    if (symbol) props.push(typeOf(checker, symbol))
  }
  const field = { vue: '$props', svelte: '$$prop_def' }[framework] ?? 'props'
  for (const constructor of type.getConstructSignatures()) {
    const symbol = constructor.getReturnType().getProperty(field)
    if (symbol) props.push(typeOf(checker, symbol))
  }
  return props
}

/** Store just the named prop results so the compiler for a peer can be released. */
export async function componentDeclarations(program, probe, framework, wanted) {
  const file = program.getSourceFile(probe)
  const checker = program.getTypeChecker()
  const module = checker.getSymbolAtLocation(file.statements[0].moduleSpecifier)
  const found = new Map()
  const angular = framework === 'angular' ? await angularParser() : undefined
  if (!module) return found
  for (const item of checker.getExportsOfModule(module)) {
    const props = wanted.get(item.name)
    if (!props) continue
    const symbol = item.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(item) : item
    const type = typeOf(checker, symbol)
    if (angular) {
      const { selector, inputs } = angularDeclaration(checker, type, symbol)
      if (selector) {
        const matcher = new angular.SelectorMatcher()
        matcher.addSelectables(angular.CssSelector.parse(selector))
        found.set(item.name, {
          declares: inputs,
          accepts: inputs,
          matches: (css) => matcher.match(css, () => {}),
        })
      }
    } else {
      const signatures = propTypes(checker, framework, type).filter(
        (part) => !(part.flags & ts.TypeFlags.AnyOrUnknown),
      )
      if (!signatures.length) continue
      const keys = new Set(
        signatures.flatMap((part) =>
          checker
            .getAllPossiblePropertiesOfTypes(part.isUnion() ? part.types : [part])
            .map((prop) => prop.name),
        ),
      )
      const indexes = signatures.flatMap((part) => checker.getIndexInfosOfType(part))
      const accepts = new Set(
        [...props].filter(
          (prop) =>
            keys.has(prop) ||
            indexes.some(({ keyType }) =>
              checker.isTypeAssignableTo(checker.getStringLiteralType(prop), keyType),
            ),
        ),
      )
      found.set(item.name, { declares: keys, accepts })
    }
  }
  return found
}
