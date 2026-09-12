/**
 * The in-page half of the Playwright-shaped page.
 *
 * `String(installE2ERuntime)` is sent through a bond's `evaluate` and run once
 * per document; it installs `globalThis.__molE2E`, a dispatcher the page
 * driver calls with `{ fn, args }`. Everything Playwright-shaped — locator
 * chains, `getByRole` semantics, actionability (visible, enabled, not covered
 * by another element), auto-waiting, the expect matchers' probes, `page.request`,
 * mouse/keyboard synthesis — lives here so the wire carries one call per action.
 *
 * Self-contained by construction: no imports, no closures over module scope,
 * plain ES2022 (the COMPILED text is what runs in the page). Keep it that way.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */

/** Serialised text matcher (a RegExp cannot cross the wire). */
export interface TextMatch {
  s?: string
  exact?: boolean
  ignoreCase?: boolean
  re?: { source: string; flags: string }
}

/** One step of a locator chain. */
export type LocatorStep =
  | { k: 'css'; sel: string }
  /** A Playwright selector string, parsed in the page (`>>`, `text=`, `xpath=`, `nth=`, `:has-text()`...). */
  | { k: 'raw'; sel: string }
  | { k: 'text'; m: TextMatch }
  | { k: 'xpath'; expr: string }
  | {
      k: 'role'
      role: string
      name?: TextMatch
      level?: number
      checked?: boolean
      pressed?: boolean
      expanded?: boolean
      selected?: boolean
      disabled?: boolean
      includeHidden?: boolean
    }
  | { k: 'label'; m: TextMatch }
  | { k: 'placeholder'; m: TextMatch }
  | { k: 'testid'; attr: string; m: TextMatch }
  | { k: 'title'; m: TextMatch }
  | { k: 'alt'; m: TextMatch }
  | { k: 'nth'; i: number }
  | { k: 'visible' }
  | {
      k: 'filter'
      hasText?: TextMatch
      hasNotText?: TextMatch
      has?: LocatorStep[]
      hasNot?: LocatorStep[]
    }

/** The page-side dispatcher's request shape. */
export interface RuntimeCall {
  fn: string
  args: unknown[]
}

/** Bumped when the in-page runtime's protocol changes; a page holding an older one is re-installed. */
export const E2E_RUNTIME_VERSION = 2

/**
 * Install the runtime. Runs INSIDE the page — see the module doc; the body
 * must stay self-contained.
 *
 * The runtime never waits: every call is ONE attempt, and a call that would
 * have to wait (an element not there yet, not visible yet, covered) answers
 * `{ retry: true, error }` so the DRIVER polls with its own clock. A page in a
 * background tab has its timers throttled to once a second (a minute, after a
 * while) — a `setTimeout` in here would stretch every auto-wait by that much,
 * while the WebSocket messages that carry the calls are delivered on time.
 */
