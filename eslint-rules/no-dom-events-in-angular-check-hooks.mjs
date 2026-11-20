/**
 * molecule-only rule (Angular packages): no synchronous DOM event in a change-detection hook.
 *
 * `focus()`, `blur()`, `click()` and `dispatchEvent()` fire their events synchronously, so every
 * listener runs at once, and Angular runs `ngOnChanges`, `ngOnInit`, `ngDoCheck` and the
 * `ngAfterContent*` / `ngAfterView*` hooks while it is still checking the view, and `ngOnDestroy`
 * too for a view its parent's template removes (`@if`, `@for`). A state change one
 * of those listeners makes there is never rendered: Angular clears the dirty marks when the check
 * ends. A DeviceFrameSelector that focused its menu row in `ngAfterViewChecked` left the trigger's
 * Tooltip open over the menu, because the Tooltip hid on that focusout and nothing re-rendered it.
 * `afterNextRender` (once) and `afterEveryRender` (every render) from `@angular/core` run after
 * the check, where such a change is rendered; from `ngOnDestroy`, pass an injector that outlives the
 * component (`inject(EnvironmentInjector)`).
 *
 * The hook's own body is checked, and every method of the same class it calls as `this.name()`,
 * through any depth. A function nested in them counts as deferred (a timer, a promise, an
 * after-render callback) unless it is the callback of a synchronous array method.
 */
const HOOKS = new Set([
  'ngOnChanges',
  'ngOnInit',
  'ngDoCheck',
  'ngAfterContentInit',
  'ngAfterContentChecked',
  'ngAfterViewInit',
  'ngAfterViewChecked',
  'ngOnDestroy',
])
const EVENTS = new Set(['focus', 'blur', 'click', 'dispatchEvent'])
const SYNC_CALLBACKS = new Set([
  'forEach',
  'map',
  'flatMap',
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'some',
  'every',
  'reduce',
  'reduceRight',
])

const nameOf = (node) =>
  node?.type === 'Identifier'
    ? node.name
    : node?.type === 'PrivateIdentifier'
      ? `#${node.name}`
      : undefined
const isFunction = (node) =>
  node?.type === 'ArrowFunctionExpression' ||
  node?.type === 'FunctionExpression' ||
  node?.type === 'FunctionDeclaration'

/** Whether a nested function runs as part of the call that contains it (an array method's callback). */
const runsInline = (fn) => {
  const call = fn.parent
  return (
    call?.type === 'CallExpression' &&
    call.arguments.includes(fn) &&
    call.callee.type === 'MemberExpression' &&
    SYNC_CALLBACKS.has(nameOf(call.callee.property))
  )
}

/** Visits every node of a function body, skipping nested functions that run later. */
const walk = (node, visit) => {
  if (!node || typeof node.type !== 'string') return
  visit(node)
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue
    const child = node[key]
    for (const item of Array.isArray(child) ? child : [child]) {
      if (!item || typeof item.type !== 'string') continue
      if (isFunction(item) && !runsInline(item)) continue
      walk(item, visit)
    }
  }
}

export default {
  meta: {
    type: 'problem',
    schema: [],
    docs: {
      description:
        'Disallow focus(), blur(), click() and dispatchEvent() while Angular checks the view (lifecycle hooks and the methods they call).',
    },
    messages: {
      event:
        '`{{call}}()` runs in `{{hook}}`{{path}}, while Angular is still checking the view: a state change its event listeners make (a Tooltip hiding on focusout) is never rendered. Call it from `afterNextRender(() => …)` (once) or `afterEveryRender(() => …)` (every render) from @angular/core{{injector}}.',
    },
  },
  create(context) {
    return {
      ClassBody(body) {
        const methods = new Map()
        for (const member of body.body)
          if (member.type === 'MethodDefinition' && isFunction(member.value))
            methods.set(nameOf(member.key), member.value)
        const reported = new WeakSet()
        for (const hook of HOOKS) {
          const fn = methods.get(hook)
          if (!fn) continue
          const seen = new Set([hook])
          const queue = [[fn, []]]
          while (queue.length) {
            const [current, path] = queue.shift()
            walk(current.body, (node) => {
              if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression') return
              const callee = nameOf(node.callee.property)
              if (
                node.callee.object.type === 'ThisExpression' &&
                methods.has(callee) &&
                !seen.has(callee)
              ) {
                seen.add(callee)
                queue.push([methods.get(callee), [...path, callee]])
                return
              }
              if (!EVENTS.has(callee) || reported.has(node)) return
              reported.add(node)
              context.report({
                node,
                messageId: 'event',
                data: {
                  call: callee,
                  hook,
                  injector:
                    hook === 'ngOnDestroy'
                      ? ", with `{ injector: inject(EnvironmentInjector) }` (the component's own injector is being destroyed)"
                      : '',
                  path: path.length
                    ? ` (through ${path.map((m) => `this.${m}()`).join(' → ')})`
                    : '',
                },
              })
            })
          }
        }
      },
    }
  },
}
