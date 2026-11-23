// @vitest-environment jsdom
/**
 * Unit tests of `SurveyQuestion` — the port of
 * `@molecule/app-survey-question-react/src/__tests__/SurveyQuestion.test.tsx`:
 * the same behavioral assertions, mounted through Angular's real renderer (the
 * same `createApplication` + JIT host approach the conformance kit's Angular
 * adapter uses).
 *
 * @module
 */

import '@angular/compiler'
// The kit bonds the reference ClassMap and i18n provider before any component
// imports them, and Angular's class bindings need the real (string) class map.
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { provideDomPlacement } from '@molecule/app-angular'

const { SurveyQuestion } = await import('../survey-question.component.js')
import type {
  DateQuestion,
  FileUploadQuestion,
  LongTextQuestion,
  MatrixQuestion,
  MultiChoiceMultiQuestion,
  MultiChoiceSingleQuestion,
  NPSQuestion,
  NumericQuestion,
  RatingScaleQuestion,
  ShortTextQuestion,
  TrueFalseQuestion,
} from '../types.js'

/** A mounted spec host: its DOM, a props setter, a flush and a teardown. */
interface Mounted {
  /** The host element whose children the component template produced. */
  readonly host: HTMLElement
  /** Flushes change detection. */
  flush(): void
  /** Destroys the app and removes the host. */
  destroy(): Promise<void>
}

const mounted: Mounted[] = []

afterEach(async () => {
  for (const instance of mounted.splice(0)) await instance.destroy()
  document.body.innerHTML = ''
})

/**
 * Mounts `<SurveyQuestion>` through a JIT host template, written the way an
 * Angular app would write it.
 *
 * @param props - The props object the template reads as `p['name']`.
 * @returns The mounted host.
 */
