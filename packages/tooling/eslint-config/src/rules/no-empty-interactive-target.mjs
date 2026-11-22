/**
 * An accessible name does not draw a click target. Reject statically empty native
 * interactive JSX without content or a visual styling source. Use the framework
 * Icon (a sized SVG), text, or CSS actually imported by the app instead.
 *
 * This is a source check, not a CSS layout engine: dynamic children/classes/styles,
 * spread props and custom components are left to browser tests. Remote stylesheets
 * cannot certify a literal class locally; a narrow, reasoned ESLint disable can
 * document runtime styling that has been verified in the browser.
 * Native control boxes, SVG graphics and presentational dismissal backdrops are
 * outside the geometry check; their dimensions/content are supplied by the browser or
 * drawing attributes. A native button's box still cannot draw an empty icon used
 * as its only content.
 * Local CSS is reached through this module and the nearest workspace's index.html,
 * including module imports, HTML style/link elements and CSS `@import` rules. A matching
 * visual declaration is evidence of styling, not proof of its computed visibility.
 * No project scan, network request or browser is run for ordinary contentful JSX.
 * Registry icon classes also require a reachable call to their font setter or
 * an imported local font stylesheet. The scaffold supplies exact class names
 * from the registry; this rule never infers a family from a prefix or a test.
 *
 * @module
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, extname, join, parse, resolve } from 'node:path'

const ROLES = new Set([
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'scrollbar',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
])
const REPLACED = new Set([
  'button',
  'summary',
  'input',
  'select',
  'textarea',
  'img',
  'svg',
  'rect',
  'ellipse',
  'circle',
  'line',
  'path',
  'polygon',
  'polyline',
  'use',
  'image',
  'canvas',
  'video',
  'audio',
  'iframe',
  'object',
  'embed',
  'hr',
])
const EVENTS =
  /^(?:onClick|onDoubleClick|onPointerDown|onPointerUp|onMouseDown|onMouseUp|onKeyDown|onKeyUp)$/
const STYLE =
  /(?:^|;)\s*(?:content|background(?:-[\w-]+)?|mask(?:-image)?|(?:min-|max-)?(?:width|height|inline-size|block-size)|padding(?:-[\w-]+)?|border(?:-[\w-]+)?)\s*:\s*(?!\s*(?:none|normal|auto|0(?:px|em|rem|%)?|["']{2})\s*(?:;|$))[^;]+/i
const BUTTON_DRAWING =
  /(?:^|;)\s*(?:content|background(?:-image)?|mask(?:-image)?)\s*:\s*(?!\s*(?:none|normal|transparent|["']{2})\s*(?:;|$))[^;]+/i

/** The JSX attribute with this name on an element, if present. */
function attribute(node, name) {
  return node.openingElement.attributes.find(
    (attr) => attr.type === 'JSXAttribute' && attr.name.name === name,
  )
}

/** The element's `className` or `class` attribute, if present. */
function classAttribute(node) {
  return attribute(node, 'className') ?? attribute(node, 'class')
}

/** The static value of an attribute value or expression, with `known: false` when it is computed. */
function literal(node) {
  if (node?.type === 'JSXExpressionContainer') return literal(node.expression)
  if (node?.type === 'Literal') return { known: true, value: node.value }
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0)
    return { known: true, value: node.quasis[0].value.cooked }
  return { known: false }
}

/** The element's intrinsic HTML tag name, or null for a component or custom element. */
function tag(node) {
  const name = node.openingElement.name
  return name.type === 'JSXIdentifier' && /^[a-z]/.test(name.name) && !name.name.includes('-')
    ? name.name
    : null
}

/** Whether the element carries the `hidden` attribute. */
function hidden(node) {
  const attr = attribute(node, 'hidden')
  return attr && (!attr.value || literal(attr.value).value === true)
}

/** Whether the element is a control a user can reach, by tag or role. */
function interactive(node) {
  const name = tag(node)
  const role = literal(attribute(node, 'role')?.value).value
  // Pointer-only dismissal backdrops are presentation, not independently exposed controls.
  if (
    role === 'presentation' ||
    role === 'none' ||
    literal(attribute(node, 'aria-hidden')?.value).value === 'true' ||
    literal(attribute(node, 'aria-hidden')?.value).value === true
  )
    return false
  return (
    name === 'button' ||
    name === 'summary' ||
    (name === 'a' && attribute(node, 'href')) ||
    ROLES.has(role) ||
    node.openingElement.attributes.some(
      (attr) =>
        attr.type === 'JSXAttribute' &&
        EVENTS.test(attr.name.name) &&
        (!literal(attr.value).known || !!literal(attr.value).value),
    )
  )
}

