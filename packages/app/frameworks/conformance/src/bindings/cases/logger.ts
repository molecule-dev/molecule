/**
 * Cases for the logger hooks (`useLogger`, `useLoggerProvider`,
 * `useRootLogger`, `useChildLogger`).
 *
 * Every framework receives the kit's recording logger provider: a log call
 * records `logger.<level>` with `[name, message, …args]` and — for a logger
 * derived through `withContext` — a final `{ $context }` argument. Nothing
 * records when a logger is merely created, so a mount-only case pins that no
 * log call happens until a method is called.
 *
 * @module
 */

import type { HookCases } from '../spec.js'

/** `useLoggerProvider()`: the logger provider from the framework's context. */
export const useLoggerProviderCases: HookCases = {
  hook: 'useLoggerProvider',
  cases: [
    { name: 'no log call on mount alone' },
    {
      name: 'getLogger returns named and root loggers',
      steps: [
        { type: 'call', method: 'getLogger', args: ['Net'] },
        { type: 'call', method: 'getLogger' },
      ],
    },
    {
      name: 'createLogger accepts a config object',
      steps: [{ type: 'call', method: 'createLogger', args: [{ name: 'Db', level: 'warn' }] }],
    },
    {
      name: 'the provider keeps level and enablement state',
      steps: [
        { type: 'call', method: 'setLevel', args: ['warn'] },
        { type: 'call', method: 'getLevel' },
        { type: 'call', method: 'disable' },
        { type: 'call', method: 'isEnabled' },
        { type: 'call', method: 'enable' },
        { type: 'call', method: 'isEnabled' },
      ],
    },
    {
      name: 'addTransport records on the provider and returns an unsubscribe',
      steps: [{ type: 'call', method: 'addTransport', args: [{ $fn: 'sink' }] }],
    },
    { name: 'without a logger provider', context: { omitServices: ['logger'] } },
  ],
}

/** `useLogger(name, config?)`: a named logger from the context provider. */
export const useLoggerCases: HookCases = {
  hook: 'useLogger',
  cases: [
    { name: 'no log call on mount alone', args: ['Net'] },
    {
      name: 'logs at every level under its name',
      args: ['Net'],
      steps: [
        { type: 'call', method: 'trace', args: ['t'] },
        { type: 'call', method: 'debug', args: ['d'] },
        { type: 'call', method: 'info', args: ['i'] },
        { type: 'call', method: 'warn', args: ['w'] },
        { type: 'call', method: 'error', args: ['e'] },
      ],
    },
    {
      name: 'passes extra arguments through',
      args: ['Net'],
      steps: [
        { type: 'call', method: 'info', args: ['saved', { id: 7 }] },
        { type: 'call', method: 'error', args: ['failed', { code: 4 }] },
      ],
    },
    {
      name: 'a config object names the logger',
      args: ['Ignored', { name: 'Real', level: 'warn' }],
      steps: [{ type: 'call', method: 'info', args: ['hi'] }],
    },
    {
      name: 'setLevel then getLevel on the logger',
      args: ['Net'],
      steps: [
        { type: 'call', method: 'setLevel', args: ['silent'] },
        { type: 'call', method: 'getLevel' },
      ],
    },
    {
      name: 'child and withContext return loggers',
      args: ['Net'],
      steps: [
        { type: 'call', method: 'child', args: ['sub'] },
        { type: 'call', method: 'withContext', args: [{ userId: 'u1' }] },
      ],
    },
    {
      name: 'addTransport records and returns an unsubscribe',
      args: ['Net'],
      steps: [{ type: 'call', method: 'addTransport', args: [{ $fn: 'transport' }] }],
    },
    {
      name: 'removeTransport records on the logger',
      args: ['Net'],
      steps: [{ type: 'call', method: 'removeTransport', args: [{ $fn: 'transport' }] }],
    },
    { name: 'without a logger provider', args: ['Net'], context: { omitServices: ['logger'] } },
  ],
}

/** `useRootLogger()`: the provider's unnamed root logger. */
export const useRootLoggerCases: HookCases = {
  hook: 'useRootLogger',
  cases: [
    {
      name: 'logs under the empty root name',
      steps: [{ type: 'call', method: 'info', args: ['boot'] }],
    },
    {
      name: 'carries extra arguments',
      steps: [{ type: 'call', method: 'warn', args: ['slow', { ms: 12 }] }],
    },
    { name: 'without a logger provider', context: { omitServices: ['logger'] } },
  ],
}

/** `useChildLogger(parentName, context)`: a logger whose context rides every call. */
export const useChildLoggerCases: HookCases = {
  hook: 'useChildLogger',
  cases: [
    {
      name: 'adds its context to every level',
      args: ['UserList', { panel: 'left' }],
      steps: [
        { type: 'call', method: 'trace', args: ['enter'] },
        { type: 'call', method: 'error', args: ['crash'] },
      ],
    },
    {
      name: 'an empty context adds no context argument',
      args: ['UserList', {}],
      steps: [{ type: 'call', method: 'info', args: ['plain'] }],
    },
    {
      name: 'withContext on the child returns a logger',
      args: ['UserList', { panel: 'left' }],
      steps: [{ type: 'call', method: 'withContext', args: [{ userId: 'u1' }] }],
    },
    {
      name: 'without a logger provider',
      args: ['UserList', { panel: 'left' }],
      context: { omitServices: ['logger'] },
    },
  ],
}
