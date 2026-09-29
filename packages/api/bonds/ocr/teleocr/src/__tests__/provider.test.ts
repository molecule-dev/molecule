import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AIProvider, ChatEvent, ChatParams } from '@molecule/api-ai'

import { TeleOcrTruncatedError } from '../errors.js'
import { convertOtslToHtml, formatFormula } from '../otsl.js'
import { TELEOCR_PROMPTS, TELEOCR_SYSTEM_PROMPT } from '../prompt.js'
import { createProvider, DEFAULT_TELEOCR_MODEL, provider } from '../provider.js'

/** Captures params and emits a scripted event list. */
function fakeAi(events: ChatEvent[]): { ai: AIProvider; calls: ChatParams[] } {
  const calls: ChatParams[] = []
  return {
    calls,
    ai: {
      name: 'fake',
      async *chat(params: ChatParams): AsyncIterable<ChatEvent> {
        calls.push(params)
        for (const event of events) yield event
      },
    },
  }
}

const IMAGE = { data: new Uint8Array([1, 2, 3]), mimeType: 'image/png' }
const DONE: ChatEvent = { type: 'done', usage: { inputTokens: 10, outputTokens: 5 } }

/** The content blocks of the user message the bond builds. */
type UserContent = Extract<ChatParams['messages'][number]['content'], unknown[]>
const userBlocks = (m: ChatParams['messages'][number]): UserContent => m.content as UserContent

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('api-ocr-teleocr provider', () => {
  it('returns the model answer as a single page with no confidence', async () => {
    const { ai } = fakeAi([
      { type: 'text', content: '  HELLO\n' },
      { type: 'text', content: 'world ' },
      DONE,
    ])
    const result = await createProvider({ ai }).recognize(IMAGE)
    expect(result).toEqual({
      text: 'HELLO\nworld',
      pages: [{ pageNumber: 1, text: 'HELLO\nworld' }],
    })
  })

  it('sends the verbatim system + text-task prompts, greedy, with the reference budget', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, DONE])
    await createProvider({ ai }).recognize(IMAGE)
    const params = calls[0]
    expect(params.system).toBe('You are a helpful assistant.')
    expect(params.system).toBe(TELEOCR_SYSTEM_PROMPT)
    expect(params.temperature).toBe(0)
    expect(params.maxTokens).toBe(4096)
    expect(params.model).toBe(DEFAULT_TELEOCR_MODEL)
    expect(params.messages).toHaveLength(1)
    const content = userBlocks(params.messages[0])
    expect(content).toEqual([
      { type: 'image', mediaType: 'image/png', data: 'AQID' },
      { type: 'text', text: 'Please output the text content from the image.' },
    ])
  })

  it('ignores the language hint (no prompt slot for it)', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, DONE])
    await createProvider({ ai }).recognize(IMAGE, { language: 'de' })
    const content = userBlocks(calls[0].messages[0])
    expect((content[1] as { text: string }).text).toBe(TELEOCR_PROMPTS.text)
    expect(JSON.stringify(calls[0])).not.toContain('"de"')
  })

  it('reads TELEOCR_MODEL on each call; config wins over it', async () => {
    const { ai, calls } = fakeAi([{ type: 'text', content: 'x' }, DONE])
    const ocr = createProvider({ ai })
    vi.stubEnv('TELEOCR_MODEL', 'XingChen-AGI/TeleOCR')
    await ocr.recognize(IMAGE)
    expect(calls[0].model).toBe('XingChen-AGI/TeleOCR')
    await createProvider({ ai, model: 'teleocr', maxOutputTokens: 8192 }).recognize(IMAGE)
    expect(calls[1].model).toBe('teleocr')
    expect(calls[1].maxTokens).toBe(8192)
  })

  it('throws TeleOcrTruncatedError when the output budget is used up', async () => {
    const { ai } = fakeAi([
      { type: 'text', content: 'partial page' },
      { type: 'done', usage: { inputTokens: 900, outputTokens: 4096 } },
    ])
    const error = await createProvider({ ai })
      .recognize(IMAGE)
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TeleOcrTruncatedError)
    expect(error).toMatchObject({ partialText: 'partial page', maxOutputTokens: 4096 })
  })

  it('also detects truncation from a mid-stream usage event', async () => {
    const { ai } = fakeAi([
      { type: 'text', content: 'cut' },
      { type: 'usage', usage: { inputTokens: 1, outputTokens: 64 } },
      { type: 'done', usage: { inputTokens: 0, outputTokens: 0 } },
    ])
    await expect(
      createProvider({ ai, maxOutputTokens: 64 }).recognize(IMAGE),
    ).rejects.toBeInstanceOf(TeleOcrTruncatedError)
  })

  it('throws on a model error event, keeping the error key', async () => {
    const { ai } = fakeAi([
      { type: 'error', message: 'model not found', errorKey: 'modelNotFound' },
    ])
    await expect(createProvider({ ai }).recognize(IMAGE)).rejects.toMatchObject({
      message: 'TeleOCR model error: model not found',
      errorKey: 'modelNotFound',
    })
  })

  it('exposes a typed provider named teleocr', () => {
    expect(provider.name).toBe('teleocr')
    expect(typeof provider.recognize).toBe('function')
  })
})

