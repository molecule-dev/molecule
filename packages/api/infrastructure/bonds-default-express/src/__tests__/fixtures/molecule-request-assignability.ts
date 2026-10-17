/**
 * Type-level assertion, compiled by `http-types.test.ts` and never run.
 *
 * It reproduces flash-m106's +05:34 `check` failure at its root: an Express 5
 * handler's own `Request`/`Response` passed to `authorization.set`. Express 5's
 * `ParamsDictionary` is `{ [key: string]: string | string[] }`, so the old
 * `MoleculeRequest.params: Record<string, string>` made this file fail TS2345 —
 * and the executor then cast, because the declaration lives in a package it
 * cannot edit.
 *
 * Compiling clean here is the promise `MoleculeRequest`'s doc comment makes:
 * Express objects satisfy it without adapters.
 */

import type { Request, Response } from 'express'

import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'
import { authorization } from '@molecule/api-resource-user'

declare const req: Request
declare const res: Response

/** The shapes Express hands a handler ARE the shapes the package functions take. */
export const moleculeRequest: MoleculeRequest = req
export const moleculeResponse: MoleculeResponse = res

/** The call the X1 handler makes: no cast, no adapter. */
export function signIn(session: { userId: string; deviceId: string }): string | null {
  return authorization.set(req, res, session)
}

/**
 * A reader typed on `MoleculeRequest` still gets a usable id: the segment is
 * `any` (Express may hand an array for a wildcard), so a consumer narrows it.
 */
export function userIdOf(request: MoleculeRequest): string | null {
  const id = request.params.id
  return typeof id === 'string' ? id : null
}
