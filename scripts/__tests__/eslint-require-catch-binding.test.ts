import { RuleTester } from 'eslint'
import { describe, expect, it } from 'vitest'

import config from '../../eslint.config.js'

/**
 * Unit tests for `molecule-local/require-catch-binding` (AGENTS Rule 14: no
 * silent error swallows), read from the config molecule's lint actually loads.
 *
 * Both directions for every branch: a bindingless `catch {}` and a
 * parameterless rejection handler report, and the two sanctioned forms — the
 * error used, or bound as `_error` for a commented noop — stay silent.
 *
 * @module
 */

RuleTester.describe = describe
RuleTester.it = it

type RuleModule = Parameters<RuleTester['run']>[1]
type PluginEntry = { plugins?: Record<string, { rules?: Record<string, RuleModule> }> }

const rule = (config as PluginEntry[]).find((entry) => entry.plugins?.['molecule-local'])
  ?.plugins?.['molecule-local']?.rules?.['require-catch-binding']

it('is registered under molecule-local', () => {
  expect(rule).toBeDefined()
})

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
})

ruleTester.run('require-catch-binding', rule as RuleModule, {
  valid: [
    { name: 'catch clause that logs', code: 'try { f() } catch (error) { log(error) }' },
    { name: 'documented catch noop', code: 'try { f() } catch (_error) { /* why */ }' },
    { name: '.catch that logs', code: 'p.catch((error) => log(error))' },
    { name: '.catch documented noop', code: 'p.catch((_error) => undefined)' },
    { name: '.catch with a named handler', code: 'p.catch(handle)' },
    { name: '.catch function with a parameter', code: 'p.catch(function (error) { log(error) })' },
    { name: '.then with only a fulfilment handler', code: 'p.then(() => done())' },
    { name: '.then rejection handler that binds', code: 'p.then(ok, (_error) => null)' },
    { name: 'a non-promise catch method with no args', code: 'emitter.catch()' },
    { name: 'computed member is not a rejection handler', code: "p['catch'](() => {})" },
  ],
  invalid: [
    {
      name: 'bindingless catch clause',
      code: 'try { f() } catch { g() }',
      output: 'try { f() } catch (_error) { g() }',
      errors: [{ messageId: 'missing' }],
    },
    {
      name: 'parameterless arrow in .catch',
      code: 'p.catch(() => {})',
      output: null,
      errors: [{ messageId: 'missingRejection' }],
    },
    {
      name: 'parameterless async arrow in .catch',
      code: 'p.catch(async () => retry())',
      output: null,
      errors: [{ messageId: 'missingRejection' }],
    },
    {
      name: 'parameterless function expression in .catch',
      code: 'p.catch(function () { return null })',
      output: null,
      errors: [{ messageId: 'missingRejection' }],
    },
    {
      name: 'parameterless rejection handler in .then',
      code: 'p.then(ok, () => undefined)',
      output: null,
      errors: [{ messageId: 'missingRejection' }],
    },
    {
      name: 'chained after await',
      code: 'async function a() { await load().catch(() => null) }',
      output: null,
      errors: [{ messageId: 'missingRejection' }],
    },
  ],
})
