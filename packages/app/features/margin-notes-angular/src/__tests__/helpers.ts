/**
 * Shared fixtures for the Angular margin-notes tests: the bonds, a JIT host
 * mount, template refs for node-valued props, and the document.
 *
 * @module
 */

import '@angular/compiler'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type TemplateRef,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'

import { provideDomPlacement } from '@molecule/app-angular'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { MarginNotes } from '../margin-notes.component.js'
import type { MarginNote, MarginNoteKind, MarginNotesBlock, MarginNotesProps } from '../types.js'

/** Bonds the ClassMap, icons and the i18n provider every mount installs. */
export function installBonds(): void {
  setClassMap(classMap)
  setIconSet({ pin: { paths: [{ d: 'M5 5h6v6H5z' }] } })
  setProvider(createSimpleI18nProvider('en'))
}

/** A small annotated document: a section summary over three paragraphs, two prompts. */
export function makeDoc(): {
  blocks: MarginNotesBlock[]
  notes: MarginNote[]
  kinds: MarginNoteKind[]
} {
  return {
    blocks: [
      { id: 'p1', content: 'Human opening paragraph.', noteIds: ['s1'] },
      { id: 'p2', content: 'An AI-written paragraph.', noteIds: ['s1', 'q1'], marked: true },
      {
        id: 'p3',
        content: 'Another AI paragraph, same prompt.',
        noteIds: ['s1', 'q1'],
        marked: true,
      },
      { id: 'p4', content: 'Closing words.' },
    ],
    notes: [
      { id: 's1', kind: 'summary', content: 'SUMMARY-ONE' },
      { id: 'q1', kind: 'prompt', content: 'PROMPT-ONE' },
    ],
    kinds: [
      { id: 'summary', label: 'Summaries', defaultOn: true },
      { id: 'prompt', label: 'Prompts', defaultOn: false, panel: 'tap' },
    ],
  }
}

/**
 * A document of two sections that each open on a heading: a later noted section
 * for the phone panel to reach, and rows whose text starts below the row's top.
 *
 * @returns Fresh blocks and notes.
 */
export async function makeSections(): Promise<{
  blocks: MarginNotesBlock[]
  notes: MarginNote[]
}> {
  const [h1, a1, h2, b1] = await Promise.all(
    [
      '<h2>First section</h2>',
      '<p>First body.</p>',
      '<h2>Second section</h2>',
      '<p>Second body.</p>',
    ].map((html) => makeTemplate(html)),
  )
  return {
    blocks: [
      { id: 'h1', content: h1, noteIds: ['s1'] },
      { id: 'a1', content: a1, noteIds: ['s1'] },
      { id: 'h2', content: h2, noteIds: ['s2'] },
      { id: 'b1', content: b1, noteIds: ['s2'], marked: true },
    ],
    notes: [
      { id: 's1', kind: 'summary', content: 'FIRST-SUMMARY' },
      { id: 's2', kind: 'summary', content: 'SECOND-SUMMARY' },
    ],
  }
}

/** A mounted component: the host element and how to flush and tear it down. */
export interface Mounted {
  /** The host element the JIT wrapper rendered into. */
  readonly host: HTMLElement
  /** Runs change detection and waits for it. */
  flush(): Promise<void>
  /**
   * Binds new props, the way a parent that re-renders does, and runs change
   * detection.
   *
   * @param props - The props to replace.
   */
  set(props: Record<string, unknown>): Promise<void>
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

/** The teardown of every component and helper view the running test created. */
const mounted: Array<() => Promise<void>> = []

/** Destroys everything the previous test created and clears the body. */
export async function disposeAll(): Promise<void> {
  for (const dispose of mounted.splice(0)) await dispose()
  document.body.innerHTML = ''
}

/** The host template: every `<MarginNotes>` input is bound. */
const notesTemplate = `<div mol-margin-notes
  [blocks]="p['blocks']"
  [notes]="p['notes']"
  [kinds]="p['kinds']"
  [markLabel]="p['markLabel']"
  [measure]="p['measure']"
  [gutterWidth]="p['gutterWidth']"
  [shownKinds]="p['shownKinds']"
  [onShownKindsChange]="p['onShownKindsChange']"
  [className]="p['className']"
  [style]="p['style']"
  [webStyle]="p['webStyle']"
></div>`

/**
 * Mounts `<MarginNotes>` through a JIT host, the way an Angular app would.
 *
 * @param props - The props the host binds.
 * @param template - The host template (the default binds every input).
 * @returns The mounted host.
 */
export async function mountNotes(
  props: MarginNotesProps,
  template = notesTemplate,
): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [MarginNotes],
    changeDetection: ChangeDetectionStrategy.Eager,
    template,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = Object.fromEntries(Object.entries(props))
    },
  )
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref: ComponentRef<{ p: Record<string, unknown> }> = createComponent(Host, {
    environmentInjector: appRef.injector,
  })
  const host = ref.location.nativeElement as HTMLElement
  document.body.appendChild(host)
  appRef.attachView(ref.hostView)
  appRef.tick()
  const m: Mounted = {
    host,
    flush: async () => {
      appRef.tick()
      await Promise.resolve()
    },
    set: async (props: Record<string, unknown>) => {
      ref.instance.p = { ...ref.instance.p, ...props }
      ref.changeDetectorRef.markForCheck()
      appRef.tick()
      await Promise.resolve()
    },
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(m.destroy)
  return m
}

