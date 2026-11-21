// @vitest-environment jsdom
/**
 * Unit tests for the Solid `SurveyQuestion` — a port of
 * `@molecule/app-survey-question-react/src/__tests__/SurveyQuestion.test.tsx`:
 * the same behavioral assertions, rendered with Solid in jsdom.
 *
 * @module
 */

import { render } from 'solid-js/web'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

// A ClassMap proxy echoing each accessed member back as its token, so tests
// assert behavior without a real styling bond — the same mock the React tests
// use.
vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => {
    const handler: ProxyHandler<Record<string, unknown>> = {
      get(_t, prop) {
        if (prop === 'cn') {
          return (...cls: unknown[]) =>
            cls
              .flat(Infinity)
              .map((c) => (typeof c === 'function' ? c() : c))
              .filter((c) => typeof c === 'string' && c.length > 0)
              .join(' ')
        }
        const token = String(prop)
        return (..._args: unknown[]) => token
      },
    }
    return new Proxy({}, handler)
  },
}))

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'

import { SurveyQuestion, type SurveyQuestionProps } from '../SurveyQuestion.jsx'
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

const disposers: Array<() => void> = []

beforeAll(() => {
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
})

/**
 * Renders `<SurveyQuestion>` with the given props and disposes it after the
 * test.
 *
 * @param props - The component props.
 * @returns The host element.
 */
function mount(props: SurveyQuestionProps): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  disposers.push(render(() => <SurveyQuestion {...props} />, container))
  return container
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
 * Types into a field the way a native `input` event reports it.
 *
 * @param element - The input or textarea.
 * @param value - The new text.
 */