export function installE2ERuntime(): { version: number } {
  const VERSION = 2
  type Match = {
    s?: string
    exact?: boolean
    ignoreCase?: boolean
    re?: { source: string; flags: string }
  }
  type Step = Record<string, unknown> & { k: string }
  type Dict = Record<string, unknown>
  const g = globalThis as unknown as {
    __molE2E?: { version: number; call: (req: Dict) => Promise<unknown> }
  }
  if (g.__molE2E && g.__molE2E.version === VERSION) return { version: VERSION }

  const norm = (s: string | null | undefined): string => (s ?? '').replace(/\s+/g, ' ').trim()
  const matchText = (text: string, m: Match | undefined): boolean => {
    if (!m) return true
    if (m.re) return new RegExp(m.re.source, m.re.flags).test(text)
    const a = norm(text)
    const b = norm(m.s ?? '')
    if (m.exact) return m.ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b
    return m.ignoreCase === false ? a.includes(b) : a.toLowerCase().includes(b.toLowerCase())
  }
  const matchFull = (text: string, m: Match): boolean => {
    if (m.re) return new RegExp(m.re.source, m.re.flags).test(text)
    const a = norm(text)
    const b = norm(m.s ?? '')
    return m.ignoreCase ? a.toLowerCase() === b.toLowerCase() : a === b
  }
  const matchSub = (text: string, m: Match): boolean => {
    if (m.re) return new RegExp(m.re.source, m.re.flags).test(text)
    const a = norm(text)
    const b = norm(m.s ?? '')
    return m.ignoreCase ? a.toLowerCase().includes(b.toLowerCase()) : a.includes(b)
  }

  const isVisible = (el: Element): boolean => {
    if (el.tagName === 'OPTION') {
      const sel = el.closest('select, datalist')
      return sel ? isVisible(sel) : false
    }
    const r = el.getBoundingClientRect()
    if (!(r.width || r.height)) return false
    if (getComputedStyle(el).visibility === 'hidden') return false
    return true
  }
  const isDisabled = (el: Element): boolean => {
    if (el.matches(':disabled')) return true
    if (el.getAttribute('aria-disabled') === 'true') return true
    const fs = el.closest('fieldset:disabled')
    if (fs && !el.closest('legend')) return true
    return false
  }
  const isEditable = (el: Element): boolean => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
      return !el.readOnly && !isDisabled(el)
    if (el instanceof HTMLSelectElement) return !isDisabled(el)
    return (el as HTMLElement).isContentEditable === true
  }
  const isCheckable = (el: Element): boolean =>
    (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) ||
    ['checkbox', 'radio', 'switch', 'menuitemcheckbox', 'menuitemradio'].includes(
      el.getAttribute('role') ?? '',
    )
  const isChecked = (el: Element): boolean => {
    if (el instanceof HTMLInputElement) return el.checked
    return el.getAttribute('aria-checked') === 'true'
  }
  const isFocusable = (el: Element): boolean => {
    if (isDisabled(el)) return false
    if (el instanceof HTMLElement && el.tabIndex >= 0) return true
    return el.matches('a[href], button, input, select, textarea, summary, [contenteditable="true"]')
  }

  // ---- accessibility: role + name (the subset getByRole needs) ----
  const roleOf = (el: Element): string | null => {
    const explicit = (el.getAttribute('role') ?? '').trim().split(/\s+/)[0]
    if (explicit) return explicit
    const tag = el.tagName.toLowerCase()
    switch (tag) {
      case 'a':
      case 'area':
        return el.hasAttribute('href') ? 'link' : null
      case 'article':
        return 'article'
      case 'aside':
        return 'complementary'
      case 'blockquote':
        return 'blockquote'
      case 'button':
      case 'summary':
        return 'button'
      case 'caption':
        return 'caption'
      case 'code':
        return 'code'
      case 'datalist':
        return 'listbox'
      case 'dd':
        return 'definition'
      case 'del':
        return 'deletion'
      case 'details':
      case 'fieldset':
      case 'optgroup':
      case 'hgroup':
        return 'group'
      case 'dialog':
        return 'dialog'
      case 'dt':
        return 'term'
      case 'em':
        return 'emphasis'
      case 'figure':
        return 'figure'
      case 'footer':
        return el.closest('article, aside, main, nav, section') ? 'generic' : 'contentinfo'
      case 'form':
        return 'form'
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return 'heading'
      case 'header':
        return el.closest('article, aside, main, nav, section') ? 'generic' : 'banner'
      case 'hr':
        return 'separator'
      case 'html':
        return 'document'
      case 'img':
        return el.getAttribute('alt') === '' ? 'presentation' : 'img'
      case 'input': {
        const type = (el as HTMLInputElement).type
        const list = el.hasAttribute('list')
        if (['button', 'submit', 'reset', 'image'].includes(type)) return 'button'
        if (type === 'checkbox') return 'checkbox'
        if (type === 'radio') return 'radio'
        if (type === 'range') return 'slider'
        if (type === 'number') return 'spinbutton'
        if (type === 'search') return list ? 'combobox' : 'searchbox'
        if (['email', 'tel', 'text', 'url'].includes(type)) return list ? 'combobox' : 'textbox'
        return null
      }
      case 'ins':
        return 'insertion'
      case 'li':
        return 'listitem'
      case 'main':
        return 'main'
      case 'math':
        return 'math'
      case 'menu':
      case 'ol':
      case 'ul':
        return 'list'
      case 'meter':
        return 'meter'
      case 'nav':
        return 'navigation'
      case 'option':
        return 'option'
      case 'output':
        return 'status'
      case 'p':
        return 'paragraph'
      case 'progress':
        return 'progressbar'
      case 'search':
        return 'search'
      case 'section':
        return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') ? 'region' : null
      case 'select': {
        const s = el as HTMLSelectElement
        return s.multiple || s.size > 1 ? 'listbox' : 'combobox'
      }
      case 'strong':
        return 'strong'
      case 'sub':
        return 'subscript'
      case 'sup':
        return 'superscript'
      case 'table':
        return 'table'
      case 'tbody':
      case 'thead':
      case 'tfoot':
        return 'rowgroup'
      case 'td':
        return 'cell'
      case 'textarea':
        return 'textbox'
      case 'th':
        return el.getAttribute('scope') === 'row' ? 'rowheader' : 'columnheader'
      case 'time':
        return 'time'
      case 'tr':
        return 'row'
      default:
        return null
    }
  }
  const textFromContent = (el: Element): string => {
    let out = ''
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3) out += node.textContent ?? ''
      else if (node.nodeType === 1) {
        const child = node as Element
        const label = child.getAttribute('aria-label')
        if (label) out += ' ' + label + ' '
        else if (child.tagName === 'IMG') out += ' ' + (child.getAttribute('alt') ?? '') + ' '
        else if (child.tagName === 'SVG' && child.querySelector('title'))
          out += ' ' + (child.querySelector('title')?.textContent ?? '') + ' '
        else if (getComputedStyle(child).display !== 'none') out += textFromContent(child)
      }
    }
    return out
  }
  const accessibleName = (el: Element): string => {
    const labelledby = el.getAttribute('aria-labelledby')
    if (labelledby) {
      const parts = labelledby
        .split(/\s+/)
        .map((id) => document.getElementById(id))
        .filter((n): n is HTMLElement => !!n)
        .map((n) => textFromContent(n))
      if (parts.length) return norm(parts.join(' '))
    }
    const ariaLabel = el.getAttribute('aria-label')
    if (ariaLabel && ariaLabel.trim()) return norm(ariaLabel)
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      const labels = (el as HTMLInputElement).labels
      if (labels && labels.length)
        return norm(
          Array.from(labels)
            .map((l) => textFromContent(l))
            .join(' '),
        )
      if (el instanceof HTMLInputElement) {
        if (['button', 'submit', 'reset'].includes(el.type))
          return norm(
            el.value || (el.type === 'submit' ? 'Submit' : el.type === 'reset' ? 'Reset' : ''),
          )
        if (el.type === 'image')
          return norm(el.getAttribute('alt') ?? el.getAttribute('title') ?? '')
      }
      const ph = el.getAttribute('placeholder')
      if (ph) return norm(ph)
      return norm(el.getAttribute('title') ?? '')
    }
    if (el.tagName === 'IMG' || el.tagName === 'AREA')
      return norm(el.getAttribute('alt') ?? el.getAttribute('title') ?? '')
    if (el.tagName.toLowerCase() === 'svg')
      return norm(el.querySelector('title')?.textContent ?? '')
    const fromContent = norm(textFromContent(el))
    if (fromContent) return fromContent
    return norm(el.getAttribute('title') ?? '')
  }
  const headingLevel = (el: Element): number | null => {
    const m = /^H([1-6])$/.exec(el.tagName)
    if (m) return Number(m[1])
    const aria = el.getAttribute('aria-level')
    return aria ? Number(aria) : null
  }

  // ---- locator resolution ----
  const parseSelector = (selector: string): Step[] => {
    // Playwright selector string → steps. Supports `>>` chaining, `text=`, `xpath=`,
    // `nth=`, `css=`, `id=`, `data-testid=`, and CSS with :has-text()/:text()/:text-is()/:visible.
    const steps: Step[] = []
    const parts = selector.split(/\s*>>\s*/)
    for (const raw of parts) {
      const part = raw.trim()
      if (!part) continue
      let m: RegExpExecArray | null
      if ((m = /^text=(.*)$/s.exec(part))) {
        const v = m[1]
        const quoted = /^"(.*)"$/s.exec(v) ?? /^'(.*)'$/s.exec(v)
        steps.push(
          quoted ? { k: 'text', m: { s: quoted[1], exact: true } } : { k: 'text', m: { s: v } },
        )
      } else if ((m = /^xpath=(.*)$/s.exec(part)) || (m = /^(\/\/.*)$/s.exec(part))) {
        steps.push({ k: 'xpath', expr: m[1] })
      } else if ((m = /^nth=(-?\d+)$/.exec(part))) {
        steps.push({ k: 'nth', i: Number(m[1]) })
      } else if ((m = /^id=(.*)$/.exec(part))) {
        const escaped =
          typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
            ? CSS.escape(m[1])
            : m[1].replace(/([^\w-])/g, '\\$1')
        steps.push({ k: 'css', sel: '#' + escaped })
      } else if ((m = /^data-testid=(.*)$/.exec(part))) {
        steps.push({ k: 'testid', attr: 'data-testid', m: { s: m[1], exact: true } })
      } else if ((m = /^css=(.*)$/s.exec(part))) {
        steps.push(...cssWithPseudo(m[1]))
      } else {
        steps.push(...cssWithPseudo(part))
      }
    }
    return steps
  }
  const cssWithPseudo = (sel: string): Step[] => {
    const out: Step[] = []
    let css = sel
    let visible = false
    const filters: Match[] = []
    let leafText: Match | null = null
    css = css.replace(/:has-text\((["'])(.*?)\1\)/g, (_a, _q, t) => {
      filters.push({ s: t })
      return ''
    })
    css = css.replace(/:text-is\((["'])(.*?)\1\)/g, (_a, _q, t) => {
      leafText = { s: t, exact: true }
      return ''
    })
    css = css.replace(/:text\((["'])(.*?)\1\)/g, (_a, _q, t) => {
      leafText = { s: t }
      return ''
    })
    if (/:visible\b/.test(css)) {
      visible = true
      css = css.replace(/:visible\b/g, '')
    }
    out.push({ k: 'css', sel: css.trim() || '*' })
    for (const f of filters) out.push({ k: 'filter', hasText: f })
    if (leafText) out.push({ k: 'text', m: leafText })
    if (visible) out.push({ k: 'visible' })
    return out
  }
  const textCandidates = (root: ParentNode, m: Match): Element[] => {
    const all = Array.from(root.querySelectorAll('*')).filter((el) => {
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) return false
      return matchText(el.textContent ?? '', m)
    })
    // The smallest elements that still match: drop any candidate containing another candidate.
    const set = new Set(all)
    return all.filter((el) => !Array.from(set).some((other) => other !== el && el.contains(other)))
  }
  const labelTargets = (root: ParentNode, m: Match): Element[] => {
    const out = new Set<Element>()
    for (const label of Array.from(root.querySelectorAll('label'))) {
      if (!matchText(textFromContent(label), m)) continue
      const control =
        (label as HTMLLabelElement).control ??
        label.querySelector('input, select, textarea, button')
      if (control) out.add(control)
    }
    for (const el of Array.from(root.querySelectorAll('[aria-label], [aria-labelledby]'))) {
      if (matchText(accessibleName(el), m)) out.add(el)
    }
    return Array.from(out)
  }
  const resolveStep = (step: Step, roots: Element[] | null, docRoot: ParentNode): Element[] => {
    const scopes: ParentNode[] = roots ?? [docRoot]
    const within = (fn: (root: ParentNode) => Element[]): Element[] => {
      const out: Element[] = []
      const seen = new Set<Element>()
      for (const r of scopes)
        for (const el of fn(r))
          if (!seen.has(el)) {
            seen.add(el)
            out.push(el)
          }
      return out
    }
    switch (step.k) {
      case 'css':
        return within((r) => Array.from(r.querySelectorAll(step.sel as string)))
      case 'text':
        return within((r) => textCandidates(r, step.m as Match))
      case 'xpath':
        return within((r) => {
          const res = document.evaluate(
            step.expr as string,
            r as Node,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null,
          )
          const out: Element[] = []
          for (let i = 0; i < res.snapshotLength; i++) {
            const n = res.snapshotItem(i)
            if (n && n.nodeType === 1) out.push(n as Element)
          }
          return out
        })
      case 'role':
        return within((r) =>
          Array.from(r.querySelectorAll('*')).filter((el) => {
            if (roleOf(el) !== step.role) return false
            if (!step.includeHidden && !isVisible(el)) return false
            if (step.name !== undefined && !matchText(accessibleName(el), step.name as Match))
              return false
            if (step.level !== undefined && headingLevel(el) !== step.level) return false
            if (step.checked !== undefined && isChecked(el) !== step.checked) return false
            if (
              step.pressed !== undefined &&
              (el.getAttribute('aria-pressed') === 'true') !== step.pressed
            )
              return false
            if (
              step.expanded !== undefined &&
              (el.getAttribute('aria-expanded') === 'true') !== step.expanded
            )
              return false
            if (step.selected !== undefined) {
              const sel =
                el instanceof HTMLOptionElement
                  ? el.selected
                  : el.getAttribute('aria-selected') === 'true'
              if (sel !== step.selected) return false
            }
            if (step.disabled !== undefined && isDisabled(el) !== step.disabled) return false
            return true
          }),
        )
      case 'label':
        return within((r) => labelTargets(r, step.m as Match))
      case 'placeholder':
        return within((r) =>
          Array.from(r.querySelectorAll('[placeholder]')).filter((el) =>
            matchText(el.getAttribute('placeholder') ?? '', step.m as Match),
          ),
        )
      case 'testid':
        return within((r) =>
          Array.from(r.querySelectorAll('[' + (step.attr as string) + ']')).filter((el) =>
            matchFull(el.getAttribute(step.attr as string) ?? '', step.m as Match),
          ),
        )
      case 'title':
        return within((r) =>
          Array.from(r.querySelectorAll('[title]')).filter((el) =>
            matchText(el.getAttribute('title') ?? '', step.m as Match),
          ),
        )
      case 'alt':
        return within((r) =>
          Array.from(r.querySelectorAll('[alt]')).filter((el) =>
            matchText(el.getAttribute('alt') ?? '', step.m as Match),
          ),
        )
      case 'nth': {
        const list = roots ?? []
        const i = step.i as number
        const el = i < 0 ? list[list.length + i] : list[i]
        return el ? [el] : []
      }
      case 'visible':
        return (roots ?? []).filter(isVisible)
      case 'filter': {
        const list = roots ?? []
        return list.filter((el) => {
          if (step.hasText && !matchText(el.textContent ?? '', step.hasText as Match)) return false
          if (step.hasNotText && matchText(el.textContent ?? '', step.hasNotText as Match))
            return false
          if (step.has && resolveChain(step.has as Step[], el).length === 0) return false
          if (step.hasNot && resolveChain(step.hasNot as Step[], el).length > 0) return false
          return true
        })
      }
      default:
        throw new Error('unknown locator step: ' + step.k)
    }
  }
  const resolveChain = (steps: Step[], root: ParentNode = document): Element[] => {
    let current: Element[] | null = null
    const expanded: Step[] = []
    for (const step of steps) {
      if (step.k === 'raw') expanded.push(...parseSelector(String(step.sel)))
      else expanded.push(step)
    }
    for (const step of expanded) {
      if (['nth', 'visible', 'filter'].includes(step.k))
        current = resolveStep(
          step,
          current ?? resolveStep({ k: 'css', sel: '*' }, null, root),
          root,
        )
      else current = resolveStep(step, current, root)
    }
    return current ?? []
  }
  const describe = (steps: Step[]): string =>
    steps
      .map((s) => {
        const t = (m: Match | undefined) =>
          m ? (m.re ? '/' + m.re.source + '/' + m.re.flags : JSON.stringify(m.s)) : ''
        switch (s.k) {
          case 'css':
          case 'raw':
            return 'locator(' + JSON.stringify(s.sel) + ')'
          case 'text':
            return 'getByText(' + t(s.m as Match) + ')'
          case 'xpath':
            return 'locator(' + JSON.stringify('xpath=' + s.expr) + ')'
          case 'role':
            return (
              'getByRole(' +
              JSON.stringify(s.role) +
              (s.name !== undefined ? ', { name: ' + t(s.name as Match) + ' }' : '') +
              ')'
            )
          case 'label':
            return 'getByLabel(' + t(s.m as Match) + ')'
          case 'placeholder':
            return 'getByPlaceholder(' + t(s.m as Match) + ')'
          case 'testid':
            return 'getByTestId(' + t(s.m as Match) + ')'
          case 'title':
            return 'getByTitle(' + t(s.m as Match) + ')'
          case 'alt':
            return 'getByAltText(' + t(s.m as Match) + ')'
          case 'nth':
            return s.i === 0 ? 'first()' : s.i === -1 ? 'last()' : 'nth(' + s.i + ')'
          case 'visible':
            return 'filter({ visible: true })'
          case 'filter':
            return (
              'filter(' +
              JSON.stringify({
                hasText: (s.hasText as Match | undefined)?.s,
                hasNotText: (s.hasNotText as Match | undefined)?.s,
              }) +
              ')'
            )
          default:
            return s.k
        }
      })
      .join('.')

  // ---- events ----
  const fire = (el: Element, type: string, init: Dict = {}): boolean => {
    const base = { bubbles: true, cancelable: true, composed: true }
    let ev: Event
    if (/^(pointer)/.test(type))
      ev =
        typeof PointerEvent === 'function'
          ? new PointerEvent(type, {
              ...base,
              pointerId: 1,
              pointerType: 'mouse',
              isPrimary: true,
              ...init,
            })
          : new MouseEvent(type, { ...base, ...init })
    else if (/^(mouse|click|dblclick|contextmenu)/.test(type))
      ev = new MouseEvent(type, { ...base, ...init })
    else if (/^key/.test(type)) ev = new KeyboardEvent(type, { ...base, ...init })
    else if (/^(input|beforeinput)$/.test(type)) ev = new InputEvent(type, { ...base, ...init })
    else if (/^(focus|blur)/.test(type))
      ev = new FocusEvent(type, { bubbles: type.endsWith('in') || type.endsWith('out'), ...init })
    else if (/^touch/.test(type)) ev = new Event(type, base)
    else ev = new Event(type, base)
    return el.dispatchEvent(ev)
  }
  const nativeSetValue = (el: Element, value: string): void => {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc && desc.set) desc.set.call(el, value)
    else (el as HTMLInputElement).value = value
  }
  const insertText = (el: Element, text: string): void => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const next = el.value.slice(0, start) + text + el.value.slice(end)
      fire(el, 'beforeinput', { inputType: 'insertText', data: text })
      nativeSetValue(el, next)
      try {
        el.setSelectionRange(start + text.length, start + text.length)
      } catch (_error) {
        /* type=number etc. */
      }
      fire(el, 'input', { inputType: 'insertText', data: text })
    } else if ((el as HTMLElement).isContentEditable) {
      let done: boolean
      try {
        done = document.execCommand('insertText', false, text)
      } catch (_error) {
        done = false
      }
      if (!done) {
        el.textContent = (el.textContent ?? '') + text
        fire(el, 'input', { inputType: 'insertText', data: text })
      }
    }
  }
  const pointAt = (el: Element, position?: { x: number; y: number }): { x: number; y: number } => {
    const r = el.getBoundingClientRect()
    return {
      x: r.left + (position ? position.x : r.width / 2),
      y: r.top + (position ? position.y : r.height / 2),
    }
  }
  const hitOk = (el: Element, hit: Element | null): boolean => {
    if (!hit) return false
    if (hit === el || el.contains(hit) || hit.contains(el)) return true
    // A <label> covering its control, or a control's label: Playwright retargets both ways.
    const lbl = hit.closest('label') as HTMLLabelElement | null
    if (lbl && lbl.control === el) return true
    const elLbl = el.closest('label') as HTMLLabelElement | null
    if (elLbl && elLbl.control === hit) return true
    return false
  }
  const clickAt = (el: Element, x: number, y: number, opts: Dict): void => {
    const button = opts.button === 'right' ? 2 : opts.button === 'middle' ? 1 : 0
    const mods = (opts.modifiers as string[] | undefined) ?? []
    const init: Dict = {
      clientX: x,
      clientY: y,
      button,
      buttons: button === 0 ? 1 : button === 2 ? 2 : 4,
      detail: 1,
      ctrlKey: mods.includes('Control') || mods.includes('ControlOrMeta'),
      shiftKey: mods.includes('Shift'),
      altKey: mods.includes('Alt'),
      metaKey: mods.includes('Meta'),
    }
    fire(el, 'pointermove', { ...init, buttons: 0 })
    fire(el, 'mousemove', { ...init, buttons: 0 })
    fire(el, 'pointerdown', init)
    const proceed = fire(el, 'mousedown', init)
    if (proceed) {
      const focusTarget = isFocusable(el)
        ? el
        : (el.closest('a[href], button, input, select, textarea, [tabindex]') ?? null)
      if (focusTarget && focusTarget !== document.activeElement)
        (focusTarget as HTMLElement).focus()
    }
    fire(el, 'pointerup', { ...init, buttons: 0 })
    fire(el, 'mouseup', { ...init, buttons: 0 })
    const count = (opts.clickCount as number | undefined) ?? 1
    for (let i = 1; i <= count; i++) {
      if (button === 2) fire(el, 'contextmenu', { ...init, detail: i })
      else fire(el, 'click', { ...init, buttons: 0, detail: i })
    }
    if (count >= 2 && button === 0) fire(el, 'dblclick', { ...init, buttons: 0, detail: 2 })
  }
  const hoverAt = (el: Element, x: number, y: number): void => {
    const init = { clientX: x, clientY: y, buttons: 0 }
    fire(el, 'pointerover', init)
    fire(el, 'pointerenter', { ...init, bubbles: false })
    fire(el, 'mouseover', init)
    fire(el, 'mouseenter', { ...init, bubbles: false })
    fire(el, 'pointermove', init)
    fire(el, 'mousemove', init)
  }
  const KEY_CODES: Record<string, string> = {
    Enter: 'Enter',
    Tab: 'Tab',
    Escape: 'Escape',
    Backspace: 'Backspace',
    Delete: 'Delete',
    ArrowUp: 'ArrowUp',
    ArrowDown: 'ArrowDown',
    ArrowLeft: 'ArrowLeft',
    ArrowRight: 'ArrowRight',
    Home: 'Home',
    End: 'End',
    PageUp: 'PageUp',
    PageDown: 'PageDown',
    ' ': 'Space',
    Space: 'Space',
  }
  const focusables = (): HTMLElement[] =>
    Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]',
      ),
    ).filter((el) => isFocusable(el) && isVisible(el) && el.tabIndex !== -1)
  const pressKey = (target: Element, combo: string): void => {
    const parts = combo.split('+')
    let key = parts.pop() ?? ''
    if (key === 'Space') key = ' '
    const mods = parts
    const init: Dict = {
      key,
      code: KEY_CODES[key] ?? (key.length === 1 ? 'Key' + key.toUpperCase() : key),
      ctrlKey: mods.includes('Control') || mods.includes('ControlOrMeta'),
      shiftKey: mods.includes('Shift'),
      altKey: mods.includes('Alt'),
      metaKey: mods.includes('Meta'),
    }
    const downOk = fire(target, 'keydown', init)
    let pressOk = true
    if (key.length === 1 || key === 'Enter')
      pressOk = fire(target, 'keypress', {
        ...init,
        charCode: key.length === 1 ? key.charCodeAt(0) : 13,
      })
    if (downOk && pressOk) {
      if (key.length === 1 && !init.ctrlKey && !init.metaKey && isEditable(target))
        insertText(target, key)
      else if (key === 'Enter') {
        if (target instanceof HTMLTextAreaElement) insertText(target, '\n')
        else if (target instanceof HTMLInputElement && target.form) {
          const form = target.form
          const submitter = form.querySelector<HTMLElement>(
            'button:not([type]), button[type="submit"], input[type="submit"]',
          )
          if (typeof form.requestSubmit === 'function') form.requestSubmit(submitter ?? undefined)
          else form.submit()
        } else if (
          target instanceof HTMLElement &&
          (target.tagName === 'BUTTON' ||
            target.tagName === 'A' ||
            target.getAttribute('role') === 'button')
        )
          target.click()
      } else if (
        key === ' ' &&
        target instanceof HTMLElement &&
        (target.tagName === 'BUTTON' ||
          isCheckable(target) ||
          target.getAttribute('role') === 'button')
      )
        target.click()
      else if (
        key === 'Backspace' &&
        isEditable(target) &&
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
      ) {
        const s = target.selectionStart ?? target.value.length
        const e = target.selectionEnd ?? target.value.length
        const from = s === e ? Math.max(0, s - 1) : s
        nativeSetValue(target, target.value.slice(0, from) + target.value.slice(e))
        try {
          target.setSelectionRange(from, from)
        } catch (_error) {
          /* ignore */
        }
        fire(target, 'input', { inputType: 'deleteContentBackward' })
      } else if (key === 'Tab') {
        const list = focusables()
        const idx = list.indexOf(document.activeElement as HTMLElement)
        const next = init.shiftKey
          ? (list[idx - 1] ?? list[list.length - 1])
          : (list[idx + 1] ?? list[0])
        if (next) next.focus()
      }
    }
    fire(target, 'keyup', init)
  }

  // ---- single-target actions with actionability + auto-wait ----
  const ACTIONS_NEEDING_VISIBLE = new Set([
    'click',
    'dblclick',
    'hover',
    'tap',
    'fill',
    'type',
    'press',
    'check',
    'uncheck',
    'setChecked',
    'selectOption',
    'focus',
    'scrollIntoViewIfNeeded',
    'clear',
  ])
  const ACTIONS_NEEDING_ENABLED = new Set([
    'click',
    'dblclick',
    'tap',
    'fill',
    'type',
    'press',
    'check',
    'uncheck',
    'setChecked',
    'selectOption',
    'clear',
  ])
  const ACTIONS_NEEDING_POINTER = new Set(['click', 'dblclick', 'hover', 'tap'])
  const act = async (steps: Step[], action: string, opts: Dict): Promise<Dict> => {
    let reason: string | undefined
    const els = resolveChain(steps)
    if (els.length > 1) return { ok: false, strict: true, count: els.length }
    const el = els[0]
    if (!el) reason = describe(steps) + ' — element not found'
    else if (ACTIONS_NEEDING_VISIBLE.has(action) && !opts.force && !isVisible(el))
      reason = describe(steps) + ' — element is not visible'
    else if (ACTIONS_NEEDING_ENABLED.has(action) && !opts.force && isDisabled(el))
      reason = describe(steps) + ' — element is disabled'
    else if (['fill', 'type', 'clear'].includes(action) && !opts.force && !isEditable(el))
      return {
        ok: false,
        error:
          describe(steps) +
          ' — element is not an <input>, <textarea>, <select> or [contenteditable] element',
      }
    else {
      if (ACTIONS_NEEDING_POINTER.has(action) || action === 'scrollIntoViewIfNeeded') {
        if (!opts.noScroll) {
          try {
            el.scrollIntoView({ block: 'center', inline: 'center' })
          } catch (_error) {
            /* ignore */
          }
        }
        if (action === 'scrollIntoViewIfNeeded') return { ok: true }
        const p = pointAt(el, opts.position as { x: number; y: number } | undefined)
        if (!opts.force) {
          const hit =
            typeof document.elementFromPoint === 'function'
              ? document.elementFromPoint(p.x, p.y)
              : null
          // A null hit with the point inside the viewport is a document that cannot hit-test
          // (jsdom, a detached rendering); treat it as uncovered rather than unreachable.
          const inView = p.x >= 0 && p.y >= 0 && p.x <= innerWidth && p.y <= innerHeight
          if (!(hit === null && inView) && !hitOk(el, hit)) {
            if (!hit || p.x < 0 || p.y < 0 || p.x > innerWidth || p.y > innerHeight)
              reason = describe(steps) + ' — element is outside of the viewport'
            else {
              const h = hit as Element
              reason =
                describe(steps) +
                ' — <' +
                h.tagName.toLowerCase() +
                (h.id ? '#' + h.id : '') +
                (h.className && typeof h.className === 'string'
                  ? '.' + h.className.trim().split(/\s+/).slice(0, 2).join('.')
                  : '') +
                '> intercepts pointer events'
            }
            return { ok: false, error: reason, retry: true }
          }
        }
        if (action === 'hover') hoverAt(el, p.x, p.y)
        else if (action === 'tap') {
          fire(el, 'touchstart')
          fire(el, 'touchend')
          clickAt(el, p.x, p.y, opts)
        } else
          clickAt(el, p.x, p.y, {
            ...opts,
            clickCount: action === 'dblclick' ? 2 : ((opts.clickCount as number | undefined) ?? 1),
          })
        return { ok: true }
      }
      if (action === 'focus') {
        ;(el as HTMLElement).focus()
        return { ok: true }
      }
      if (action === 'blur') {
        ;(el as HTMLElement).blur()
        return { ok: true }
      }
      if (action === 'fill' || action === 'clear') {
        const value = action === 'clear' ? '' : String(opts.value ?? '')
        ;(el as HTMLElement).focus()
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          const simple =
            !(el instanceof HTMLInputElement) ||
            !['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image'].includes(el.type)
          if (!simple)
            return {
              ok: false,
              error: describe(steps) + ' — cannot fill an input of type ' + el.type,
            }
          if (
            el instanceof HTMLInputElement &&
            [
              'date',
              'time',
              'datetime-local',
              'month',
              'week',
              'color',
              'range',
              'number',
            ].includes(el.type)
          ) {
            nativeSetValue(el, value)
            fire(el, 'input', { inputType: 'insertText', data: value })
          } else {
            try {
              el.select()
            } catch (_error) {
              /* ignore */
            }
            fire(el, 'beforeinput', { inputType: 'insertText', data: value })
            nativeSetValue(el, value)
            try {
              el.setSelectionRange(value.length, value.length)
            } catch (_error) {
              /* ignore */
            }
            fire(el, 'input', { inputType: 'insertText', data: value })
          }
          fire(el, 'change')
        } else if (el instanceof HTMLSelectElement) {
          nativeSetValue(el, value)
          fire(el, 'input')
          fire(el, 'change')
        } else {
          const sel = window.getSelection()
          if (sel) {
            sel.selectAllChildren(el)
          }
          let done: boolean
          try {
            done = document.execCommand('insertText', false, value)
          } catch (_error) {
            done = false
          }
          if (!done) {
            el.textContent = value
            fire(el, 'input', { inputType: 'insertText', data: value })
          }
        }
        return { ok: true }
      }
      if (action === 'type') {
        ;(el as HTMLElement).focus()
        for (const ch of String(opts.text ?? '')) pressKey(el, ch === '\n' ? 'Enter' : ch)
        return { ok: true }
      }
      if (action === 'press') {
        ;(el as HTMLElement).focus()
        pressKey(el, String(opts.key ?? ''))
        return { ok: true }
      }
      if (action === 'check' || action === 'uncheck' || action === 'setChecked') {
        if (!isCheckable(el))
          return { ok: false, error: describe(steps) + ' — not a checkbox, radio or switch' }
        const want =
          action === 'check' ? true : action === 'uncheck' ? false : Boolean(opts.checked)
        if (isChecked(el) !== want) {
          const p = pointAt(el)
          clickAt(el, p.x, p.y, {})
          if (isChecked(el) !== want)
            return {
              ok: false,
              error: describe(steps) + ' — clicking did not change its checked state',
            }
        }
        return { ok: true }
      }
      if (action === 'selectOption') {
        if (!(el instanceof HTMLSelectElement))
          return { ok: false, error: describe(steps) + ' — not a <select>' }
        const wanted = (Array.isArray(opts.values) ? opts.values : [opts.values]) as Array<
          string | { value?: string; label?: string; index?: number } | null
        >
        const chosen: string[] = []
        for (const option of Array.from(el.options)) {
          const match = wanted.some((w) => {
            if (w === null || w === undefined) return false
            if (typeof w === 'string')
              return (
                option.value === w ||
                norm(option.label) === norm(w) ||
                norm(option.textContent) === norm(w)
              )
            if (w.value !== undefined) return option.value === w.value
            if (w.label !== undefined) return norm(option.label) === norm(w.label)
            if (w.index !== undefined) return option.index === w.index
            return false
          })
          option.selected = match
          if (match) chosen.push(option.value)
        }
        if (chosen.length === 0 && wanted.length)
          return {
            ok: false,
            error: describe(steps) + ' — no option matched ' + JSON.stringify(wanted),
          }
        fire(el, 'input')
        fire(el, 'change')
        return { ok: true, values: chosen }
      }
      if (action === 'dispatchEvent') {
        const type = String(opts.type ?? '')
        const init = (opts.init as Dict | undefined) ?? {}
        fire(el, type, init)
        return { ok: true }
      }
      if (action === 'highlight') return { ok: true }
      return { ok: false, error: 'unknown action: ' + action }
    }
    return { ok: false, error: reason ?? 'waiting for ' + describe(steps), retry: true }
  }

  // ---- reads (strict) ----
  const single = async (
    steps: Step[],
    waitAttached: boolean,
  ): Promise<{ el?: Element; res?: Dict }> => {
    const els = resolveChain(steps)
    if (els.length > 1) return { res: { ok: false, strict: true, count: els.length } }
    if (els.length === 1) return { el: els[0] }
    return {
      res: {
        ok: false,
        error: describe(steps) + ' — element not found',
        retry: waitAttached,
      },
    }
  }
  const boundingBox = (
    el: Element,
  ): { x: number; y: number; width: number; height: number } | null => {
    if (!isVisible(el)) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, width: r.width, height: r.height }
  }
  const read = async (steps: Step[], what: string, args: unknown[]): Promise<Dict> => {
    if (what === 'isVisible' || what === 'isHidden') {
      const els = resolveChain(steps)
      if (els.length > 1) return { ok: false, strict: true, count: els.length }
      const vis = els.length === 1 && isVisible(els[0])
      return { ok: true, value: what === 'isVisible' ? vis : !vis }
    }
    if (what === 'count') return { ok: true, value: resolveChain(steps).length }
    const got = await single(steps, true)
    if (got.res) return got.res
    const el = got.el as Element
    switch (what) {
      case 'textContent':
        return { ok: true, value: el.textContent }
      case 'innerText':
        return { ok: true, value: (el as HTMLElement).innerText }
      case 'innerHTML':
        return { ok: true, value: el.innerHTML }
      case 'inputValue':
        if (
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
        )
          return { ok: true, value: el.value }
        return {
          ok: false,
          error: describe(steps) + ' — inputValue: not an input, textarea or select',
        }
      case 'getAttribute':
        return { ok: true, value: el.getAttribute(String(args[0])) }
      case 'isEnabled':
        return { ok: true, value: !isDisabled(el) }
      case 'isDisabled':
        return { ok: true, value: isDisabled(el) }
      case 'isEditable':
        return { ok: true, value: isEditable(el) }
      case 'isChecked':
        if (!isCheckable(el))
          return { ok: false, error: describe(steps) + ' — not a checkbox, radio or switch' }
        return { ok: true, value: isChecked(el) }
      case 'boundingBox':
        return { ok: true, value: boundingBox(el) }
      case 'ariaSnapshot':
        return {
          ok: true,
          value:
            '- ' +
            (roleOf(el) ?? el.tagName.toLowerCase()) +
            (accessibleName(el) ? ' "' + accessibleName(el) + '"' : ''),
        }
      default:
        return { ok: false, error: 'unknown read: ' + what }
    }
  }
  const readAll = (steps: Step[], what: string): Dict => {
    const els = resolveChain(steps)
    if (what === 'allTextContents')
      return { ok: true, value: els.map((el) => el.textContent ?? '') }
    if (what === 'allInnerTexts')
      return { ok: true, value: els.map((el) => (el as HTMLElement).innerText) }
    if (what === 'count') return { ok: true, value: els.length }
    return { ok: false, error: 'unknown readAll: ' + what }
  }
  const runFn = (source: string): ((...a: unknown[]) => unknown) =>
    new Function('return (' + source + ')')() as (...a: unknown[]) => unknown
  const evalOn = async (steps: Step[], source: string, arg: unknown): Promise<Dict> => {
    const got = await single(steps, true)
    if (got.res) return got.res
    return { ok: true, value: await runFn(source)(got.el, arg) }
  }
  const evalAll = async (steps: Step[], source: string, arg: unknown): Promise<Dict> => ({
    ok: true,
    value: await runFn(source)(resolveChain(steps), arg),
  })
  const waitFor = async (steps: Step[], state: string): Promise<Dict> => {
    const els = resolveChain(steps)
    if (els.length > 1 && state !== 'detached' && state !== 'hidden')
      return { ok: false, strict: true, count: els.length }
    const el = els[0]
    const met =
      state === 'attached'
        ? !!el
        : state === 'detached'
          ? !el
          : state === 'visible'
            ? !!el && isVisible(el)
            : state === 'hidden'
              ? !el || !isVisible(el)
              : false
    if (met) return { ok: true }
    return { ok: false, error: describe(steps) + ' — waiting for ' + state, retry: true }
  }

  // ---- expect probes: one evaluation, the driver polls ----
  const probe = (steps: Step[], matcher: string, args: Dict): Dict => {
    const els = resolveChain(steps)
    const strictOk = els.length <= 1
    const el = els[0]
    const text = (e: Element): string =>
      args.useInnerText ? (e as HTMLElement).innerText : (e.textContent ?? '')
    switch (matcher) {
      case 'toHaveCount':
        return { pass: els.length === args.n, received: els.length }
      case 'toBeVisible':
        if (!strictOk) return { strict: true, count: els.length }
        return {
          pass: !!el && isVisible(el),
          received: el ? (isVisible(el) ? 'visible' : 'hidden') : 'not found',
        }
      case 'toBeHidden':
        if (!strictOk) return { strict: true, count: els.length }
        return {
          pass: !el || !isVisible(el),
          received: el ? (isVisible(el) ? 'visible' : 'hidden') : 'not found',
        }
      case 'toBeAttached':
        if (!strictOk) return { strict: true, count: els.length }
        return { pass: !!el, received: el ? 'attached' : 'detached' }
      case 'toHaveText': {
        const expected = args.expected as Match | Match[]
        if (Array.isArray(expected)) {
          const texts = els.map(text)
          const pass =
            texts.length === expected.length && expected.every((m, i) => matchFull(texts[i], m))
          return { pass, received: texts.map(norm) }
        }
        if (!strictOk) return { strict: true, count: els.length }
        return {
          pass: !!el && matchFull(text(el), expected),
          received: el ? norm(text(el)) : 'not found',
        }
      }
      case 'toContainText': {
        const expected = args.expected as Match | Match[]
        if (Array.isArray(expected)) {
          const texts = els.map(text)
          const pass = expected.every((m) => texts.some((t) => matchSub(t, m)))
          return { pass, received: texts.map(norm) }
        }
        if (!strictOk) return { strict: true, count: els.length }
        return {
          pass: !!el && matchSub(text(el), expected),
          received: el ? norm(text(el)) : 'not found',
        }
      }
      default:
        break
    }
    if (!strictOk) return { strict: true, count: els.length }
    if (!el) return { pass: false, received: 'not found' }
    switch (matcher) {
      case 'toHaveAttribute': {
        const name = String(args.name)
        const has = el.hasAttribute(name)
        const value = el.getAttribute(name)
        if (args.expected === undefined)
          return { pass: has, received: has ? value : 'no attribute' }
        return {
          pass: has && matchFull(value ?? '', args.expected as Match),
          received: has ? value : 'no attribute',
        }
      }
      case 'toHaveClass': {
        const cls = norm(el.getAttribute('class') ?? '')
        const expected = args.expected as Match | Match[]
        if (Array.isArray(expected))
          return { pass: expected.every((m) => matchFull(cls, m)), received: cls }
        return { pass: matchFull(cls, expected), received: cls }
      }
      case 'toContainClass': {
        const have = new Set(
          norm(el.getAttribute('class') ?? '')
            .split(' ')
            .filter(Boolean),
        )
        const wanted = String(args.expected).split(/\s+/).filter(Boolean)
        return { pass: wanted.every((c) => have.has(c)), received: Array.from(have).join(' ') }
      }
      case 'toHaveCSS': {
        const value = getComputedStyle(el).getPropertyValue(String(args.name)).trim()
        return { pass: matchFull(value, args.expected as Match), received: value }
      }
      case 'toHaveValue': {
        const value =
          el instanceof HTMLInputElement ||
          el instanceof HTMLTextAreaElement ||
          el instanceof HTMLSelectElement
            ? el.value
            : ''
        return { pass: matchFull(value, args.expected as Match), received: value }
      }
      case 'toHaveValues': {
        const values =
          el instanceof HTMLSelectElement ? Array.from(el.selectedOptions).map((o) => o.value) : []
        const expected = args.expected as Match[]
        return {
          pass:
            values.length === expected.length && expected.every((m, i) => matchFull(values[i], m)),
          received: values,
        }
      }
      case 'toHaveId':
        return { pass: matchFull(el.id, args.expected as Match), received: el.id }
      case 'toHaveJSProperty': {
        const value = (el as unknown as Dict)[String(args.name)]
        return { pass: JSON.stringify(value) === JSON.stringify(args.expected), received: value }
      }
      case 'toBeChecked': {
        if (!isCheckable(el)) return { pass: false, received: 'not a checkbox, radio or switch' }
        const want = args.checked === undefined ? true : Boolean(args.checked)
        return { pass: isChecked(el) === want, received: isChecked(el) ? 'checked' : 'unchecked' }
      }
      case 'toBeEnabled':
        return { pass: !isDisabled(el), received: isDisabled(el) ? 'disabled' : 'enabled' }
      case 'toBeDisabled':
        return { pass: isDisabled(el), received: isDisabled(el) ? 'disabled' : 'enabled' }
      case 'toBeEditable':
        return { pass: isEditable(el), received: isEditable(el) ? 'editable' : 'not editable' }
      case 'toBeEmpty': {
        const empty =
          el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
            ? el.value === ''
            : norm(el.textContent).length === 0 && el.children.length === 0
        return { pass: empty, received: empty ? 'empty' : 'not empty' }
      }
      case 'toBeFocused':
        return {
          pass: document.activeElement === el,
          received: document.activeElement
            ? '<' + document.activeElement.tagName.toLowerCase() + '>'
            : 'nothing focused',
        }
      case 'toBeInViewport': {
        const r = el.getBoundingClientRect()
        const ix = Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0))
        const iy = Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0))
        const area = r.width * r.height
        const ratio = area > 0 ? (ix * iy) / area : 0
        const min = args.ratio === undefined ? 0 : Number(args.ratio)
        return {
          pass: area > 0 && (min > 0 ? ratio >= min : ratio > 0),
          received: 'viewport ratio ' + ratio.toFixed(2),
        }
      }
      case 'toHaveAccessibleName':
        return {
          pass: matchFull(accessibleName(el), args.expected as Match),
          received: accessibleName(el),
        }
      case 'toHaveRole':
        return { pass: roleOf(el) === args.expected, received: roleOf(el) }
      default:
        return { error: 'unknown matcher: ' + matcher }
    }
  }

  // ---- page-level helpers ----
  const info = (): Dict => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    innerWidth,
    innerHeight,
    scrollX,
    scrollY,
    scrollHeight: document.documentElement.scrollHeight,
  })
  const mouse = (action: string, x: number, y: number, opts: Dict): Dict => {
    if (action === 'wheel') {
      window.scrollBy(x, y)
      const target =
        document.elementFromPoint(innerWidth / 2, innerHeight / 2) ?? document.documentElement
      target.dispatchEvent(
        new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaX: x, deltaY: y }),
      )
      return { ok: true }
    }
    const el =
      typeof document.elementFromPoint === 'function' ? document.elementFromPoint(x, y) : null
    if (!el) return { ok: false, error: 'no element at (' + x + ', ' + y + ')' }
    if (action === 'move') hoverAt(el, x, y)
    else if (action === 'click' || action === 'dblclick')
      clickAt(el, x, y, {
        ...opts,
        clickCount: action === 'dblclick' ? 2 : ((opts.clickCount as number | undefined) ?? 1),
      })
    else if (action === 'down') {
      fire(el, 'pointerdown', { clientX: x, clientY: y, button: 0, buttons: 1 })
      fire(el, 'mousedown', { clientX: x, clientY: y, button: 0, buttons: 1 })
    } else if (action === 'up') {
      fire(el, 'pointerup', { clientX: x, clientY: y, button: 0 })
      fire(el, 'mouseup', { clientX: x, clientY: y, button: 0 })
      fire(el, 'click', { clientX: x, clientY: y, button: 0, detail: 1 })
    }
    return { ok: true }
  }
  const keyboard = (action: string, arg: string): Dict => {
    const target = (document.activeElement as Element | null) ?? document.body
    if (action === 'press')
      for (const combo of String(arg).split(/(?<!\+)\s+/)) pressKey(target, combo)
    else if (action === 'type')
      for (const ch of String(arg)) pressKey(target, ch === '\n' ? 'Enter' : ch)
    else if (action === 'insertText') insertText(target, String(arg))
    else if (action === 'down') fire(target, 'keydown', { key: arg, code: KEY_CODES[arg] ?? arg })
    else if (action === 'up') fire(target, 'keyup', { key: arg, code: KEY_CODES[arg] ?? arg })
    return { ok: true }
  }
  const resolveUrl = (url: string): string => {
    const u = new URL(url, location.href)
    if (
      (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0') &&
      u.host !== location.host
    )
      return location.origin + u.pathname + u.search + u.hash
    return u.href
  }
  const doFetch = async (url: string, init: Dict): Promise<Dict> => {
    const headers = (init.headers as Record<string, string> | undefined) ?? {}
    const body =
      init.data !== undefined
        ? typeof init.data === 'string'
          ? init.data
          : JSON.stringify(init.data)
        : (init.body as string | undefined)
    if (
      init.data !== undefined &&
      typeof init.data !== 'string' &&
      !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')
    )
      headers['content-type'] = 'application/json'
    const res = await fetch(resolveUrl(url), {
      method: String(init.method ?? 'GET'),
      headers,
      body,
      credentials: 'include',
      redirect: init.maxRedirects === 0 ? 'manual' : 'follow',
    })
    const text = await res.text()
    return {
      ok: true,
      value: {
        url: res.url,
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        headers: Array.from(res.headers.entries()),
        text,
      },
    }
  }
  const addTag = (kind: string, opts: Dict): Dict => {
    if (kind === 'style') {
      const style = document.createElement('style')
      style.textContent = String(opts.content ?? '')
      document.head.appendChild(style)
      return { ok: true }
    }
    const script = document.createElement('script')
    if (opts.url) script.src = String(opts.url)
    else script.textContent = String(opts.content ?? '')
    if (opts.type) script.type = String(opts.type)
    document.head.appendChild(script)
    return { ok: true }
  }
  const scroll = (opts: Dict): Dict => {
    if (opts.selector) {
      const el = resolveChain(parseSelector(String(opts.selector)))[0]
      if (!el) return { ok: false, error: 'scroll target not found' }
      el.scrollIntoView({ block: (opts.block as ScrollLogicalPosition) ?? 'center' })
    } else if (opts.to === 'bottom') window.scrollTo(0, document.documentElement.scrollHeight)
    else if (opts.to === 'top') window.scrollTo(0, 0)
    else window.scrollTo(Number(opts.x ?? scrollX), Number(opts.y ?? scrollY))
    return { ok: true, scrollY, scrollHeight: document.documentElement.scrollHeight, innerHeight }
  }

  const call = async (req: Dict): Promise<unknown> => {
    const fn = String(req.fn)
    const a = (req.args as unknown[]) ?? []
    switch (fn) {
      case 'parse':
        return parseSelector(String(a[0]))
      case 'act':
        return act(a[0] as Step[], String(a[1]), (a[2] as Dict) ?? {})
      case 'read':
        return read(a[0] as Step[], String(a[1]), (a[2] as unknown[]) ?? [])
      case 'readAll':
        return readAll(a[0] as Step[], String(a[1]))
      case 'evalOn':
        return evalOn(a[0] as Step[], String(a[1]), a[2])
      case 'evalAll':
        return evalAll(a[0] as Step[], String(a[1]), a[2])
      case 'waitFor':
        return waitFor(a[0] as Step[], String(a[1]))
      case 'probe':
        return probe(a[0] as Step[], String(a[1]), (a[2] as Dict) ?? {})
      case 'describe':
        return describe(a[0] as Step[])
      case 'info':
        return info()
      case 'mouse':
        return mouse(String(a[0]), Number(a[1]), Number(a[2]), (a[3] as Dict) ?? {})
      case 'keyboard':
        return keyboard(String(a[0]), String(a[1] ?? ''))
      case 'fetch':
        return doFetch(String(a[0]), (a[1] as Dict) ?? {})
      case 'addTag':
        return addTag(String(a[0]), (a[1] as Dict) ?? {})
      case 'scroll':
        return scroll((a[0] as Dict) ?? {})
      case 'eval':
        return { ok: true, value: await runFn(String(a[0]))(a[1]) }
      default:
        return { ok: false, error: 'unknown runtime call: ' + fn }
    }
  }

  g.__molE2E = { version: VERSION, call }
  return { version: VERSION }
}