/**
 * Builds a `TemplateRef` from static markup, the way a caller passes a
 * node-valued prop to the Angular component. The declaring view stays alive
 * until the test ends.
 *
 * @param html - The template's markup.
 * @returns The template ref.
 */
/** The template ref the capture component most recently received. */
let capturedTemplate: TemplateRef<unknown> | null = null

/**
 * Receives a template ref through an input, so a test can build one without a
 * decorator query (the JIT compiler wires only decorator metadata, and the
 * test transform cannot compile property decorators).
 */
class TemplateCapture {
  /** Stores the template the host template binds. */
  set tpl(value: TemplateRef<unknown> | undefined) {
    capturedTemplate = value ?? null
  }
}

/** The capture component itself. */
const TemplateCaptureComponent = Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'mol-capture',
  standalone: true,
  inputs: ['tpl'],
  template: '',
})(TemplateCapture)

/**
 * Builds a `TemplateRef` from static markup, the way a caller passes a
 * node-valued prop to the Angular component. The declaring view stays alive
 * until the test ends.
 *
 * @param html - The template's markup.
 * @returns The template ref.
 */
export async function makeTemplate(html: string): Promise<TemplateRef<unknown>> {
  capturedTemplate = null
  const Holder = Component({
    changeDetection: ChangeDetectionStrategy.Eager,
    selector: 'mol-tpl-holder',
    standalone: true,
    imports: [TemplateCaptureComponent],
    template: `<ng-template #tpl>${html}</ng-template><mol-capture [tpl]=tpl></mol-capture>`,
  })(class TemplateHolder {})
  const appRef: ApplicationRef = await createApplication({
    providers: [provideZonelessChangeDetection(), provideDomPlacement()],
  })
  const ref = createComponent(Holder, { environmentInjector: appRef.injector })
  appRef.attachView(ref.hostView)
  appRef.tick()
  const tpl = capturedTemplate
  if (!tpl) throw new Error('no template ref')
  mounted.push(async () => {
    appRef.destroy()
  })
  return tpl
}

/**
 * The element carrying `data-mol-id="<id>"`.
 *
 * @param id - The `data-mol-id` value.
 * @returns The element.
 */
export function byMol(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-mol-id="${id}"]`)
  if (!el) throw new Error(`no ${id}`)
  return el
}

/**
 * The element carrying `data-testid="<id>"`.
 *
 * @param id - The `data-testid` value.
 * @returns The element.
 */
export function byTestId(id: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
  if (!el) throw new Error(`no test id ${id}`)
  return el
}

/**
 * Clicks an element.
 *
 * @param el - The element.
 */
export const click = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
}

/**
 * Hovers an element.
 *
 * @param el - The element.
 */
export const enter = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }))
}

/**
 * Un-hovers an element.
 *
 * @param el - The element.
 */
export const leave = (el: Element): void => {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }))
}

/**
 * Focuses an element the way a browser (and the conformance kit) does.
 *
 * @param el - The element.
 */
export const focusIn = (el: HTMLElement): void => {
  el.focus()
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
}

/**
 * Blurs an element the way a browser (and the conformance kit) does.
 *
 * @param el - The element.
 */
export const focusOut = (el: HTMLElement): void => {
  el.blur()
  el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
}

/** The `Type` of `<MarginNotes>`, for host templates. */
export const notesType: Type<unknown> = MarginNotes