/** A named native button whose only authored content is one literal icon element. */
function soleButtonIcon(node) {
  const classes = classAttribute(node)
  if (
    tag(node) !== 'button' ||
    !attribute(node, 'aria-label') ||
    hidden(node) ||
    !interactive(node) ||
    attribute(node, 'style') ||
    (classes && !literal(classes.value).known) ||
    attribute(node, 'children') ||
    attribute(node, 'dangerouslySetInnerHTML') ||
    node.openingElement.attributes.some((attr) => attr.type === 'JSXSpreadAttribute')
  )
    return null
  const children = node.children.filter((child) =>
    child.type === 'JSXText'
      ? child.value.trim() !== ''
      : child.type !== 'JSXExpressionContainer' || expressionContent(child.expression),
  )
  const [icon] = children
  return children.length === 1 && icon.type === 'JSXElement' && tag(icon) === 'i' ? icon : null
}

/** False only when the expression is statically known to render nothing. */
function expressionContent(node) {
  if (node.type === 'JSXEmptyExpression') return false
  const value = literal(node)
  if (value.known)
    return (
      typeof value.value === 'number' ||
      (typeof value.value === 'string' && value.value.trim() !== '')
    )
  if (node.type === 'ArrayExpression')
    return node.elements.some((item) => item && expressionContent(item))
  return true
}

/** Find the app workspace, without accidentally treating a sibling workspace as its CSS. */
function workspace(filename) {
  let dir = dirname(filename)
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir
    if (dir === parse(dir).root) return dirname(filename)
    dir = dirname(dir)
  }
}