describe('TELEOCR_PROMPTS', () => {
  it('keeps the model card strings verbatim', () => {
    expect(TELEOCR_PROMPTS).toEqual({
      text: 'Please output the text content from the image.',
      table: 'This is the image of a table. Please output the table in OTSL format.',
      formula: 'Please write out the expression of the formula in the image using LaTeX format.',
      code: 'The image contains a code snippet, please output the parsing result.',
      layout: 'Analyze the image layout.',
      distortedLayout: '\nMulti-point Layout Segmentation Analysis.',
      scientificFigure:
        'This is a scientific figure. Please extract the table implied by this figure.',
    })
  })
})

describe('convertOtslToHtml', () => {
  it('converts a simple grid', () => {
    expect(convertOtslToHtml('<fcel>A<fcel>B<nl><fcel>1<fcel>2<nl>')).toBe(
      '<table><tr><td>A</td><td>B</td></tr><tr><td>1</td><td>2</td></tr></table>',
    )
  })

  it('emits colspan for <lcel> and rowspan for <ucel>', () => {
    expect(convertOtslToHtml('<fcel>Head<lcel><nl><fcel>a<fcel>b<nl>')).toBe(
      '<table><tr><td colspan="2">Head</td></tr><tr><td>a</td><td>b</td></tr></table>',
    )
    expect(convertOtslToHtml('<fcel>Tall<fcel>x<nl><ucel><fcel>y<nl>')).toBe(
      '<table><tr><td rowspan="2">Tall</td><td>x</td></tr><tr><td>y</td></tr></table>',
    )
  })

  it('merges a 2×2 block through <xcel>', () => {
    expect(convertOtslToHtml('<fcel>Big<lcel><nl><ucel><xcel><nl>')).toBe(
      '<table><tr><td rowspan="2" colspan="2">Big</td></tr><tr></tr></table>',
    )
  })

  it('renders empty cells and pads short rows', () => {
    expect(convertOtslToHtml('<fcel>a<ecel><fcel>c<nl><fcel>d<nl>')).toBe(
      '<table><tr><td>a</td><td></td><td>c</td></tr><tr><td>d</td></tr></table>',
    )
  })

  it('escapes cell text', () => {
    expect(convertOtslToHtml(`<fcel>a<b & "c" 'd'<nl>`)).toBe(
      '<table><tr><td>a&lt;b &amp; &quot;c&quot; &#x27;d&#x27;</td></tr></table>',
    )
  })

  it('tolerates leading row breaks (the reference raises IndexError there)', () => {
    expect(() => convertOtslToHtml('<nl><nl><fcel>h1<fcel>h2<lcel><nl>')).not.toThrow()
  })

  it('passes an HTML table through and returns "" for no cells', () => {
    const html = '<table><tr><td>x</td></tr></table>'
    expect(convertOtslToHtml(html)).toBe(html)
    expect(convertOtslToHtml('no table here')).toBe('')
  })
})

describe('formatFormula', () => {
  it('strips \\[ \\] and wraps in $$', () => {
    expect(formatFormula(' \\[ E = mc^2 \\] ')).toBe('$$E = mc^2$$')
    expect(formatFormula('a+b')).toBe('$$a+b$$')
  })

  it('leaves $-delimited output alone', () => {
    expect(formatFormula('$x$')).toBe('$x$')
    expect(formatFormula('$$x$$')).toBe('$$x$$')
  })
})