async function render(props: Record<string, unknown>): Promise<Mounted> {
  const Host = Component({
    selector: 'mol-spec-host',
    standalone: true,
    imports: [SurveyQuestion as Type<unknown>],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `<div
      mol-survey-question
      [question]="p['question']"
      [value]="p['value']"
      [onChange]="p['onChange']"
      [onSubmit]="p['onSubmit']"
      [readOnly]="p['readOnly']"
      [className]="p['className']"
    ></div>`,
  })(
    class SpecHost {
      /** The props the template binds. */
      p: Record<string, unknown> = props
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
  const instance: Mounted = {
    host,
    flush: () => appRef.tick(),
    destroy: async () => {
      appRef.destroy()
      host.remove()
    },
  }
  mounted.push(instance)
  return instance
}

/**
 * The rendered element matching a selector.
 *
 * @param container - The host element.
 * @param selector - The CSS selector.
 * @returns The element.
 */
function query(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector(selector)
  if (!element) throw new Error(`no element matches ${selector}`)
  return element as HTMLElement
}

/**
 * Fires a click and flushes change detection.
 *
 * @param element - The element.
 * @param m - The mounted component.
 */
function click(element: HTMLElement, m: Mounted): void {
  element.click()
  m.flush()
}

/**
 * Types into a field the way a native `input` event reports it.
 *
 * @param element - The input or textarea.
 * @param value - The new text.
 * @param m - The mounted component.
 */
function type(element: HTMLElement, value: string, m: Mounted): void {
  const field = element as HTMLInputElement
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
  m.flush()
}

describe('<SurveyQuestion>', () => {
  it('renders the prompt and required indicator', async () => {
    const q: ShortTextQuestion = {
      id: 'q1',
      kind: 'short-text',
      prompt: 'What is your name?',
      required: true,
    }
    const m = await render({ question: q })
    expect(m.host.textContent).toContain('What is your name?')
    expect(m.host.querySelector('[data-mol-id="survey-question-q1-required"]')).not.toBeNull()
  })

  it('renders helpText and description when present', async () => {
    const q: ShortTextQuestion = {
      id: 'q1',
      kind: 'short-text',
      prompt: 'P',
      description: 'desc-here',
      helpText: 'help-here',
    }
    const m = await render({ question: q })
    expect(m.host.textContent).toContain('desc-here')
    expect(m.host.textContent).toContain('help-here')
  })

  describe('multi-choice-single', () => {
    const q: MultiChoiceSingleQuestion = {
      id: 'mc1',
      kind: 'multi-choice-single',
      prompt: 'Pick one',
      options: [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
      ],
    }

    it('fires onChange with selected value', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      click(query(m.host, '[data-mol-id="survey-option-mc1-a"]'), m)
      expect(onChange).toHaveBeenCalledWith('a')
    })

    it('marks selected option aria-checked', async () => {
      const m = await render({ question: q, value: 'b' })
      const btnA = query(m.host, '[data-mol-id="survey-option-mc1-a"]')
      const btnB = query(m.host, '[data-mol-id="survey-option-mc1-b"]')
      expect(btnA.getAttribute('aria-checked')).toBe('false')
      expect(btnB.getAttribute('aria-checked')).toBe('true')
    })

    it('readOnly disables clicks', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, onChange, readOnly: true })
      const btn = query(m.host, '[data-mol-id="survey-option-mc1-a"]') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
      click(btn, m)
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  describe('multi-choice-multi', () => {
    const q: MultiChoiceMultiQuestion = {
      id: 'mm1',
      kind: 'multi-choice-multi',
      prompt: 'Pick many',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
    }

    it('toggles values into an array', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, value: ['a'], onChange })
      click(query(m.host, '[data-mol-id="survey-option-mm1-b"]'), m)
      expect(onChange).toHaveBeenCalledWith(['a', 'b'])
    })

    it('removes value when toggled off', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, value: ['a', 'b'], onChange })
      click(query(m.host, '[data-mol-id="survey-option-mm1-a"]'), m)
      expect(onChange).toHaveBeenCalledWith(['b'])
    })
  })

  describe('true-false', () => {
    const q: TrueFalseQuestion = { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' }

    it('selects true', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      click(query(m.host, '[data-mol-id="survey-option-tf1-true"]'), m)
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('selects false', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      click(query(m.host, '[data-mol-id="survey-option-tf1-false"]'), m)
      expect(onChange).toHaveBeenCalledWith(false)
    })
  })

  describe('short-text & long-text', () => {
    it('short-text fires onChange', async () => {
      const q: ShortTextQuestion = { id: 's1', kind: 'short-text', prompt: 'name' }
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      type(query(m.host, '[data-mol-id="survey-input-s1"]'), 'hello', m)
      expect(onChange).toHaveBeenCalledWith('hello')
    })

    it('long-text uses textarea with rows', async () => {
      const q: LongTextQuestion = {
        id: 'lt1',
        kind: 'long-text',
        prompt: 'tell us',
        rows: 6,
      }
      const m = await render({ question: q })
      const ta = query(m.host, '[data-mol-id="survey-input-lt1"]') as HTMLTextAreaElement
      expect(ta.tagName).toBe('TEXTAREA')
      expect(ta.rows).toBe(6)
    })

    it('readOnly disables text input', async () => {
      const q: ShortTextQuestion = { id: 's2', kind: 'short-text', prompt: 'p' }
      const m = await render({ question: q, readOnly: true })
      const input = query(m.host, '[data-mol-id="survey-input-s2"]') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })
  })

  describe('numeric', () => {
    const q: NumericQuestion = { id: 'n1', kind: 'numeric', prompt: 'how many?', unit: 'kg' }

    it('parses numeric input', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      type(query(m.host, '[data-mol-id="survey-input-n1"]'), '42', m)
      expect(onChange).toHaveBeenCalledWith(42)
    })

    it('renders unit suffix', async () => {
      const m = await render({ question: q })
      expect(m.host.textContent).toContain('kg')
      expect(m.host.querySelector('[data-mol-id="survey-input-n1-unit"]')).not.toBeNull()
    })
  })

  describe('rating-scale', () => {
    it('defaults to 1-5 buttons', async () => {
      const q: RatingScaleQuestion = { id: 'r1', kind: 'rating-scale', prompt: 'rate' }
      const m = await render({ question: q })
      for (const n of [1, 2, 3, 4, 5]) {
        expect(m.host.querySelector(`[data-mol-id="survey-option-r1-${n}"]`)).not.toBeNull()
      }
      expect(m.host.querySelector('[data-mol-id="survey-option-r1-6"]')).toBeNull()
    })

    it('respects custom min/max', async () => {
      const q: RatingScaleQuestion = {
        id: 'r2',
        kind: 'rating-scale',
        prompt: 'rate',
        min: 1,
        max: 10,
      }
      const m = await render({ question: q })
      expect(m.host.querySelector('[data-mol-id="survey-option-r2-10"]')).not.toBeNull()
    })

    it('selecting fires onChange', async () => {
      const q: RatingScaleQuestion = { id: 'r3', kind: 'rating-scale', prompt: 'rate' }
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      click(query(m.host, '[data-mol-id="survey-option-r3-3"]'), m)
      expect(onChange).toHaveBeenCalledWith(3)
    })
  })

  describe('nps', () => {
    const q: NPSQuestion = { id: 'nps1', kind: 'nps', prompt: 'how likely?' }

    it('renders 0..10 buttons', async () => {
      const m = await render({ question: q })
      for (const n of [0, 5, 10]) {
        expect(m.host.querySelector(`[data-mol-id="survey-option-nps1-${n}"]`)).not.toBeNull()
      }
    })

    it('fires onChange', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      click(query(m.host, '[data-mol-id="survey-option-nps1-9"]'), m)
      expect(onChange).toHaveBeenCalledWith(9)
    })
  })

  describe('date', () => {
    it('uses native date input and fires onChange', async () => {
      const q: DateQuestion = { id: 'd1', kind: 'date', prompt: 'When?' }
      const onChange = vi.fn()
      const m = await render({ question: q, onChange })
      const input = query(m.host, '[data-mol-id="survey-input-d1"]') as HTMLInputElement
      expect(input.type).toBe('date')
      type(input, '2026-01-15', m)
      expect(onChange).toHaveBeenCalledWith('2026-01-15')
    })
  })

  describe('file-upload', () => {
    it('renders the dropzone and lists files', async () => {
      const q: FileUploadQuestion = { id: 'f1', kind: 'file-upload', prompt: 'upload' }
      const file = new File(['contents'], 'a.txt', { type: 'text/plain' })
      const m = await render({ question: q, value: [file] })
      expect(m.host.textContent).toContain('a.txt')
      expect(m.host.querySelector('[data-mol-id="survey-input-f1-files"]')).not.toBeNull()
    })
  })

  describe('matrix', () => {
    const q: MatrixQuestion = {
      id: 'mx1',
      kind: 'matrix',
      prompt: 'Rate each',
      rows: [
        { id: 'r1', label: 'Row 1' },
        { id: 'r2', label: 'Row 2' },
      ],
      columns: [
        { value: '1', label: 'Bad' },
        { value: '2', label: 'Good' },
      ],
    }

    it('renders rows × columns with radios', async () => {
      const m = await render({ question: q })
      expect(m.host.querySelector('[data-mol-id="survey-matrix-mx1-r1-1"]')).not.toBeNull()
      expect(m.host.querySelector('[data-mol-id="survey-matrix-mx1-r2-2"]')).not.toBeNull()
    })

    it('selecting a cell updates the row mapping', async () => {
      const onChange = vi.fn()
      const m = await render({ question: q, value: {}, onChange })
      click(query(m.host, '[data-mol-id="survey-matrix-mx1-r1-2"]'), m)
      expect(onChange).toHaveBeenCalledWith({ r1: '2' })
    })
  })

  describe('validation + submit', () => {
    it('shows required error when submitting empty answer', async () => {
      const q: ShortTextQuestion = {
        id: 'req1',
        kind: 'short-text',
        prompt: 'Required field',
        required: true,
      }
      const onSubmit = vi.fn()
      const m = await render({ question: q, onSubmit })
      const submitBtn = Array.from(m.host.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )!
      click(submitBtn, m)
      expect(onSubmit).not.toHaveBeenCalled()
      expect(m.host.querySelector('[data-mol-id="survey-question-req1-error"]')).not.toBeNull()
    })

    it('calls onSubmit when value is present', async () => {
      const q: ShortTextQuestion = {
        id: 'req2',
        kind: 'short-text',
        prompt: 'Required field',
        required: true,
      }
      const onSubmit = vi.fn()
      const m = await render({ question: q, value: 'hello', onSubmit })
      const submitBtn = Array.from(m.host.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )!
      click(submitBtn, m)
      expect(onSubmit).toHaveBeenCalledWith('hello')
    })

    it('hides submit button in readOnly mode', async () => {
      const q: ShortTextQuestion = { id: 'ro1', kind: 'short-text', prompt: 'p' }
      const onSubmit = vi.fn()
      const m = await render({ question: q, onSubmit, readOnly: true })
      const submitBtn = Array.from(m.host.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )
      expect(submitBtn).toBeUndefined()
    })
  })
})