/** Only invoked after a definitely empty interactive subtree is found. */
function loadedStyles(context, providers) {
  const filename = resolve(context.cwd, context.filename)
  const root = workspace(filename)
  const visited = new Set()
  const styles = []
  const fonts = new Set()
  const modules = new Map()
  const called = new Set()
  let unknown = false
  const read = (file) => {
    try {
      return readFileSync(file, 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null
      throw error
    }
  }
  const file = (path) => {
    try {
      return statSync(path).isFile()
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false
      throw error
    }
  }
  const locate = (specifier, from, css = false) => {
    const spec = specifier.replace(/[?#].*$/, '')
    if (/^(?:https?:)?\/\//.test(spec)) return null
    if (!spec.startsWith('.') && !spec.startsWith('/')) {
      if (!css && !/\.(?:css|scss|sass|less)$/.test(spec)) return null
      try {
        const require = createRequire(from)
        const found = require.resolve(spec)
        if (extname(found) === '.css') return found
        // CSS @import uses a package's style entry rather than its JS entry.
        const manifest = JSON.parse(read(require.resolve(`${spec}/package.json`)) ?? '{}')
        return manifest.style
          ? resolve(dirname(require.resolve(`${spec}/package.json`)), manifest.style)
          : null
      } catch (error) {
        if (error.code !== 'MODULE_NOT_FOUND' && error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED')
          throw error
        // Build tools may synthesize package CSS (e.g. a utility-class framework).
        // It cannot prove that an arbitrary literal class in this source exists.
        return null
      }
    }
    const path = spec.startsWith('/') ? resolve(root, `.${spec}`) : resolve(dirname(from), spec)
    const base = path.replace(/\.[cm]?jsx?$/, '')
    const candidates = [
      path,
      ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'].map((ext) => base + ext),
      ...['.ts', '.tsx', '.js', '.jsx'].map((ext) => join(path, 'index' + ext)),
    ]
    return (
      candidates.find(file) ??
      (spec.startsWith('/') ? [resolve(root, 'public', `.${spec}`)].find(file) : null) ??
      null
    )
  }
  const css = (text, from) => {
    const clean = text.replace(/\/\*[\s\S]*?\*\//g, '')
    styles.push(clean)
    for (const match of clean.matchAll(/@import\s+(?:url\(\s*)?(?:["']([^"']+)["']|([^\s;)]+))/g)) {
      const imported = locate(match[1] ?? match[2], from, true)
      if (imported) visit(imported)
    }
  }
  const visit = (path) => {
    if (visited.has(path)) return
    visited.add(path)
    // Data and image imports do not load a stylesheet. Never treat their
    // non-JavaScript syntax as evidence of unknown styling for the whole app.
    if (/\.(?:json|png|jpe?g|gif|webp|avif|ico|svg|woff2?|ttf|eot)$/i.test(path)) return
    const text = path === filename ? context.sourceCode.text : read(path)
    if (text === null) return
    if (extname(path) === '.css') {
      css(text, path)
      return
    }
    if (/\.(?:scss|sass|less)$/.test(path)) {
      unknown = true
      return
    }
    let tree
    let scopeManager
    try {
      if (path === filename) {
        tree = context.sourceCode.ast
        scopeManager = context.sourceCode.scopeManager
      } else {
        const parsed = context.languageOptions.parser.parseForESLint(text, {
          sourceType: 'module',
          ecmaVersion: 'latest',
          ecmaFeatures: { jsx: true },
          filePath: path,
          tsconfigRootDir: root,
        })
        tree = parsed.ast
        scopeManager = parsed.scopeManager
      }
    } catch (_error) {
      // Parse/build diagnostics own unsupported syntax; do not guess its CSS.
      unknown = true
      return
    }
    // ESLint's scope graph distinguishes the actual imports from same-named
    // local functions/parameters. Importing a font alone never injects its CSS.
    const references = new Map()
    for (const scope of scopeManager?.scopes ?? [])
      for (const reference of scope.references)
        references.set(reference.identifier, reference.resolved)
    const imported = (node) => {
      if (node?.type === 'Identifier') {
        const def = references.get(node)?.defs.find((item) => item.type === 'ImportBinding')
        if (!def || def.parent.importKind === 'type' || def.node.importKind === 'type') return null
        return {
          package: def.parent.source.value,
          name:
            def.node.type === 'ImportNamespaceSpecifier'
              ? '*'
              : def.node.type === 'ImportDefaultSpecifier'
                ? 'default'
                : (def.node.imported?.name ?? def.node.imported?.value),
        }
      }
      if (node?.type === 'MemberExpression') {
        const base = imported(node.object)
        const name = node.computed ? literal(node.property).value : node.property.name
        if (base?.name === '*' && typeof name === 'string') return { package: base.package, name }
      }
      return null
    }
    const module = { tree, imported, scopeManager, path }
    modules.set(path, module)
    const binding = (node, owner) => {
      for (const scope of owner.scopeManager?.scopes ?? []) {
        const reference = scope.references.find((item) => item.identifier === node)
        if (reference) return reference.resolved
      }
      return null
    }
    const exportedSetup = (declaration, owner, seen) => {
      const variable = owner.scopeManager?.scopes
        .flatMap((scope) => scope.variables)
        .find((item) => item.defs.some((definition) => definition.node === declaration))
      // An importer runs after this module's initialization. Do not use a stale
      // exported initializer when that initialization can replace the binding.
      if (variable?.references.some((reference) => reference.isWrite() && !reference.init))
        return null
      return callable(declaration.init ?? declaration, owner, seen)
    }
    const exported = (owner, name, seen = new Set()) => {
      const key = `${owner.path}:${name}`
      if (seen.has(key)) return null
      seen.add(key)
      for (const statement of owner.tree.body) {
        if (statement.type === 'ExportDefaultDeclaration' && name === 'default')
          return statement.declaration.type === 'FunctionDeclaration'
            ? exportedSetup(statement.declaration, owner, seen)
            : callable(statement.declaration, owner, seen)
        if (statement.type === 'ExportNamedDeclaration') {
          const declaration = statement.declaration
          if (declaration?.id?.name === name) return exportedSetup(declaration, owner, seen)
          for (const item of declaration?.declarations ?? [])
            if (item.id.name === name) return exportedSetup(item, owner, seen)
          for (const specifier of statement.specifiers ?? []) {
            if ((specifier.exported.name ?? specifier.exported.value) !== name) continue
            if (!statement.source) return callable(specifier.local, owner, seen)
            const target = locate(statement.source.value, owner.path)
            if (target) visit(target)
            const next = modules.get(target)
            if (next) return exported(next, specifier.local.name ?? specifier.local.value, seen)
          }
        }
        if (statement.type === 'ExportAllDeclaration') {
          const target = locate(statement.source.value, owner.path)
          if (target) visit(target)
          const next = modules.get(target)
          const result = next && exported(next, name, seen)
          if (result) return result
        }
      }
      return null
    }
    const callable = (node, owner, seen = new Set()) => {
      if (!node || seen.has(node)) return null
      seen.add(node)
      if (
        ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)
      )
        // Calling a generator creates an iterator without executing its body.
        return node.generator ? null : { node, owner }
      if (['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(node.type))
        return callable(node.expression, owner, seen)
      if (node.type === 'Identifier') {
        const variable = binding(node, owner)
        // A later assignment can replace the function this initializer described.
        // Reads before that assignment still refer to the original function.
        if (
          variable?.references.some(
            (reference) =>
              reference.isWrite() &&
              !reference.init &&
              reference.identifier.range[0] < node.range[0],
          )
        )
          return null
        const definition = variable?.defs[0]
        if (definition?.type === 'FunctionName') return callable(definition.node, owner, seen)
        if (definition?.type === 'Variable') return callable(definition.node.init, owner, seen)
      }
      const source = owner.imported(node)
      if (!source?.package.startsWith('.')) return null
      const target = locate(source.package, owner.path)
      if (target) visit(target)
      const next = modules.get(target)
      return next ? exported(next, source.name, seen) : null
    }
    const calls = (node, owner = module) => {
      // A function declaration is not a font setup. Follow only invoked functions,
      // including imported bond wrappers, rather than every body in the import tree.
      if (
        ['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression'].includes(node.type)
      )
        return
      if (node.type === 'CallExpression') {
        const setter = owner.imported(node.callee)
        const value = owner.imported(node.arguments[0])
        for (const provider of providers)
          if (
            setter?.package === provider.core &&
            setter.name === provider.setter &&
            value?.package === provider.package &&
            value.name === provider.exportName
          )
            fonts.add(provider.package)
        const fn = callable(node.callee, owner)
        if (fn && !called.has(fn.node)) {
          called.add(fn.node)
          calls(fn.node.body, fn.owner)
        }
      }
      for (const key of context.sourceCode.visitorKeys[node.type] ?? []) {
        const value = node[key]
        if (Array.isArray(value)) {
          for (const child of value) if (child?.type) calls(child, owner)
        } else if (value?.type) calls(value, owner)
      }
    }
    for (const statement of tree.body) {
      if (
        !['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(
          statement.type,
        ) ||
        statement.importKind === 'type' ||
        statement.exportKind === 'type'
      )
        continue
      const spec = statement.source?.value
      if (typeof spec !== 'string' || /[?&](?:raw|url)(?:&|$)/.test(spec)) continue
      const imported = locate(spec, path)
      if (imported) visit(imported)
    }
    if (providers.length) calls(tree)
  }
  const html = read(join(root, 'index.html'))?.replace(/<!--[\s\S]*?-->/g, '')
  if (html) {
    for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi))
      css(match[1], join(root, 'index.html'))
    for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
      const attrs = new Map(
        [...match[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((item) => [
          item[1].toLowerCase(),
          item[2] ?? item[3],
        ]),
      )
      const sheet =
        match[1].toLowerCase() === 'link' && attrs.get('rel')?.split(/\s+/).includes('stylesheet')
      if (!sheet && !(match[1].toLowerCase() === 'script' && attrs.get('type') === 'module'))
        continue
      const spec = attrs.get(sheet ? 'href' : 'src')
      if (!spec) continue
      const imported = locate(
        spec.startsWith('/') || spec.startsWith('.') || spec.includes('://') ? spec : './' + spec,
        join(root, 'index.html'),
        sheet,
      )
      if (imported) visit(imported)
    }
  }
  visit(filename)
  return { styles, unknown, fonts }
}

/** A local `@font-face` is an alternative to a provider, when CSS uses it for this class. */
function localFont(node, sheets) {
  const family = (value) =>
    value
      .trim()
      .replace(/^["']|["']$/g, '')
      .toLowerCase()
  const faces = new Set(
    sheets.styles.flatMap((css) =>
      [...css.matchAll(/@font-face\s*\{([^{}]*)\}/gi)].flatMap((face) => {
        const value = /(?:^|;)\s*font-family\s*:\s*([^;}]*)/i.exec(face[1])?.[1]
        return value && /(?:^|;)\s*src\s*:\s*[^;]+/i.test(face[1]) ? [family(value)] : []
      }),
    ),
  )
  if (!faces.size) return false
  const classes = literal(classAttribute(node)?.value).value?.split(/\s+/) ?? []
  return sheets.styles.some((css) =>
    [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].some((rule) => {
      const tokens = rule[1].match(/\.[A-Za-z][\w-]*/g) ?? []
      const value = /(?:^|;)\s*font-family\s*:\s*([^;}]*)/i.exec(rule[2])?.[1]
      return (
        value &&
        value.split(',').some((part) => faces.has(family(part))) &&
        classes.some((cls) => tokens.includes('.' + cls))
      )
    }),
  )
}

/** Conservative evidence that a selector explicitly styles this otherwise empty element. */
function styled(node, sheets, visual = STYLE) {
  if (sheets.unknown) return true
  const name = tag(node)
  const value = literal(classAttribute(node)?.value).value
  const classes = (typeof value === 'string' ? value : '').split(/\s+/).filter(Boolean)
  const id = literal(attribute(node, 'id')?.value).value
  for (const css of sheets.styles) {
    for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!visual.test(match[2]) && (visual !== STYLE || !/@apply\b/.test(match[2]))) continue
      const selector = match[1]
      const tokens = selector.match(/[.#]?[\w-]+/g) ?? []
      const styledAttribute = [
        ...selector.matchAll(/\[\s*([\w-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/g),
      ].some((item) => {
        const attr = attribute(node, item[1] === 'class' ? 'className' : item[1])
        if (!attr) return false
        const expected = item[2] ?? item[3] ?? item[4]
        const actual = literal(attr.value)
        return expected === undefined || !actual.known || String(actual.value) === expected
      })
      if (
        classes.some((cls) => tokens.includes('.' + cls)) ||
        (id && tokens.includes('#' + id)) ||
        tokens.includes(name) ||
        styledAttribute
      )
        return true
    }
  }
  return false
}

const noEmptyInteractiveTarget = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          iconFonts: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['package', 'family', 'core', 'setter', 'exportName', 'classes'],
              properties: Object.fromEntries(
                ['package', 'family', 'core', 'setter', 'exportName', 'classes'].map((name) => [
                  name,
                  { type: 'string' },
                ]),
              ),
            },
          },
        },
      },
    ],
    docs: {
      description:
        'Interactive JSX needs visible content; registry icon classes need their font setup.',
    },
    messages: {
      empty:
        'This control has no drawing in its content or imported local CSS. Add visible text, a sized SVG (such as Icon), or local CSS that draws it. An aria-label does not draw a click target.',
      undrawnIcon:
        "'{{className}}' does not draw this button's only icon. Use a class supplied by the loaded icon font, a sized SVG (such as Icon), or visible text.",
      font: "'{{className}}' has no font. In src/bonds/index.ts import { {{exportName}} } from '{{package}}' and { {{setter}} } from '{{core}}'; call {{setter}}({{exportName}}).",
    },
  },
  create(context, mode = 'all') {
    let sheets
    const providers = context.options?.[0]?.iconFonts ?? []
    const classes = new Map()
    for (const provider of providers)
      for (const cls of provider.classes.split(/\s+/)) classes.set(cls, provider)
    const providerFor = (node) => {
      const value = literal(classAttribute(node)?.value).value
      if (typeof value !== 'string') return null
      const cls = value.split(/\s+/).find((name) => classes.has(name))
      return cls ? { className: cls, ...classes.get(cls) } : null
    }
    const available = (node, provider) => {
      // A text/SVG fallback already draws this element. Retaining an icon class
      // does not require its font when that font supplies none of the content.
      if (node.children.some((child) => possibleVisual(child, false))) return true
      sheets ??= loadedStyles(context, providers)
      return (
        sheets.fonts.has(provider.package) ||
        localFont(node, sheets) ||
        // A project may deliberately reuse the class for a CSS drawing or an
        // ordinary text glyph. Private-use font escapes still require a font.
        (!sheets.unknown &&
          styled(
            node,
            sheets,
            /(?:^|;)\s*(?:(?:background-image|mask(?:-image)?)\s*:\s*url\(|content\s*:\s*["'][^"'\\\ue000-\uf8ff]*[^\s"'\\\ue000-\uf8ff][^"'\\\ue000-\uf8ff]*["'])/i,
          ))
      )
    }
    const possibleVisual = (node, withStyles) => {
      if (node.type === 'JSXText') return node.value.trim() !== ''
      if (node.type === 'JSXExpressionContainer') return expressionContent(node.expression)
      if (node.type === 'JSXFragment')
        return node.children.some((child) => possibleVisual(child, withStyles))
      if (node.type !== 'JSXElement') return true
      const name = tag(node)
      if (!name || REPLACED.has(name)) return true
      if (hidden(node)) return false
      if (node.openingElement.attributes.some((attr) => attr.type === 'JSXSpreadAttribute'))
        return true
      if (attribute(node, 'dangerouslySetInnerHTML')) return true
      const children = attribute(node, 'children')
      if (children?.value) {
        const content =
          children.value.type === 'JSXExpressionContainer'
            ? children.value.expression
            : children.value
        if (expressionContent(content)) return true
      }
      const className = attribute(node, 'className')
      if (className?.value && !literal(className.value).known) return true
      const style = attribute(node, 'style')?.value
      if (style) {
        if (style.type !== 'JSXExpressionContainer' || style.expression.type !== 'ObjectExpression')
          return true
        const props = style.expression.properties
        if (
          props.some(
            (prop) => prop.type === 'SpreadElement' || prop.computed || !literal(prop.value).known,
          )
        )
          return true
        const css = props
          .map(
            (prop) =>
              `${String(prop.key.name ?? prop.key.value).replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}:${literal(prop.value).value}`,
          )
          .join(';')
        if (STYLE.test(css)) return true
      }
      if (node.children.some((child) => possibleVisual(child, withStyles))) return true
      if (!withStyles) return false
      const provider = providerFor(node)
      return (
        (provider && available(node, provider)) ||
        styled(node, (sheets ??= loadedStyles(context, providers)))
      )
    }
    return {
      JSXElement(node) {
        const provider = providerFor(node)
        if (provider && !available(node, provider)) {
          if (mode !== 'target')
            context.report({ node: classAttribute(node), messageId: 'font', data: provider })
          return
        }
        if (mode === 'font') return
        const icon = soleButtonIcon(node)
        const iconClass = icon && classAttribute(icon)
        const iconName = literal(iconClass?.value).value
        if (
          icon &&
          typeof iconName === 'string' &&
          iconName.trim() &&
          !providerFor(icon) &&
          !possibleVisual(icon, true) &&
          !styled(node, sheets, BUTTON_DRAWING)
        )
          context.report({
            node: iconClass,
            messageId: 'undrawnIcon',
            data: { className: iconName },
          })
        if (!tag(node) || REPLACED.has(tag(node)) || hidden(node) || !interactive(node)) return
        // Contentful projects incur no filesystem traversal from this rule.
        if (!possibleVisual(node, false) && !possibleVisual(node, true))
          context.report({ node: node.openingElement, messageId: 'empty' })
      },
    }
  },
}

/**
 * Font setup is a dependency check, independent of an empty click target's sizing.
 * A reasoned sizing exception must not suppress a missing font dependency.
 */
export const requireIconFontSetup = {
  meta: {
    ...noEmptyInteractiveTarget.meta,
    docs: {
      description: 'Registry icon glyphs require their invoked font setup or local font CSS.',
    },
    messages: { font: noEmptyInteractiveTarget.meta.messages.font },
  },
  create(context) {
    return noEmptyInteractiveTarget.create(context, 'font')
  },
}

/** Check target geometry separately while sharing the font availability evidence. */
export const interactiveTargetRule = {
  meta: noEmptyInteractiveTarget.meta,
  create(context) {
    return noEmptyInteractiveTarget.create(context, 'target')
  },
}

export default noEmptyInteractiveTarget
