/**
 * The documented invoice resource (`createQueryResource` example), bound to the
 * bonded HTTP client, shared by the resource tests.
 *
 * @module
 */
import { getClient, unwrapList, unwrapSingle } from '@molecule/app-http'

import { createQueryResource } from '../../resource.js'

/** One invoice as the documented example holds it. */
export interface Invoice {
  /** The record id. */
  id: string
  /** The displayed number. */
  number: string
  /** Whether the invoice is flagged. */
  flagged: boolean
}

/** The example's resource, reading through the bonded client. */
export const invoices = createQueryResource<Invoice>({
  name: 'invoices',
  path: '/invoices',
  http: getClient,
  readList: (response) => unwrapList<Invoice>(response),
  readOne: (response) => unwrapSingle<Invoice>(response),
})

/** The viewer the example signs in as. */
export const VIEWER = 'reader'