function type(element: HTMLElement, value: string): void {
  const field = element as HTMLInputElement
  field.value = value
  field.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('<SurveyQuestion>', () => {
  it('renders the prompt and required indicator', () => {
    const q: ShortTextQuestion = {
      id: 'q1',
      kind: 'short-text',
      prompt: 'What is your name?',
      required: true,
    }
    const container = mount({ question: q })
    expect(container.textContent).toContain('What is your name?')
    expect(container.querySelector('[data-mol-id="survey-question-q1-required"]')).not.toBeNull()
  })

  it('renders helpText and description when present', () => {
    const q: ShortTextQuestion = {
      id: 'q1',
      kind: 'short-text',
      prompt: 'P',
      description: 'desc-here',
      helpText: 'help-here',
    }
    const container = mount({ question: q })
    expect(container.textContent).toContain('desc-here')
    expect(container.textContent).toContain('help-here')
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

    it('fires onChange with selected value', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      query(container, '[data-mol-id="survey-option-mc1-a"]').click()
      expect(onChange).toHaveBeenCalledWith('a')
    })

    it('marks selected option aria-checked', () => {
      const container = mount({ question: q, value: 'b' })
      const btnA = query(container, '[data-mol-id="survey-option-mc1-a"]')
      const btnB = query(container, '[data-mol-id="survey-option-mc1-b"]')
      expect(btnA.getAttribute('aria-checked')).toBe('false')
      expect(btnB.getAttribute('aria-checked')).toBe('true')
    })

    it('readOnly disables clicks', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, onChange, readOnly: true })
      const btn = query(container, '[data-mol-id="survey-option-mc1-a"]') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
      btn.click()
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

    it('toggles values into an array', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, value: ['a'], onChange })
      query(container, '[data-mol-id="survey-option-mm1-b"]').click()
      expect(onChange).toHaveBeenCalledWith(['a', 'b'])
    })

    it('removes value when toggled off', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, value: ['a', 'b'], onChange })
      query(container, '[data-mol-id="survey-option-mm1-a"]').click()
      expect(onChange).toHaveBeenCalledWith(['b'])
    })
  })

  describe('true-false', () => {
    const q: TrueFalseQuestion = { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' }

    it('selects true', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      query(container, '[data-mol-id="survey-option-tf1-true"]').click()
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('selects false', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      query(container, '[data-mol-id="survey-option-tf1-false"]').click()
      expect(onChange).toHaveBeenCalledWith(false)
    })
  })

  describe('short-text & long-text', () => {
    it('short-text fires onChange', () => {
      const q: ShortTextQuestion = { id: 's1', kind: 'short-text', prompt: 'name' }
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      type(query(container, '[data-mol-id="survey-input-s1"]'), 'hello')
      expect(onChange).toHaveBeenCalledWith('hello')
    })

    it('long-text uses textarea with rows', () => {
      const q: LongTextQuestion = {
        id: 'lt1',
        kind: 'long-text',
        prompt: 'tell us',
        rows: 6,
      }
      const container = mount({ question: q })
      const ta = query(container, '[data-mol-id="survey-input-lt1"]') as HTMLTextAreaElement
      expect(ta.tagName).toBe('TEXTAREA')
      expect(ta.rows).toBe(6)
    })

    it('readOnly disables text input', () => {
      const q: ShortTextQuestion = { id: 's2', kind: 'short-text', prompt: 'p' }
      const container = mount({ question: q, readOnly: true })
      const input = query(container, '[data-mol-id="survey-input-s2"]') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })
  })

  describe('numeric', () => {
    const q: NumericQuestion = { id: 'n1', kind: 'numeric', prompt: 'how many?', unit: 'kg' }

    it('parses numeric input', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      type(query(container, '[data-mol-id="survey-input-n1"]'), '42')
      expect(onChange).toHaveBeenCalledWith(42)
    })

    it('renders unit suffix', () => {
      const container = mount({ question: q })
      expect(container.textContent).toContain('kg')
      expect(container.querySelector('[data-mol-id="survey-input-n1-unit"]')).not.toBeNull()
    })
  })

  describe('rating-scale', () => {
    it('defaults to 1-5 buttons', () => {
      const q: RatingScaleQuestion = { id: 'r1', kind: 'rating-scale', prompt: 'rate' }
      const container = mount({ question: q })
      for (const n of [1, 2, 3, 4, 5]) {
        expect(container.querySelector(`[data-mol-id="survey-option-r1-${n}"]`)).not.toBeNull()
      }
      expect(container.querySelector('[data-mol-id="survey-option-r1-6"]')).toBeNull()
    })

    it('respects custom min/max', () => {
      const q: RatingScaleQuestion = {
        id: 'r2',
        kind: 'rating-scale',
        prompt: 'rate',
        min: 1,
        max: 10,
      }
      const container = mount({ question: q })
      expect(container.querySelector('[data-mol-id="survey-option-r2-10"]')).not.toBeNull()
    })

    it('selecting fires onChange', () => {
      const q: RatingScaleQuestion = { id: 'r3', kind: 'rating-scale', prompt: 'rate' }
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      query(container, '[data-mol-id="survey-option-r3-3"]').click()
      expect(onChange).toHaveBeenCalledWith(3)
    })
  })

  describe('nps', () => {
    const q: NPSQuestion = { id: 'nps1', kind: 'nps', prompt: 'how likely?' }

    it('renders 0..10 buttons', () => {
      const container = mount({ question: q })
      for (const n of [0, 5, 10]) {
        expect(container.querySelector(`[data-mol-id="survey-option-nps1-${n}"]`)).not.toBeNull()
      }
    })

    it('fires onChange', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      query(container, '[data-mol-id="survey-option-nps1-9"]').click()
      expect(onChange).toHaveBeenCalledWith(9)
    })
  })

  describe('date', () => {
    it('uses native date input and fires onChange', () => {
      const q: DateQuestion = { id: 'd1', kind: 'date', prompt: 'When?' }
      const onChange = vi.fn()
      const container = mount({ question: q, onChange })
      const input = query(container, '[data-mol-id="survey-input-d1"]') as HTMLInputElement
      expect(input.type).toBe('date')
      type(input, '2026-01-15')
      expect(onChange).toHaveBeenCalledWith('2026-01-15')
    })
  })

  describe('file-upload', () => {
    it('renders the dropzone and lists files', () => {
      const q: FileUploadQuestion = { id: 'f1', kind: 'file-upload', prompt: 'upload' }
      const file = new File(['contents'], 'a.txt', { type: 'text/plain' })
      const container = mount({ question: q, value: [file] })
      expect(container.textContent).toContain('a.txt')
      expect(container.querySelector('[data-mol-id="survey-input-f1-files"]')).not.toBeNull()
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

    it('renders rows × columns with radios', () => {
      const container = mount({ question: q })
      expect(container.querySelector('[data-mol-id="survey-matrix-mx1-r1-1"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="survey-matrix-mx1-r2-2"]')).not.toBeNull()
    })

    it('selecting a cell updates the row mapping', () => {
      const onChange = vi.fn()
      const container = mount({ question: q, value: {}, onChange })
      query(container, '[data-mol-id="survey-matrix-mx1-r1-2"]').click()
      expect(onChange).toHaveBeenCalledWith({ r1: '2' })
    })
  })

  describe('validation + submit', () => {
    it('shows required error when submitting empty answer', () => {
      const q: ShortTextQuestion = {
        id: 'req1',
        kind: 'short-text',
        prompt: 'Required field',
        required: true,
      }
      const onSubmit = vi.fn()
      const container = mount({ question: q, onSubmit })
      const submitBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )!
      submitBtn.click()
      expect(onSubmit).not.toHaveBeenCalled()
      expect(container.querySelector('[data-mol-id="survey-question-req1-error"]')).not.toBeNull()
    })

    it('calls onSubmit when value is present', () => {
      const q: ShortTextQuestion = {
        id: 'req2',
        kind: 'short-text',
        prompt: 'Required field',
        required: true,
      }
      const onSubmit = vi.fn()
      const container = mount({ question: q, value: 'hello', onSubmit })
      const submitBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )!
      submitBtn.click()
      expect(onSubmit).toHaveBeenCalledWith('hello')
    })

    it('hides submit button in readOnly mode', () => {
      const q: ShortTextQuestion = { id: 'ro1', kind: 'short-text', prompt: 'p' }
      const onSubmit = vi.fn()
      const container = mount({ question: q, onSubmit, readOnly: true })
      const submitBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )
      expect(submitBtn).toBeUndefined()
    })
  })
})
