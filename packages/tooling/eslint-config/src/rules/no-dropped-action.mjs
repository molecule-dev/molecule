/**
 * A render value must not silently discard an enabled control's first action.
 * Check the handler's effect-free prefix, including local tail-call wrappers.
 * preventDefault/stopPropagation are bookkeeping, not an answer to the action.
 *
 * Single-file JSX activation controls: clicks, submits and keyboard actions.
 * Gesture/lifecycle callbacks (move, hover, media events) are not activations.
 * Other custom callback props require a disabled prop on that same JSX control.
 * Opaque callbacks passed to another file are outside this rule. No imported files,
 * query provenance, persistence methods, routes or display text are inspected.
 * In a hook's own file, an optimistic toggle returned with its display state
 * must queue calls or expose when it is unavailable. A private ref cannot do that.
 * Boolean implication checks the same condition at the handler and control.
 * A checkbox/radio's change handler is its selection action. An auxiliary click
 * which does not prevent that native change need not perform another action.
 */
const ACTIVATION =
  /^(?:onClick|onDoubleClick|onSubmit|onKeyDown|onKeyUp|onPointerDown|onPointerUp|onMouseDown|onMouseUp)$/
const isFunction = (n) =>
  /^(?:FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n?.type)
const contains = (a, b) => a && b && a.range[0] <= b.range[0] && a.range[1] >= b.range[1]
const unwrap = (n) => {
  while (
    /^(?:TSAsExpression|TSSatisfiesExpression|TSTypeAssertion|TSNonNullExpression|ChainExpression|ParenthesizedExpression)$/.test(
      n?.type,
    )
  )
    n = n.expression
  return n
}
const not = (a) => (typeof a === 'boolean' ? !a : a?.[0] === '!' ? a[1] : ['!', a])
const join = (op, a, b) =>
  a === b
    ? a
    : typeof a === 'boolean'
      ? op === '&&'
        ? a
          ? b
          : false
        : a
          ? true
          : b
      : typeof b === 'boolean'
        ? join(op, b, a)
        : [op, a, b]
const and = (a, b) => join('&&', a, b)
const or = (a, b) => join('||', a, b)
const evaluate = (f, values) => {
  if (typeof f === 'boolean') return f
  if (typeof f === 'string') return values.get(f) ?? f
  const a = evaluate(f[1], values)
  return f[0] === '!' ? not(a) : join(f[0], a, evaluate(f[2], values))
}
/** An assignment that makes the formula true, or null: a contradiction proves that no enabled, mounted action can drop. */
function satisfyingValues(f, values = new Map()) {
  f = evaluate(f, values)
  if (typeof f === 'boolean') return f ? values : null
  let atom = f
  while (Array.isArray(atom)) atom = atom[1]
  return (
    satisfyingValues(f, new Map(values).set(atom, false)) ??
    satisfyingValues(f, new Map(values).set(atom, true))
  )
}
const possible = (f) => satisfyingValues(f) !== null
/**
 * Exact minimum sum of products over source guard facts. Consensus and absorption
 * produce the prime implicants directly from the paths, without expanding 2^N
 * minterms for a simple N-way OR. Choose a minimum cover by counterexamples to
 * coverage: fewest literals, then terms, then shortest stable spelling.
 */
