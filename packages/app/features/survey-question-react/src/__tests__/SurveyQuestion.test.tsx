// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import type { ReactNode } from 'react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { I18nProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { SurveyQuestion } from '../SurveyQuestion.js'
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

/**
 * Stub UIClassMap via Proxy so all `cm.x()` / `cm.y` calls return a
 * deterministic token without the real Tailwind bond.
 *
 * @returns A stub UIClassMap.
 */
function buildStubClassMap(): UIClassMap {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop): unknown {
      if (prop === 'cn') {
        return (...classes: unknown[]) =>
          classes.filter((c) => typeof c === 'string' && c.length > 0).join(' ')
      }
      const token = String(prop)
      const fn = (..._args: unknown[]) => token
      return new Proxy(fn, {
        get(_t, key) {
          if (key === Symbol.toPrimitive || key === 'toString') return () => token
          return undefined
        },
      })
    },
  }
  return new Proxy({}, handler) as unknown as UIClassMap
}

/**
 * Wrap children in I18nProvider so `useTranslation()` works in tests.
 *
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @returns Wrapped element tree.
 */
function Wrap({ children }: { children: ReactNode }): React.ReactElement {
  return <I18nProvider provider={createSimpleI18nProvider('en')}>{children}</I18nProvider>
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
})

