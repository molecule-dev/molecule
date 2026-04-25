import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@molecule/api-i18n', () => {
  return {
    t: vi.fn(
      (
        _key: string,
        values?: Record<string, unknown>,
        options?: { defaultValue?: string; locale?: string },
      ) => {
        const template = options?.defaultValue ?? _key
        if (!values) return template
        return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
          const value = values[name]
          if (value == null) return ''
          if (value instanceof Date) return value.toISOString()
          if (typeof value === 'object') return JSON.stringify(value)
          return String(value)
        })
      },
    ),
  }
})

let renderTemplate: typeof import('../render.js').renderTemplate
let tMock: ReturnType<typeof vi.fn>

const minimalTemplate = {
  key: 'test.minimal',
  subjectKey: 'test.minimal.subject',
  defaultSubject: 'Hello, {{userName}}',
  textKey: 'test.minimal.text',
  defaultText: 'Hi {{userName}}, your plan is {{planName}}.',
}

const fullTemplate = {
  ...minimalTemplate,
  htmlKey: 'test.minimal.html',
  defaultHtml: '<p>Hi {{userName}}, your plan is <b>{{planName}}</b>.</p>',
}

describe('renderTemplate', () => {
  beforeEach(async () => {
    vi.resetModules()
    const renderModule = await import('../render.js')
    renderTemplate = renderModule.renderTemplate
    const i18nModule = await import('@molecule/api-i18n')
    tMock = i18nModule.t as unknown as ReturnType<typeof vi.fn>
    tMock.mockClear()
  })

  it('renders subject and text using the i18n provider', () => {
    const rendered = renderTemplate(minimalTemplate, { userName: 'Lou', planName: 'Pro' })

    expect(rendered.subject).toBe('Hello, Lou')
    expect(rendered.text).toBe('Hi Lou, your plan is Pro.')
    expect(rendered.html).toBeUndefined()
  })

  it('renders html when the template defines an htmlKey', () => {
    const rendered = renderTemplate(fullTemplate, { userName: 'Lou', planName: 'Pro' })

    expect(rendered.html).toBe('<p>Hi Lou, your plan is <b>Pro</b>.</p>')
  })

  it('passes locale option through to t()', () => {
    renderTemplate(fullTemplate, { userName: 'Lou', planName: 'Pro' }, 'fr')

    const calls = tMock.mock.calls.filter((call) => call[2] != null)
    for (const call of calls) {
      expect((call[2] as { locale?: string }).locale).toBe('fr')
    }
  })

  it('substitutes Date values via ISO string', () => {
    const date = new Date('2026-04-25T10:00:00Z')
    const rendered = renderTemplate(
      {
        ...minimalTemplate,
        defaultSubject: 'Renewal on {{when}}',
        defaultText: 'Body',
      },
      { when: date, userName: 'Lou', planName: 'Pro' },
    )

    expect(rendered.subject).toBe('Renewal on 2026-04-25T10:00:00.000Z')
  })

  it('renders missing variables as empty strings', () => {
    const rendered = renderTemplate(
      { ...minimalTemplate, defaultSubject: '{{userName}}-{{missing}}', defaultText: 'x' },
      { userName: 'Lou' },
    )

    expect(rendered.subject).toBe('Lou-')
  })

  it('JSON-stringifies non-primitive variable values', () => {
    const rendered = renderTemplate(
      { ...minimalTemplate, defaultSubject: 'Data: {{payload}}', defaultText: 'x' },
      { payload: { id: 7 }, userName: 'L', planName: 'P' },
    )

    expect(rendered.subject).toBe('Data: {"id":7}')
  })

  it('falls back to defaultText for html when htmlKey is set without defaultHtml', () => {
    const rendered = renderTemplate(
      {
        ...minimalTemplate,
        htmlKey: 'test.minimal.html',
        defaultHtml: undefined,
      },
      { userName: 'Lou', planName: 'Pro' },
    )

    expect(rendered.html).toBe('Hi Lou, your plan is Pro.')
  })
})