function minimalCondition(expression, labels) {
  const atoms = [...labels.keys()]
  const merge = (a, b, consensus = false) => {
    const different = a.flatMap((bit, i) =>
      bit !== null && b[i] !== null && bit !== b[i] ? [i] : [],
    )
    if (different.length !== Number(consensus)) return null
    return a.map((bit, i) => (different.includes(i) ? null : (bit ?? b[i])))
  }
  const cubeKey = (bits) => bits.map((bit) => (bit === null ? '-' : Number(bit))).join('')
  const absorb = (cubes) => {
    const unique = [...new Map(cubes.map((bits) => [cubeKey(bits), bits])).values()]
    return unique.filter(
      (bits, i) =>
        !unique.some(
          (other, j) => i !== j && other.every((bit, k) => bit === null || bit === bits[k]),
        ),
    )
  }
  const products = (f, polarity = true) => {
    if (typeof f === 'boolean') return f === polarity ? [atoms.map(() => null)] : []
    if (typeof f === 'string') return [atoms.map((atom) => (atom === f ? polarity : null))]
    if (f[0] === '!') return products(f[1], !polarity)
    const a = products(f[1], polarity),
      b = products(f[2], polarity)
    return (f[0] === '&&') === polarity
      ? absorb(
          a.flatMap((left) =>
            b.flatMap((right) => {
              const bits = merge(left, right)
              return bits ? [bits] : []
            }),
          ),
        )
      : absorb([...a, ...b])
  }
  let cubes = products(expression)
  for (;;) {
    const next = [...cubes]
    for (let i = 0; i < cubes.length; i++)
      for (let j = i + 1; j < cubes.length; j++) {
        const bits = merge(cubes[i], cubes[j], true)
        if (bits) next.push(bits)
      }
    const primes = absorb(next)
    if (primes.map(cubeKey).sort().join(',') === cubes.map(cubeKey).sort().join(',')) break
    cubes = primes
  }
  if (!cubes.length) return 'false'
  const termText = (bits) =>
    bits
      .flatMap((bit, i) => (bit === null ? [] : [labels.get(atoms[i])[Number(bit)]]))
      .join(' && ') || 'true'
  // Source fact order preserves short circuits such as !record || record.busy.
  // Sorting by printed text could dereference record before checking its guard.
  const termOrder = (a, b) => {
    for (let i = 0; i < atoms.length; i++)
      if (a[i] !== b[i]) return a[i] === null ? 1 : b[i] === null ? -1 : Number(a[i]) - Number(b[i])
    return 0
  }
  const textFor = (indices) =>
    indices
      .map((i) => cubes[i])
      .sort(termOrder)
      .map(termText)
      .join(' || ')
  const formulas = cubes.map((bits) =>
    bits.map((bit, i) => (bit === null ? true : bit ? atoms[i] : not(atoms[i]))).reduce(and, true),
  )
  const literals = cubes.map((bits) => bits.filter((bit) => bit !== null).length)
  let best = cubes.map((_, i) => i),
    bestCost = literals.reduce((a, b) => a + b, 0),
    bestText = textFor(best)
  const visited = new Set()
  const cover = (chosen, uncovered, cost) => {
    if (cost > bestCost) return
    const row = satisfyingValues(uncovered)
    if (!row) {
      const text = textFor(chosen)
      if (
        cost < bestCost ||
        (cost === bestCost &&
          (chosen.length < best.length ||
            (chosen.length === best.length &&
              (text.length < bestText.length ||
                (text.length === bestText.length && text < bestText)))))
      ) {
        best = chosen
        bestCost = cost
        bestText = text
      }
      return
    }
    const key = [...chosen].sort((a, b) => a - b).join(',')
    if (visited.has(key)) return
    visited.add(key)
    for (const [i, bits] of cubes.entries())
      if (bits.every((bit, k) => bit === null || bit === (row.get(atoms[k]) ?? false)))
        cover([...chosen, i], and(uncovered, not(formulas[i])), cost + literals[i])
  }
  cover([], expression, 0)
  return bestText
}
export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Require disabled or unmounted controls when render state can silently discard their action.',
    },
    schema: [],
    messages: {
      droppedAction: 'Clicks drop while {{condition}}. {{fix}}',
      privatePendingToggle:
        'This optimistic action silently drops the next call while {{guard}} is true. Use the generated toggle hook or useOptimisticValue to queue changes, or expose reactive saving state and disable the control during the save.',
    },
  },
  create(context) {
    const source = context.sourceCode,
      controls = [],
      ids = new Map(),
      argumentsFor = new Map()
    let bindings
    const variable = (n) => {
      if (!bindings) {
        bindings = new WeakMap()
        for (const scope of source.scopeManager.scopes)
          for (const value of scope.variables) {
            for (const id of value.identifiers) bindings.set(id, value)
            for (const ref of value.references)
              if (runtimeReference(ref)) bindings.set(ref.identifier, value)
          }
      }
      return (n && bindings.get(n)) || null
    }
    const init = (n) => {
      const v = variable(n),
        d = v?.defs[0]
      return d?.type === 'Variable' &&
        d.parent.kind === 'const' &&
        d.node.id.type === 'Identifier' &&
        !v.references.some((r) => r.isWrite() && !r.init)
        ? unwrap(d.node.init)
        : null
    }
    const key = (n, seen = new Set()) => {
      n = unwrap(n)
      if (n?.type === 'CallExpression' && !pure(n)) return 'call@' + n.range[0]
      if (n?.type === 'Literal') return 'literal:' + typeof n.value + ':' + String(n.value)
      if (n?.type === 'Identifier') {
        const v = variable(n) ?? n.name
        const value = init(n)
        if (value && snapshot(value) && !seen.has(v)) return key(value, new Set(seen).add(v))
        if (!ids.has(v)) ids.set(v, String(ids.size))
        return 'v' + ids.get(v)
      }
      return n
        ? n.type +
            '(' +
            Object.entries(n)
              .filter(
                ([k]) => !['parent', 'loc', 'range', 'start', 'end', 'optional', 'raw'].includes(k),
              )
              .map(
                ([k, v]) =>
                  k +
                  ':' +
                  (Array.isArray(v)
                    ? v.map((p) => (p?.type ? key(p, seen) : JSON.stringify(p))).join(',')
                    : v?.type
                      ? key(v, seen)
                      : JSON.stringify(v)),
              )
              .join(',') +
            ')'
        : 'unknown'
    }
    const reactHook = (n, name) => {
      const member = n?.type === 'MemberExpression',
        d = variable(member ? n.object : n)?.defs[0]
      return (
        d?.type === 'ImportBinding' &&
        d.parent.source.value === 'react' &&
        (member
          ? !n.computed &&
            n.property.name === name &&
            ['ImportNamespaceSpecifier', 'ImportDefaultSpecifier'].includes(d.node.type)
          : d.node.imported?.name === name)
      )
    }
    const fnFor = (n, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return null
      seen.add(n)
      if (isFunction(n)) return n
      const d = variable(n)?.defs[0]
      if (d?.type === 'FunctionName') return isFunction(d.node) && d.node.body ? d.node : null
      if (n.type === 'CallExpression' && reactHook(n.callee, 'useCallback'))
        return fnFor(n.arguments[0], seen)
      return fnFor(init(n), seen)
    }
    const walk = (n, visit) => {
      if (!n?.type) return
      visit(n)
      if (isFunction(n)) return
      for (const k of source.visitorKeys[n.type] ?? [])
        for (const p of [].concat(n[k] ?? [])) walk(p, visit)
    }
    const owner = (n) => {
      for (let p = n?.parent; p; p = p.parent) if (isFunction(p)) return p
      return null
    }
    const member = (node) =>
      node?.type === 'MemberExpression' && !node.computed ? node.property.name : null
    const returnedDisplayChanges = (call, display) => {
      const setter = variable(call.callee)
      const declaration = setter?.defs[0]?.node
      if (
        declaration?.id?.type !== 'ArrayPattern' ||
        !reactHook(declaration.init?.callee, 'useState') ||
        variable(declaration.id.elements[1]) !== setter
      )
        return false
      const state = variable(declaration.id.elements[0])
      const update = unwrap(call.arguments[0])
      const updater = isFunction(update) && update.expression ? update : null
      const previous = updater && variable(updater.params[0])
      const next = updater ? unwrap(updater.body) : update
      const reads = (node, field) => {
        const identifier = field ? (member(node) === field ? node.object : null) : node
        const binding = variable(identifier)
        return !!binding && (binding === state || binding === previous)
      }
      const flips = (node, field) => {
        const value = init(node) ?? unwrap(node)
        return (
          value?.type === 'UnaryExpression' &&
          value.operator === '!' &&
          reads(unwrap(value.argument), field)
        )
      }
      if (!display.length) return false
      if (flips(next, null) && display.every((node) => reads(node, null))) return true
      if (
        next?.type !== 'ObjectExpression' ||
        next.properties.some((p) => p.type !== 'Property' || p.computed || p.kind !== 'init')
      )
        return false
      const fields = new Map(next.properties.map((p) => [p.key.name ?? p.key.value, p.value]))
      const displayed = display.map(member)
      return (
        displayed.some((field) => field && flips(fields.get(field), field)) &&
        display.every((node, i) => {
          const field = displayed[i]
          const value = unwrap(fields.get(field))
          return (
            field &&
            reads(node, field) &&
            (flips(value, field) ||
              (value?.type === 'BinaryExpression' &&
                ['+', '-'].includes(value.operator) &&
                reads(unwrap(value.left), field)))
          )
        })
      )
    }
    const returnedToggleGuard = (result) => {
      const hook = owner(result)
      if (result.parent !== hook?.body || result.argument?.type !== 'ObjectExpression') return
      const properties = result.argument.properties
      if (properties.some((p) => p.type !== 'Property' || p.kind !== 'init')) return
      const actions = properties.filter((p) => fnFor(p.value)?.async)
      if (actions.length !== 1) return
      const [action] = actions
      const handler = fnFor(action.value)
      if (owner(handler) !== hook || handler.body.type !== 'BlockStatement') return

      // Only prove a private boolean lock held across an awaited call. A ref
      // shared or read anywhere else could be part of a different contract.
      const body = handler.body.body
      const guard = body.find(
        (n) =>
          n.type === 'IfStatement' &&
          !n.alternate &&
          n.consequent.type === 'ReturnStatement' &&
          !n.consequent.argument &&
          member(n.test) === 'current',
      )
      if (!guard) return
      const ref = variable(guard.test.object)
      const initialization = init(guard.test.object)
      if (
        !reactHook(initialization?.callee, 'useRef') ||
        initialization.arguments[0]?.value !== false
      )
        return
      const index = body.indexOf(guard)
      // Earlier returns (e.g. a login redirect) may handle different input.
      // Work performed on a path that reaches this guard could handle this call.
      if (
        body.slice(0, index).some((n) => {
          if (n.type !== 'IfStatement' || n.alternate || !pure(n.test)) return true
          const branch = n.consequent
          return (
            (branch.type === 'BlockStatement' ? branch.body.at(-1) : branch)?.type !==
            'ReturnStatement'
          )
        })
      )
        return
      const assignment = (statement, value) => {
        const write = statement?.expression
        return write?.type === 'AssignmentExpression' &&
          write.operator === '=' &&
          member(write.left) === 'current' &&
          variable(write.left.object) === ref &&
          write.right.value === value
          ? write.left.object
          : null
      }
      const work = body.at(-1)
      const lock = assignment(body[index + 1], true)
      const unlock = work?.type === 'TryStatement' && assignment(work.finalizer?.body.at(-1), false)
      if (!lock || !unlock) return
      const uses = new Set([guard.test.object, lock, unlock])
      if (ref.references.some((r) => !r.init && !uses.has(r.identifier))) return
      let wait
      walk(work.block, (n) => {
        if (!wait && n.type === 'AwaitExpression' && unwrap(n.argument)?.type === 'CallExpression')
          wait = n
      })
      if (!wait) return

      // Prove the returned state exposes the inverse (and optionally a count
      // adjustment) during that wait. Leave extra returned state and opaque
      // modifiers alone because they can expose availability to callers.
      const beforeWork = body.slice(index + 2, -1)
      const [statement, ...otherStatements] = beforeWork.filter(
        (n) => n.type !== 'VariableDeclaration',
      )
      const call = statement?.type === 'ExpressionStatement' && statement.expression
      if (otherStatements.length || call?.type !== 'CallExpression') return
      const display = properties.filter((p) => p !== action).map((p) => unwrap(p.value))
      if (!returnedDisplayChanges(call, display)) return
      if (
        variable(call.callee).references.some(
          ({ identifier }) =>
            call.range[1] < identifier.range[0] && identifier.range[0] < wait.range[0],
        )
      )
        return
      return guard.test
    }
    const snapshot = (p) => {
      p = unwrap(p)
      return (
        p?.type === 'Identifier' ||
        (p?.type === 'MemberExpression' &&
          snapshot(p.object) &&
          (!p.computed || p.property.type === 'Literal'))
      )
    }
    const renderValue = (n, fn) => {
      let found = false,
        local = false
      const seen = new Set()
      const visit = (p) => {
        if (
          p.type === 'MemberExpression' &&
          !p.computed &&
          p.property.name === 'current' &&
          reactHook(init(p.object)?.callee, 'useRef')
        )
          local = true
        if (p.type !== 'Identifier') return
        const v = variable(p),
          scope = v?.scope.variableScope.block
        if (scope === fn) {
          // Taking an immutable snapshot of a render value does not make it event data.
          // Computed locals and event/ref reads retain the existing local-only boundary.
          const value = init(p)
          if (value && snapshot(value) && !seen.has(v)) {
            seen.add(v)
            walk(value, visit)
          } else local = true
        } else if (isFunction(scope) && contains(scope, fn)) found = true
      }
      walk(n, visit)
      return found && !local
    }
    const renderText = (n, fn, seen = new Set()) => {
      const edits = []
      walk(n, (part) => {
        const binding = variable(part)
        if (
          part.type !== 'Identifier' ||
          binding?.scope.variableScope.block !== fn ||
          seen.has(binding)
        )
          return
        const value = init(part)
        if (value && snapshot(value))
          edits.push({
            start: part.range[0] - n.range[0],
            end: part.range[1] - n.range[0],
            text: renderText(value, fn, new Set(seen).add(binding)),
          })
      })
      let text = source.getText(n)
      for (const edit of edits.sort((a, b) => b.start - a.start))
        text = text.slice(0, edit.start) + edit.text + text.slice(edit.end)
      return text
    }
    const pure = (n) => {
      let result = true
      walk(n, (p) => {
        if (
          [
            'AssignmentExpression',
            'UpdateExpression',
            'AwaitExpression',
            'NewExpression',
            'YieldExpression',
          ].includes(p.type)
        )
          result = false
        if (
          p.type === 'CallExpression' &&
          !(
            p.callee.type === 'Identifier' &&
            p.callee.name === 'Boolean' &&
            !variable(p.callee)?.defs.length
          ) &&
          !(
            p.callee.type === 'MemberExpression' &&
            !p.callee.computed &&
            p.callee.property.name === 'trim' &&
            p.arguments.length === 0
          )
        )
          result = false
      })
      return result
    }
    const optionalBase = (n) => {
      if (n?.type !== 'MemberExpression' && n?.type !== 'CallExpression') return null
      if (n.optional) return n.type === 'MemberExpression' ? n.object : n.callee
      return optionalBase(n.type === 'MemberExpression' ? n.object : n.callee)
    }
    const primitiveType = (n, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return null
      const next = new Set(seen).add(n)
      if (n.type === 'Literal') return n.value === null ? 'null' : typeof n.value
      const definition = variable(n)?.defs[0]
      let annotation =
        n.typeAnnotation?.typeAnnotation ?? definition?.name.typeAnnotation?.typeAnnotation
      if (!annotation && definition?.type === 'Parameter') {
        for (const param of definition.node.params) {
          const pattern = param.type === 'AssignmentPattern' ? param.left : param
          if (pattern.type !== 'ObjectPattern') continue
          const property = pattern.properties.find(
            (p) =>
              p.type === 'Property' &&
              (p.value === definition.name || p.value.left === definition.name),
          )
          if (property && pattern.typeAnnotation?.typeAnnotation.type === 'TSTypeLiteral')
            annotation = pattern.typeAnnotation.typeAnnotation.members.find(
              (member) =>
                member.type === 'TSPropertySignature' &&
                (member.key.name ?? member.key.value) === (property.key.name ?? property.key.value),
            )?.typeAnnotation?.typeAnnotation
        }
      }
      if (annotation?.type === 'TSBooleanKeyword') return 'boolean'
      if (
        (n.type === 'UnaryExpression' && n.operator === '!') ||
        (n.type === 'BinaryExpression' &&
          ['===', '==', '!==', '!=', '<', '<=', '>', '>=', 'in', 'instanceof'].includes(n.operator))
      )
        return 'boolean'
      if (
        n.type === 'CallExpression' &&
        n.callee.type === 'MemberExpression' &&
        n.callee.property.name === 'trim'
      )
        return 'string'
      if (n.type === 'MemberExpression' && n.property.name === 'length') return 'number'
      const value = init(n)
      if (value) return primitiveType(value, next)
      const d = variable(n)?.defs[0]
      return d?.node.id?.type === 'ArrayPattern' && reactHook(d.node.init?.callee, 'useState')
        ? primitiveType(d.node.init.arguments[0], next)
        : null
    }
    const formula = (n, seen = new Set()) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return key(n)
      const next = new Set(seen).add(n),
        f = (p) => formula(p, next)
      if (n.type === 'Literal') return Boolean(n.value)
      if (isFunction(n)) return true
      if (n.type === 'Identifier') {
        if (n.name === 'undefined' && !variable(n)?.defs.length) return false
        if (argumentsFor.has(variable(n))) return f(argumentsFor.get(variable(n)))
        const value = init(n)
        if (
          value &&
          (pure(value) ||
            [
              'LogicalExpression',
              'ConditionalExpression',
              'BinaryExpression',
              'UnaryExpression',
              'MemberExpression',
            ].includes(value.type) ||
            (value.type === 'CallExpression' && reactHook(value.callee, 'useMemo')))
        )
          return f(value)
      }
      if (n.type === 'UnaryExpression' && n.operator === '!') return not(f(n.argument))
      if (n.type === 'LogicalExpression' && n.operator !== '??')
        return join(n.operator, f(n.left), f(n.right))
      if (n.type === 'LogicalExpression' && n.operator === '??' && f(n.right) === false)
        return f(n.left)
      if (n.type === 'MemberExpression' && n.property.name === 'length') {
        const object = init(n.object) ?? unwrap(n.object)
        if (
          object?.type === 'LogicalExpression' &&
          object.operator === '??' &&
          object.right.type === 'ArrayExpression' &&
          object.right.elements.length === 0
        )
          return and(f(object.left), key({ ...n, object: object.left }))
      }
      if (
        n.type === 'BinaryExpression' &&
        ['>', '>='].includes(n.operator) &&
        n.right.value === 0 &&
        n.operator === '>'
      )
        return and(f(n.left), key(n))
      if (n.type === 'ConditionalExpression')
        return or(and(f(n.test), f(n.consequent)), and(not(f(n.test)), f(n.alternate)))
      if (
        n.type === 'CallExpression' &&
        n.callee.name === 'Boolean' &&
        !variable(n.callee)?.defs.length
      )
        return f(n.arguments[0])
      if (n.type === 'CallExpression' && reactHook(n.callee, 'useMemo')) {
        const fn = fnFor(n.arguments[0])
        if (fn?.expression) return f(fn.body)
      }
      if (n.type === 'BinaryExpression' && ['===', '==', '!==', '!='].includes(n.operator)) {
        const literal = (p) =>
          p.type === 'Literal' ||
          (p.type === 'Identifier' && p.name === 'undefined' && !variable(p)?.defs.length)
        let a = n.left,
          b = n.right
        if (literal(a) && !literal(b)) [a, b] = [b, a]
        if (literal(b)) {
          if (literal(a)) {
            const av = a.value,
              bv = b.value
            return n.operator === '==='
              ? av === bv
              : n.operator === '!=='
                ? av !== bv
                : n.operator === '=='
                  ? av == bv
                  : av != bv
          }
          const kind = primitiveType(a)
          if (b.value == null && kind && kind !== 'null') return n.operator.includes('!')
          if (
            typeof b.value === 'boolean' &&
            kind &&
            kind !== 'boolean' &&
            ['===', '!=='].includes(n.operator)
          )
            return n.operator.includes('!')
          const value = b.value,
            empty = value == null || value === '' || value === 0
          if (empty || typeof value === 'boolean') {
            // Constant/predicate values cannot equal null. Do not turn such a
            // comparison into a presence gate for an unrelated data value.
            const av = init(a),
              booleanValue =
                (av?.type === 'UnaryExpression' && av.operator === '!') ||
                (a.type === 'UnaryExpression' && a.operator === '!') ||
                a.type === 'BinaryExpression' ||
                (a.type === 'CallExpression' &&
                  a.callee.name === 'Boolean' &&
                  !variable(a.callee)?.defs.length) ||
                (av?.type === 'Literal' && typeof av.value === 'boolean')
            if (value == null && (booleanValue || av?.type === 'Literal'))
              return n.operator.includes('!')
            const base = optionalBase(unwrap(a))
            if (value === false && base) {
              const eq = and(f(base), key({ ...n, operator: '===' }))
              return n.operator.includes('!') ? not(eq) : eq
            }
            const test = f(a),
              negative = (empty || value === false) !== n.operator.includes('!')
            return negative ? not(test) : test
          }
        }
        const normalized = {
          ...n,
          operator: n.operator.includes('!') ? '===' : n.operator === '==' ? '===' : n.operator,
        }
        let test = key(normalized)
        const base = optionalBase(unwrap(n.left))
        if (base) test = and(f(base), test)
        return n.operator.includes('!') ? not(test) : test
      }
      // Continuous optional access is falsy when its base is absent.
      if (n.type === 'MemberExpression' && optionalBase(n)) return and(f(optionalBase(n)), key(n))
      if (n.type === 'CallExpression' && n.optional) return and(f(n.callee), key(n))
      return key(n)
    }
    const housekeeping = (n) =>
      n?.type === 'CallExpression' &&
      n.callee.type === 'MemberExpression' &&
      !n.callee.computed &&
      ['preventDefault', 'stopPropagation'].includes(n.callee.property.name) &&
      variable(n.callee.object)?.defs[0]?.type === 'Parameter'
    const joinGuards = (a, b) => (a === null || b === null ? null : [...a, ...b])
    // Keep source facts beside the exact proof operation that conjoins them.
    // An event-local or effectful test cannot become a JSX disabled expression.
    const guardFacts = (test, polarity, fn, rendering = false) =>
      typeof formula(test) === 'boolean'
        ? []
        : pure(test) && (rendering || renderValue(test, fn))
          ? [{ test, polarity, fn }]
          : null
    const equalityInverse = { '===': '!==', '!==': '===', '==': '!=', '!=': '==' }
    const precedence = (n) => {
      n = unwrap(n)
      if (n.type === 'SequenceExpression' || n.type === 'ArrowFunctionExpression') return 0
      if (n.type === 'AssignmentExpression') return 1
      if (n.type === 'ConditionalExpression') return 2
      if (n.type === 'LogicalExpression') return n.operator === '&&' ? 4 : 3
      if (n.type === 'BinaryExpression')
        return (
          {
            '|': 5,
            '^': 6,
            '&': 7,
            '==': 8,
            '!=': 8,
            '===': 8,
            '!==': 8,
            '<': 9,
            '<=': 9,
            '>': 9,
            '>=': 9,
            in: 9,
            instanceof: 9,
            '<<': 10,
            '>>': 10,
            '>>>': 10,
            '+': 11,
            '-': 11,
            '*': 12,
            '/': 12,
            '%': 12,
            '**': 13,
          }[n.operator] ?? 0
        )
      return n.type === 'UnaryExpression' || n.type === 'AwaitExpression' ? 14 : 15
    }
    const operandText = (n, fn, minimum) => {
      n = unwrap(n)
      const text = renderText(n, fn)
      return precedence(n) < minimum ? `(${text})` : text
    }
    const guardAtom = (test, polarity, fn, labels) => {
      if (test.type === 'BinaryExpression' && ['!==', '!='].includes(test.operator)) {
        test = { ...test, operator: equalityInverse[test.operator] }
        polarity = !polarity
      }
      const atom = key(test)
      if (!labels.has(atom)) {
        const equality = test.type === 'BinaryExpression' && equalityInverse[test.operator]
        const comparison = (operator) =>
          `${operandText(test.left, fn, 8)} ${operator} ${operandText(test.right, fn, 9)}`
        labels.set(atom, [
          equality ? comparison(equalityInverse[test.operator]) : `!${operandText(test, fn, 14)}`,
          equality
            ? comparison(test.operator)
            : primitiveType(test) === 'boolean'
              ? renderText(test, fn)
              : `!!${operandText(test, fn, 14)}`,
        ])
      }
      return polarity ? atom : not(atom)
    }
    const guardExpression = (test, polarity, fn, labels) => {
      test = unwrap(test)
      // A previous disabled prop can call application code. Preserve it as one
      // fact, evaluated once, before the handler's effect-free render guards.
      if (!pure(test)) return guardAtom(test, polarity, fn, labels)
      const expression = (n, positive = true) => guardExpression(n, positive, fn, labels)
      if (test.type === 'Literal') return polarity === Boolean(test.value)
      if (test.type === 'Identifier' && test.name === 'undefined' && !variable(test)?.defs.length)
        return !polarity
      if (test.type === 'UnaryExpression' && test.operator === '!')
        return expression(test.argument, !polarity)
      if (test.type === 'LogicalExpression' && ['&&', '||'].includes(test.operator)) {
        const value = join(test.operator, expression(test.left), expression(test.right))
        return polarity ? value : not(value)
      }
      if (test.type === 'ConditionalExpression') {
        const value = or(
          and(expression(test.test), expression(test.consequent)),
          and(not(expression(test.test)), expression(test.alternate)),
        )
        return polarity ? value : not(value)
      }
      if (
        test.type === 'CallExpression' &&
        test.callee.name === 'Boolean' &&
        !variable(test.callee)?.defs.length &&
        test.arguments.length === 1
      )
        return expression(test.arguments[0], polarity)
      return guardAtom(test, polarity, fn, labels)
    }
    const conditionFor = (paths, previous) => {
      const labels = new Map()
      const existing = previous ? guardExpression(previous, true, null, labels) : false
      const value = paths
        .map((facts) =>
          facts
            .map(({ test, polarity, fn }) => guardExpression(test, polarity, fn, labels))
            .reduce(and, true),
        )
        .reduce(or, false)
      return minimalCondition(or(existing, value), labels)
    }
    // When the control can act: the negated drop condition, wrapped for use before `&& …`.
    const availableFor = (paths) => {
      const labels = new Map()
      const value = paths
        .map((facts) =>
          facts
            .map(({ test, polarity, fn }) => guardExpression(test, polarity, fn, labels))
            .reduce(and, true),
        )
        .reduce(or, false)
      const text = minimalCondition(not(value), labels)
      return text.includes(' || ') ? `(${text})` : text
    }
    const visibleAt = (guard, control) => {
      const lookup = (name) => {
        for (let scope = source.getScope(control); scope; scope = scope.upper)
          if (scope.set.has(name)) return scope.set.get(name)
        return null
      }
      const seen = new Set()
      let visible = true
      const visit = (part) => {
        if (part.type !== 'Identifier') return
        const binding = variable(part)
        if (!binding) return
        if (binding.scope.variableScope.block === guard.fn) {
          const value = init(part)
          if (!value || !snapshot(value) || seen.has(binding)) {
            visible = false
            return
          }
          seen.add(binding)
          walk(value, visit)
        } else if (lookup(part.name) !== binding) visible = false
      }
      walk(guard.test, visit)
      return visible
    }
    // Split short-circuit paths so an event/local-only return never becomes a
    // render-state defect merely because another operand reads component state.
    const branches = (n, expected, fn) => {
      n = unwrap(n)
      if (n.type === 'UnaryExpression' && n.operator === '!')
        return branches(n.argument, !expected, fn)
      if (n.type === 'LogicalExpression' && ['&&', '||'].includes(n.operator)) {
        const both = (n.operator === '&&') === expected,
          left = branches(n.left, expected, fn),
          right = branches(n.right, expected, fn)
        if (both)
          return left.flatMap((a) =>
            right.map((b) => ({
              condition: and(a.condition, b.condition),
              guarded: a.guarded || b.guarded,
              guards: joinGuards(a.guards, b.guards),
            })),
          )
        return [
          ...left,
          ...branches(n.left, !expected, fn).flatMap((a) =>
            right.map((b) => ({
              condition: and(a.condition, b.condition),
              guarded: b.guarded,
              guards: joinGuards(a.guards, b.guards),
            })),
          ),
        ]
      }
      return [
        {
          condition: expected ? formula(n) : not(formula(n)),
          guarded: renderValue(n, fn),
          guards: guardFacts(n, expected, fn),
        },
      ]
    }
    const guardPaths = (fn, seen = new Set()) => {
      if (!fn || seen.has(fn)) return []
      const next = new Set(seen).add(fn),
        paths = []
      const run = (
        statements,
        condition = true,
        guarded = false,
        guards = [],
        prevented = false,
        follow = true,
      ) => {
        if (!statements.length) {
          if (guarded) paths.push({ condition, guards, prevented })
          return
        }
        const [s, ...rest] = statements
        if (s.type === 'BlockStatement')
          return run([...s.body, ...rest], condition, guarded, guards, prevented, follow)
        if (s.type === 'IfStatement' && pure(s.test)) {
          for (const expected of [true, false])
            for (const path of branches(s.test, expected, fn)) {
              const body = expected ? s.consequent : s.alternate
              run(
                [...(body ? [body] : []), ...rest],
                and(condition, path.condition),
                guarded || (path.guarded && renderValue(s.test, fn)),
                joinGuards(guards, guardFacts(s.test, expected, fn) === null ? null : path.guards),
                prevented,
                follow && renderValue(s.test, fn),
              )
            }
          return
        }
        if (
          s.type === 'EmptyStatement' ||
          s.type === 'FunctionDeclaration' ||
          s.type.startsWith('TS') ||
          (s.type === 'VariableDeclaration' && s.declarations.every((d) => pure(d.init)))
        )
          return run(rest, condition, guarded, guards, prevented, follow)
        if (s.type === 'ReturnStatement' && !s.argument) {
          if (guarded) paths.push({ condition, guards, prevented })
          return
        }
        let e = unwrap(
          s.type === 'ReturnStatement'
            ? s.argument
            : s.type === 'ExpressionStatement'
              ? s.expression
              : s,
        )
        if (housekeeping(e))
          return run(
            rest,
            condition,
            guarded,
            guards,
            prevented || e.callee.property.name === 'preventDefault',
            follow,
          )
        if (e?.type === 'UnaryExpression' && e.operator === 'void') e = unwrap(e.argument)
        if (e?.type === 'AwaitExpression') e = unwrap(e.argument)
        if (follow && !rest.length && e?.type === 'CallExpression')
          for (const p of guardPaths(fnFor(e.callee), next))
            paths.push({
              condition: and(condition, p.condition),
              guards: joinGuards(guards, p.guards),
              prevented: prevented || p.prevented,
            })
        if (
          !rest.length &&
          e?.type === 'LogicalExpression' &&
          ['&&', '||'].includes(e.operator) &&
          pure(e.left) &&
          renderValue(e.left, fn)
        ) {
          const active = e.operator === '&&' ? formula(e.left) : not(formula(e.left))
          paths.push({
            condition: and(condition, not(active)),
            guards: joinGuards(guards, guardFacts(e.left, e.operator === '||', fn)),
            prevented,
          })
        }
        // Calls, writes, navigation, feedback and returned values answer the action.
      }
      run(
        fn.expression
          ? [{ type: 'ExpressionStatement', expression: fn.body }]
          : (fn.body.body ?? []),
      )
      return paths
    }
    const selection = (n, condition = true, seen = new Set(), guards = []) => {
      n = unwrap(n)
      if (!n || seen.has(n)) return []
      const next = new Set(seen).add(n)
      if (n.type === 'ConditionalExpression')
        return [
          ...selection(
            n.consequent,
            and(condition, formula(n.test)),
            next,
            joinGuards(guards, guardFacts(n.test, true, null, true)),
          ),
          ...selection(
            n.alternate,
            and(condition, not(formula(n.test))),
            next,
            joinGuards(guards, guardFacts(n.test, false, null, true)),
          ),
        ]
      if (n.type === 'LogicalExpression' && ['&&', '||'].includes(n.operator)) {
        const left = formula(n.left),
          takeLeft = n.operator === '||',
          leftCondition = and(condition, takeLeft ? left : not(left)),
          leftGuards = joinGuards(guards, guardFacts(n.left, takeLeft, null, true))
        return [
          ...(takeLeft
            ? selection(n.left, leftCondition, next, leftGuards)
            : [{ fn: null, condition: leftCondition, guards: leftGuards, empty: true }]),
          ...selection(
            n.right,
            and(condition, takeLeft ? not(left) : left),
            next,
            joinGuards(guards, guardFacts(n.left, !takeLeft, null, true)),
          ),
        ]
      }
      const fn = fnFor(n)
      if (
        (n.type === 'Identifier' && n.name === 'undefined' && !variable(n)?.defs.length) ||
        (!fn && primitiveType(n) !== null)
      )
        return [{ fn: null, condition, guards, empty: true }]
      return fn ? [{ fn, condition, guards }] : selection(init(n), condition, next, guards)
    }
    const terminates = (n) =>
      n?.type === 'ReturnStatement' ||
      n?.type === 'ThrowStatement' ||
      (n?.type === 'BlockStatement' && n.body.some(terminates))
    const runtimeReference = (r) => {
      for (let p = r.identifier.parent; p && !isFunction(p); p = p.parent)
        if (p.type === 'TSTypeQuery' || p.type === 'TSTypeReference') return false
      return !r.isTypeReference || r.isValueReference
    }
    const mounted = (n, seen = new Set()) => {
      if (seen.has(n)) return true
      const next = new Set(seen).add(n)
      let condition = true
      for (let p = n.parent, child = n; p; child = p, p = p.parent) {
        if (p.type === 'CallExpression' && p.arguments.includes(child)) {
          const receiver = optionalBase(p.callee)
          if (receiver) condition = and(condition, formula(receiver))
        }
        if (p.type === 'ConditionalExpression' && child !== p.test)
          condition = and(
            condition,
            child === p.consequent ? formula(p.test) : not(formula(p.test)),
          )
        if (p.type === 'LogicalExpression' && child === p.right && p.operator !== '??')
          condition = and(condition, p.operator === '&&' ? formula(p.left) : not(formula(p.left)))
        if (p.type === 'IfStatement' && child !== p.test)
          condition = and(
            condition,
            child === p.consequent ? formula(p.test) : not(formula(p.test)),
          )
        if (p.type === 'BlockStatement')
          for (const before of p.body) {
            if (before === child) break
            if (
              before.type === 'IfStatement' &&
              terminates(before.consequent) &&
              !terminates(before.alternate)
            )
              condition = and(condition, not(formula(before.test)))
          }
        if (
          isFunction(p) &&
          !(p.parent?.type === 'CallExpression' && p.parent.arguments.includes(p))
        ) {
          const binding = variable(
            p.type === 'FunctionDeclaration'
              ? p.id
              : p.parent?.type === 'VariableDeclarator'
                ? p.parent.id
                : null,
          )
          const refs =
            binding?.references.filter(
              (r) => r.identifier !== binding.defs[0]?.name && runtimeReference(r),
            ) ?? []
          if (
            owner(p) &&
            refs.length &&
            refs.every(
              (r) =>
                r.identifier.parent.type === 'CallExpression' &&
                r.identifier.parent.callee === r.identifier,
            )
          )
            condition = and(
              condition,
              refs.map((r) => mounted(r.identifier.parent, next)).reduce(or, false),
            )
          break
        }
      }
      return condition
    }
    const attribute = (n, name) => {
      for (const a of n.attributes.toReversed()) {
        if (a.type === 'JSXSpreadAttribute') return null
        if (a.name?.name === name)
          return a.value?.type === 'JSXExpressionContainer'
            ? a.value.expression
            : (a.value ?? { type: 'Literal', value: true })
      }
      return null
    }
    const takesDisabled = (n) =>
      n.name.type !== 'JSXIdentifier' ||
      /^[A-Z]/.test(n.name.name) ||
      ['button', 'input', 'select', 'textarea', 'fieldset', 'option', 'optgroup'].includes(
        n.name.name,
      )
    const ariaDisabled = (n) => {
      if (takesDisabled(n)) return false
      const role =
        attribute(n, 'role')?.value ??
        (n.name.name === 'a' && attribute(n, 'href') ? 'link' : n.name.name === 'tr' ? 'row' : null)
      if (
        ![
          'button',
          'checkbox',
          'combobox',
          'grid',
          'gridcell',
          'group',
          'link',
          'listbox',
          'menuitem',
          'option',
          'radio',
          'row',
          'slider',
          'spinbutton',
          'switch',
          'tab',
          'textbox',
          'treeitem',
          'application',
        ].includes(role)
      )
        return false
      const aria = (value, seen = new Set()) => {
        if (!value || seen.has(value)) return false
        const next = new Set(seen).add(value)
        if (value.type === 'Literal') return value.value === true || value.value === 'true'
        if (value.type === 'ConditionalExpression')
          return or(
            and(formula(value.test), aria(value.consequent, next)),
            and(not(formula(value.test)), aria(value.alternate, next)),
          )
        const alias = init(value)
        return alias ? aria(alias, next) : formula(value)
      }
      return aria(attribute(n, 'aria-disabled'))
    }
    const enabled = (n) => {
      let result = not(ariaDisabled(n))
      for (let p = n; p; p = p.parent) {
        if (p.type !== 'JSXOpeningElement') continue
        if (p !== n && p.name.name !== 'fieldset') continue
        if (takesDisabled(p))
          result = and(
            result,
            not(formula(attribute(p, 'disabled') ?? { type: 'Literal', value: false })),
          )
      }
      for (let p = n.parent?.parent; p; p = p.parent)
        if (p.type === 'JSXElement' && p.openingElement.name.name === 'fieldset') {
          const legend = p.children.find(
            (c) => c.type === 'JSXElement' && c.openingElement.name.name === 'legend',
          )
          if (!contains(legend, n))
            result = and(
              result,
              not(
                formula(
                  attribute(p.openingElement, 'disabled') ?? { type: 'Literal', value: false },
                ),
              ),
            )
        }
      return result
    }
    const submitters = (opening) => {
      const found = []
      const id = attribute(opening, 'id')?.value
      for (const root of [
        opening.parent,
        ...controls.filter((c) => id && attribute(c, 'form')?.value === id),
      ])
        walk(root, (n) => {
          if (
            n.type !== 'JSXOpeningElement' ||
            (!['button', 'input'].includes(n.name.name) &&
              !(attribute(n, 'disabled') && attribute(n, 'type')?.value === 'submit'))
          )
            return
          let form = n.parent.parent
          while (form && !(form.type === 'JSXElement' && form.openingElement.name.name === 'form'))
            form = form.parent
          const target = attribute(n, 'form')
          if (target ? !(id && target.value === id) : form !== opening.parent) return
          const type = attribute(n, 'type'),
            name = n.name.name
          const canSubmit = (t) =>
            init(t)
              ? canSubmit(init(t))
              : !t
                ? name === 'button'
                : t.type === 'Literal'
                  ? name === 'input'
                    ? ['submit', 'image'].includes(t.value)
                    : !['button', 'reset'].includes(t.value)
                  : t.type === 'ConditionalExpression'
                    ? canSubmit(t.consequent) || canSubmit(t.alternate)
                    : true
          if (canSubmit(type)) found.push(n)
        })
      return found
    }
    return {
      ReturnStatement(node) {
        const guard = returnedToggleGuard(node)
        if (guard)
          context.report({
            node: guard,
            messageId: 'privatePendingToggle',
            data: { guard: source.getText(guard) },
          })
      },
      JSXOpeningElement(n) {
        controls.push(n)
      },
      'Program:exit'() {
        if (!controls.length) return
        for (const scope of source.scopeManager.scopes)
          for (const binding of scope.variables) {
            const fn = fnFor(binding.identifiers[0])
            if (!fn || !owner(fn)) continue
            const refs = binding.references.filter((r) => !r.init && runtimeReference(r))
            if (
              !refs.length ||
              refs.some(
                (r) =>
                  r.identifier.parent.type !== 'CallExpression' ||
                  r.identifier.parent.callee !== r.identifier,
              )
            )
              continue
            for (const [i, param] of fn.params.entries())
              if (param.type === 'Identifier') {
                const args = refs.map((r) => r.identifier.parent.arguments[i])
                if (args.every((a) => a && key(a) === key(args[0])))
                  argumentsFor.set(variable(param), args[0])
              }
          }
        for (const control of controls)
          for (const attr of control.attributes) {
            const native = control.name.type === 'JSXIdentifier' && /^[a-z]/.test(control.name.name)
            if (!native && !attribute(control, 'disabled')) continue
            if (
              attr.type !== 'JSXAttribute' ||
              !/^on[A-Z]/.test(attr.name.name) ||
              (!ACTIVATION.test(attr.name.name) && !attribute(control, 'disabled')) ||
              attribute(control, attr.name.name) !== attr.value?.expression
            )
              continue
            const mount = mounted(control),
              form = attr.name.name === 'onSubmit' && control.name.name === 'form'
            let availability = and(mount, enabled(control))
            if (/^onKey/.test(attr.name.name) && attribute(control, 'role'))
              availability = and(availability, formula(attribute(control, 'role')))
            if (form) {
              const buttons = submitters(control)
              if (buttons.length)
                availability = and(
                  mount,
                  or(
                    buttons.map((b) => and(mounted(b), enabled(b))).reduce(or, false),
                    and(
                      not(buttons.map((b) => mounted(b)).reduce(or, false)),
                      controls
                        .filter(
                          (n) =>
                            n.name.name === 'input' &&
                            contains(control.parent, n) &&
                            ![
                              'button',
                              'submit',
                              'reset',
                              'image',
                              'hidden',
                              'checkbox',
                              'radio',
                              'file',
                              'color',
                              'range',
                            ].includes(attribute(n, 'type')?.value),
                        )
                        .map((n) => and(mounted(n), enabled(n)))
                        .reduce(or, false),
                    ),
                  ),
                )
            }
            if (form) {
              const children = control.parent.children.filter(
                (c) => c.type !== 'JSXText' || c.value.trim(),
              )
              const group =
                children.length === 1 &&
                children[0].type === 'JSXElement' &&
                children[0].openingElement.name.name === 'fieldset'
                  ? children[0]
                  : null
              if (
                group &&
                !group.children.some(
                  (c) => c.type === 'JSXElement' && c.openingElement.name.name === 'legend',
                )
              )
                availability = and(
                  availability,
                  not(
                    formula(
                      attribute(group.openingElement, 'disabled') ?? {
                        type: 'Literal',
                        value: false,
                      },
                    ),
                  ),
                )
            }
            const dropped = []
            for (const { fn, condition, guards, empty } of selection(attr.value.expression))
              for (const path of empty
                ? [{ condition: true, guards: [], prevented: false }]
                : guardPaths(fn)) {
                // An omitted optional listener does not make passive markup a control.
                // Imported components can supply their own fallback or default action.
                if (
                  empty &&
                  !(
                    native &&
                    (control.name.name === 'button' ||
                      (control.name.name === 'input' &&
                        attribute(control, 'type')?.value === 'button') ||
                      attribute(control, 'role')?.value === 'button')
                  )
                )
                  continue
                if (control.name.name === 'a' && attribute(control, 'href') && !path.prevented)
                  continue
                const change = attribute(control, 'onChange')
                if (
                  control.name.name === 'input' &&
                  ['checkbox', 'radio'].includes(attribute(control, 'type')?.value) &&
                  [
                    'Identifier',
                    'MemberExpression',
                    'ArrowFunctionExpression',
                    'FunctionExpression',
                  ].includes(change?.type) &&
                  !(change.type === 'Identifier' && change.name === 'undefined') &&
                  attr.name.name === 'onClick' &&
                  !path.prevented
                )
                  continue
                const click = attribute(control, 'onClick')
                if (
                  native &&
                  control.name.name === 'button' &&
                  attr.name.name !== 'onClick' &&
                  [
                    'Identifier',
                    'MemberExpression',
                    'ArrowFunctionExpression',
                    'FunctionExpression',
                  ].includes(click?.type) &&
                  !(click.type === 'Identifier' && click.name === 'undefined') &&
                  !path.prevented
                )
                  continue
                if (
                  native &&
                  attr.name.name === 'onClick' &&
                  !path.prevented &&
                  controls.some(
                    (candidate) =>
                      candidate.name.name === 'form' && submitters(candidate).includes(control),
                  )
                )
                  continue
                if (!possible(and(availability, and(condition, path.condition)))) continue
                const facts = joinGuards(guards, path.guards)
                const targets = form ? submitters(control) : [control]
                if (
                  !facts?.length ||
                  !facts.every((guard) =>
                    [control, ...targets].every((target) => visibleAt(guard, target)),
                  )
                )
                  continue
                dropped.push(facts)
              }
            if (!dropped.length) continue
            const conditionText = conditionFor(dropped)
            const disabledText = (target) =>
              attribute(target, 'disabled')
                ? conditionFor(dropped, attribute(target, 'disabled'))
                : conditionText
            const buttons = form ? submitters(control) : []
            // Rendering only when the action can run is offered for a single control alone: hiding a
            // form while `!body.trim()` also hides the field that would make it available. No early
            // render return is offered either, since the guard may be state the page itself changes.
            const whenAble = `only when it can act: {${availableFor(dropped)} && …}.`
            const fix = form
              ? buttons.length
                ? `Add ${buttons
                    .map(
                      (button) =>
                        `disabled={${disabledText(button)}} on line ${button.loc.start.line}`,
                    )
                    .join(', ')}.`
                : `Unmount this form while ${conditionText}.`
              : takesDisabled(control)
                ? `Add disabled={${disabledText(control)}}, or render it ${whenAble}`
                : `Render it ${whenAble}`
            context.report({
              node: control,
              messageId: 'droppedAction',
              data: { fix, condition: conditionText },
            })
            break
          }
      },
    }
  },
}