describe('<SurveyQuestion>', () => {
  it('renders the prompt and required indicator', () => {
    const q: ShortTextQuestion = {
      id: 'q1',
      kind: 'short-text',
      prompt: 'What is your name?',
      required: true,
    }
    const { container, getByText } = render(
      <Wrap>
        <SurveyQuestion question={q} />
      </Wrap>,
    )
    expect(getByText('What is your name?')).toBeTruthy()
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
    const { getByText } = render(
      <Wrap>
        <SurveyQuestion question={q} />
      </Wrap>,
    )
    expect(getByText('desc-here')).toBeTruthy()
    expect(getByText('help-here')).toBeTruthy()
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
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      const btn = container.querySelector('[data-mol-id="survey-option-mc1-a"]')!
      fireEvent.click(btn)
      expect(onChange).toHaveBeenCalledWith('a')
    })

    it('marks selected option aria-checked', () => {
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} value="b" />
        </Wrap>,
      )
      const btnA = container.querySelector('[data-mol-id="survey-option-mc1-a"]')!
      const btnB = container.querySelector('[data-mol-id="survey-option-mc1-b"]')!
      expect(btnA.getAttribute('aria-checked')).toBe('false')
      expect(btnB.getAttribute('aria-checked')).toBe('true')
    })

    it('readOnly disables clicks', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} readOnly />
        </Wrap>,
      )
      const btn = container.querySelector(
        '[data-mol-id="survey-option-mc1-a"]',
      ) as HTMLButtonElement
      expect(btn.disabled).toBe(true)
      fireEvent.click(btn)
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
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} value={['a']} onChange={onChange} />
        </Wrap>,
      )
      fireEvent.click(container.querySelector('[data-mol-id="survey-option-mm1-b"]')!)
      expect(onChange).toHaveBeenCalledWith(['a', 'b'])
    })

    it('removes value when toggled off', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} value={['a', 'b']} onChange={onChange} />
        </Wrap>,
      )
      fireEvent.click(container.querySelector('[data-mol-id="survey-option-mm1-a"]')!)
      expect(onChange).toHaveBeenCalledWith(['b'])
    })
  })

  describe('true-false', () => {
    const q: TrueFalseQuestion = { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' }

    it('selects true', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      fireEvent.click(container.querySelector('[data-mol-id="survey-option-tf1-true"]')!)
      expect(onChange).toHaveBeenCalledWith(true)
    })

    it('selects false', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      fireEvent.click(container.querySelector('[data-mol-id="survey-option-tf1-false"]')!)
      expect(onChange).toHaveBeenCalledWith(false)
    })
  })

  describe('short-text & long-text', () => {
    it('short-text fires onChange', () => {
      const q: ShortTextQuestion = { id: 's1', kind: 'short-text', prompt: 'name' }
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      const input = container.querySelector('[data-mol-id="survey-input-s1"]') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'hello' } })
      expect(onChange).toHaveBeenCalledWith('hello')
    })

    it('long-text uses textarea with rows', () => {
      const q: LongTextQuestion = {
        id: 'lt1',
        kind: 'long-text',
        prompt: 'tell us',
        rows: 6,
      }
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} />
        </Wrap>,
      )
      const ta = container.querySelector('[data-mol-id="survey-input-lt1"]') as HTMLTextAreaElement
      expect(ta.tagName).toBe('TEXTAREA')
      expect(ta.rows).toBe(6)
    })

    it('readOnly disables text input', () => {
      const q: ShortTextQuestion = { id: 's2', kind: 'short-text', prompt: 'p' }
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} readOnly />
        </Wrap>,
      )
      const input = container.querySelector('[data-mol-id="survey-input-s2"]') as HTMLInputElement
      expect(input.disabled).toBe(true)
    })
  })

  describe('numeric', () => {
    const q: NumericQuestion = { id: 'n1', kind: 'numeric', prompt: 'how many?', unit: 'kg' }

    it('parses numeric input', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      const input = container.querySelector('[data-mol-id="survey-input-n1"]') as HTMLInputElement
      fireEvent.change(input, { target: { value: '42' } })
      expect(onChange).toHaveBeenCalledWith(42)
    })

    it('renders unit suffix', () => {
      const { container, getByText } = render(
        <Wrap>
          <SurveyQuestion question={q} />
        </Wrap>,
      )
      expect(getByText('kg')).toBeTruthy()
      expect(container.querySelector('[data-mol-id="survey-input-n1-unit"]')).not.toBeNull()
    })
  })

  describe('rating-scale', () => {
    it('defaults to 1-5 buttons', () => {
      const q: RatingScaleQuestion = { id: 'r1', kind: 'rating-scale', prompt: 'rate' }
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} />
        </Wrap>,
      )
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
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} />
        </Wrap>,
      )
      expect(container.querySelector('[data-mol-id="survey-option-r2-10"]')).not.toBeNull()
    })

    it('selecting fires onChange', () => {
      const q: RatingScaleQuestion = { id: 'r3', kind: 'rating-scale', prompt: 'rate' }
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      fireEvent.click(container.querySelector('[data-mol-id="survey-option-r3-3"]')!)
      expect(onChange).toHaveBeenCalledWith(3)
    })
  })

  describe('nps', () => {
    const q: NPSQuestion = { id: 'nps1', kind: 'nps', prompt: 'how likely?' }

    it('renders 0..10 buttons', () => {
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} />
        </Wrap>,
      )
      for (const n of [0, 5, 10]) {
        expect(container.querySelector(`[data-mol-id="survey-option-nps1-${n}"]`)).not.toBeNull()
      }
    })

    it('fires onChange', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      fireEvent.click(container.querySelector('[data-mol-id="survey-option-nps1-9"]')!)
      expect(onChange).toHaveBeenCalledWith(9)
    })
  })

  describe('date', () => {
    it('uses native date input and fires onChange', () => {
      const q: DateQuestion = { id: 'd1', kind: 'date', prompt: 'When?' }
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onChange={onChange} />
        </Wrap>,
      )
      const input = container.querySelector('[data-mol-id="survey-input-d1"]') as HTMLInputElement
      expect(input.type).toBe('date')
      fireEvent.change(input, { target: { value: '2026-01-15' } })
      expect(onChange).toHaveBeenCalledWith('2026-01-15')
    })
  })

  describe('file-upload', () => {
    it('renders the dropzone and lists files', () => {
      const q: FileUploadQuestion = { id: 'f1', kind: 'file-upload', prompt: 'upload' }
      const file = new File(['contents'], 'a.txt', { type: 'text/plain' })
      const { container, getByText } = render(
        <Wrap>
          <SurveyQuestion question={q} value={[file]} />
        </Wrap>,
      )
      expect(getByText('a.txt')).toBeTruthy()
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
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} />
        </Wrap>,
      )
      expect(container.querySelector('[data-mol-id="survey-matrix-mx1-r1-1"]')).not.toBeNull()
      expect(container.querySelector('[data-mol-id="survey-matrix-mx1-r2-2"]')).not.toBeNull()
    })

    it('selecting a cell updates the row mapping', () => {
      const onChange = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} value={{}} onChange={onChange} />
        </Wrap>,
      )
      const cell = container.querySelector(
        '[data-mol-id="survey-matrix-mx1-r1-2"]',
      ) as HTMLInputElement
      fireEvent.click(cell)
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
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onSubmit={onSubmit} />
        </Wrap>,
      )
      const submitBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )!
      fireEvent.click(submitBtn)
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
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} value="hello" onSubmit={onSubmit} />
        </Wrap>,
      )
      const submitBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )!
      fireEvent.click(submitBtn)
      expect(onSubmit).toHaveBeenCalledWith('hello')
    })

    it('hides submit button in readOnly mode', () => {
      const q: ShortTextQuestion = { id: 'ro1', kind: 'short-text', prompt: 'p' }
      const onSubmit = vi.fn()
      const { container } = render(
        <Wrap>
          <SurveyQuestion question={q} onSubmit={onSubmit} readOnly />
        </Wrap>,
      )
      const submitBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent === 'Submit',
      )
      expect(submitBtn).toBeUndefined()
    })
  })
})
