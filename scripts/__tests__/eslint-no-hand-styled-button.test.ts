import { Linter, RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'

// The rule under test is a vendored copy of the workspace canonical
// (../../../scripts/eslint-rules/no-hand-styled-button.mjs), kept byte-identical
// by `npm run verify:eslint-rules`. Testing the copy rather than the canonical
// is deliberate: this is the file molecule's eslint.config.js actually loads.
import { noHandStyledButton } from '../../eslint-rules/no-hand-styled-button.mjs'

/**
 * Unit tests for `molecule-local/no-hand-styled-button`.
 *
 * Workspace AGENTS.md Rule 23: a gate nobody has watched FAIL is decoration.
 * Four independent lint/format gates were each shaped so they could not report
 * the problem they existed for, and nothing noticed for months. So this suite
 * asserts BOTH directions for every branch — the known-bad input reports with
 * the expected messageId, and the canonical recipe stays silent — plus the
 * layout-only styles that must never trip it, because a rule that
 * false-positives is the one people learn to bypass.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
})

ruleTester.run('no-hand-styled-button', noHandStyledButton, {
  valid: [
    // The canonical recipe from the button contract.
    {
      name: 'cm.button() with no inline style',
      code: `const El = () => (
  <button
    type="button"
    data-mol-id="commit"
    className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact)}
    onClick={onCommit}
  >
    {t('commit', undefined, { defaultValue: 'Commit' })}
  </button>
)`,
    },
    // cm.button() plus a style the ClassMap genuinely cannot express.
    {
      name: 'cm.button() with a layout-only inline style',
      code: `const El = () => (
  <button className={cm.button({ size: 'xs' })} style={{ minWidth: 96, marginLeft: 'auto' }}>
    {label}
  </button>
)`,
    },
    // Every property the denylist deliberately omits, on a bare button.
    {
      name: 'layout-only inline styles on a hand-rolled button do not trip the rule',
      code: `const El = () => (
  <button
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      width: 120,
      minWidth: 40,
      maxWidth: 200,
      height: 26,
      position: 'relative',
      top: 1,
      zIndex: 2,
      transform: 'translateY(-1px)',
      opacity: 0.9,
      overflow: 'hidden',
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
      textAlign: 'left',
      marginLeft: 'auto',
      pointerEvents: 'none',
      flexShrink: 0,
      outline: 'none',
    }}
  >
    {label}
  </button>
)`,
    },
    // The extract-to-a-const shape: className resolves through cm.button().
    {
      name: 'className resolved from a const holding cm.button()',
      code: `const El = () => {
  const classes = cm.cn(cm.button({ variant: 'solid', color: 'success', size: 'xs' }))
  return <button className={classes} style={{ width: 120 }}>{label}</button>
}`,
    },
    // A non-button element is out of scope.
    {
      name: 'a div that is not role=button is ignored',
      code: `const El = () => <div style={{ borderRadius: 6, fontSize: 12, color: '#4070e0' }}>x</div>`,
    },
    // An opaque style value cannot be inspected, so it is not guessed at.
    {
      name: 'an opaque style identifier is not reported',
      code: `const El = () => <button style={buttonStyle}>{label}</button>`,
    },
    // The escape hatch, with a reason.
    {
      name: 'escape hatch with a written reason',
      code: `const El = () => (
  /* mol-bespoke-button: icon-only tab close, 20px hit target, no label */
  <button
    aria-label={t('close', undefined, { defaultValue: 'Close' })}
    className={cm.touchTarget}
    style={{ borderRadius: 3, color: 'var(--mol-color-text-muted)' }}
    onClick={onClose}
  >
    <Icon name="x" />
  </button>
)`,
    },
    // The escape hatch as a JSX comment inside the opening tag.
    {
      name: 'escape hatch as a JSX comment above the element',
      code: `const El = () => (
  <div>
    {/* mol-bespoke-button: carousel arrow, bespoke 32px circle */}
    <button style={{ borderRadius: '50%', background: 'var(--mol-color-surface)' }} />
  </div>
)`,
    },
  ],
  invalid: [
    // THE ORIGINAL BUG: the hand-rolled Commit button, verbatim in shape.
    {
      name: 'the hand-rolled Commit button reports',
      code: `const El = () => (
  <button
    onClick={onCommit}
    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(64,112,224,0.3)')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(64,112,224,0.2)')}
    style={{
      fontSize: 12,
      borderRadius: 6,
      padding: '4px 10px',
      background: 'rgba(64,112,224,0.2)',
      color: '#4070e0',
      border: '1px solid rgba(64,112,224,0.4)',
      transition: 'background 0.15s',
    }}
  >
    Commit
  </button>
)`,
      errors: [{ messageId: 'handStyled' }],
    },
    // The message must name the exact offending properties.
    {
      name: 'the report names every offending property',
      code: `const El = () => <button style={{ fontSize: 12, borderRadius: 6, width: 80 }}>x</button>`,
      errors: [
        {
          messageId: 'handStyled',
          data: { props: 'fontSize, borderRadius' },
        },
      ],
    },
    // Each denylisted family reports on its own.
    {
      name: 'radius alone reports',
      code: `const El = () => <button style={{ borderRadius: 6 }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    {
      name: 'padding alone reports',
      code: `const El = () => <button style={{ paddingInline: 10 }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    {
      name: 'boxShadow alone reports',
      code: `const El = () => <button style={{ boxShadow: '0 1px 2px rgba(0,0,0,.2)' }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    // role="button" on a non-button element is in scope.
    {
      name: 'role="button" on a div reports',
      code: `const El = () => <div role="button" tabIndex={0} style={{ fontSize: 12, background: '#eee' }}>x</div>`,
      errors: [{ messageId: 'handStyled' }],
    },
    // A quoted key is the same violation as an identifier key.
    {
      name: 'a string-literal style key reports',
      code: `const El = () => <button style={{ 'borderRadius': 6 }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    // A style spread into an object literal still exposes the literal keys.
    {
      name: 'a token property beside a spread reports',
      code: `const El = () => <button style={{ ...base, fontWeight: 600 }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    // A className that is a raw string is not the design system.
    {
      name: 'a raw className string does not count as cm.button()',
      code: `const El = () => <button className="commit-btn" style={{ borderRadius: 6 }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    // A cm.* helper that is not cm.button() is still not the button contract.
    {
      name: 'a non-button cm.* helper still reports handStyled',
      code: `const El = () => <button className={cm.themeToggle} style={{ fontSize: 12 }}>x</button>`,
      errors: [{ messageId: 'handStyled' }],
    },
    // Anti-pattern 12: the inline style silently outranks the ClassMap.
    {
      name: 'an inline token style on a cm.button() element reports overridesClassMap',
      code: `const El = () => (
  <button
    className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }))}
    style={{ borderRadius: 6, fontSize: 12 }}
  >
    x
  </button>
)`,
      errors: [{ messageId: 'overridesClassMap', data: { props: 'borderRadius, fontSize' } }],
    },
    // The escape hatch is not a silence-by-default switch.
    {
      name: 'a bare directive with no reason reports',
      code: `const El = () => (
  /* mol-bespoke-button */
  <button style={{ borderRadius: 6 }}>x</button>
)`,
      errors: [{ messageId: 'directiveNeedsReason' }],
    },
    // A directive too far above the element does not reach it.
    {
      name: 'a directive more than three lines above does not apply',
      code: `const El = () => (
  /* mol-bespoke-button: unrelated, attached to something else */
  <div>
    <span />
    <span />
    <span />
    <button style={{ borderRadius: 6 }}>x</button>
  </div>
)`,
      errors: [{ messageId: 'handStyled' }],
    },
  ],
})

describe('no-hand-styled-button rule metadata', () => {
  it('names the canonical recipe and the escape hatch in its messages', () => {
    const messages = noHandStyledButton.meta.messages
    expect(messages.handStyled).toContain('cm.button(')
    expect(messages.handStyled).toContain('cm.touchTargetCompact')
    expect(messages.handStyled).toContain('DESIGN.md')
    expect(messages.handStyled).toContain('mol-bespoke-button')
    expect(messages.overridesClassMap).toContain('anti-pattern 12')
    expect(messages.directiveNeedsReason).toContain('mol-bespoke-button')
  })

  it('never lists a layout property as design-system-owned', () => {
    // A denylist that crept into layout territory is how a gate starts
    // false-positiving; this pins the boundary.
    const layoutOnly = [
      'display',
      'flex',
      'flexDirection',
      'gap',
      'alignItems',
      'justifyContent',
      'width',
      'minWidth',
      'maxWidth',
      'height',
      'minHeight',
      'maxHeight',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'zIndex',
      'transform',
      'opacity',
      'overflow',
      'whiteSpace',
      'textOverflow',
      'textAlign',
      'margin',
      'marginLeft',
      'marginRight',
      'marginTop',
      'marginBottom',
      'pointerEvents',
      'userSelect',
      'visibility',
      'flexShrink',
      'flexGrow',
      'gridColumn',
      'gridRow',
      'boxSizing',
      'verticalAlign',
      'outline',
    ]
    // Round-trip through the rule itself, via a real flat config, so this
    // asserts the shipped behaviour rather than the constant's contents.
    for (const property of layoutOnly) {
      const messages = lint(`const El = () => <button style={{ ${property}: 'x' }}>y</button>`)
      expect(messages, `${property} must not trip the rule`).toEqual([])
    }
  })

  it('exits non-zero shape on a known-bad input and clean on the canonical recipe', () => {
    // Rule 23: feed the gate a known-bad input and watch it fail. The bad input
    // is the Commit button as it actually shipped.
    const bad = lint(
      `const El = () => <button style={{ fontSize: 12, borderRadius: 6, background: 'rgba(64,112,224,0.2)', color: '#4070e0' }}>Commit</button>`,
    )
    expect(bad).toHaveLength(1)
    expect(bad[0].severity).toBe(2)
    expect(bad[0].messageId).toBe('handStyled')
    expect(bad[0].message).toContain('fontSize, borderRadius, background, color')

    const good = lint(
      `const El = () => <button className={cm.cn(cm.button({ variant: 'solid', color: 'primary', size: 'xs' }), cm.touchTargetCompact)}>Commit</button>`,
    )
    expect(good).toEqual([])
  })
})

/**
 * Lint a snippet through a real flat config with the rule at 'error'.
 *
 * @param code JSX source.
 * @returns ESLint messages.
 */
function lint(code: string) {
  return new Linter().verify(code, {
    plugins: { 'molecule-local': { rules: { 'no-hand-styled-button': noHandStyledButton } } },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'molecule-local/no-hand-styled-button': 'error' },
  })
}
