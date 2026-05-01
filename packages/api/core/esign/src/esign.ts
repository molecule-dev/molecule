/**
 * E-signature convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type { CreateSignatureRequestInput, EsignWebhookEvent, SignatureRequest } from './types.js'

/**
 * Creates a new signature request via the bonded provider.
 *
 * @param input - Title, signers, document, and optional CC / message fields.
 * @returns The newly-created signature request, normalized.
 * @throws {Error} If no e-signature provider has been bonded.
 */
export const createSignatureRequest = async (
  input: CreateSignatureRequestInput,
): Promise<SignatureRequest> => {
  return getProvider().createSignatureRequest(input)
}

/**
 * Retrieves the current state of a signature request.
 *
 * @param id - Provider-issued signature request id.
 * @returns The current state of the signature request, normalized.
 * @throws {Error} If no e-signature provider has been bonded.
 */
export const getSignatureRequest = async (id: string): Promise<SignatureRequest> => {
  return getProvider().getSignatureRequest(id)
}

/**
 * Cancels a pending signature request.
 *
 * @param id - Provider-issued signature request id.
 * @throws {Error} If no e-signature provider has been bonded.
 */
export const cancelSignatureRequest = async (id: string): Promise<void> => {
  return getProvider().cancelSignatureRequest(id)
}

/**
 * Downloads the signed document for a completed signature request.
 *
 * @param id - Provider-issued signature request id.
 * @returns The signed document bytes.
 * @throws {Error} If no e-signature provider has been bonded.
 */
export const getSignedDocument = async (id: string): Promise<Buffer> => {
  return getProvider().getSignedDocument(id)
}

/**
 * Verifies and parses an inbound webhook callback from the provider.
 *
 * @param headers - The HTTP request headers.
 * @param body - The parsed JSON request body.
 * @returns A normalized webhook event.
 * @throws {Error} If no e-signature provider has been bonded, or the
 *   signature is invalid.
 */
export const processWebhook = async (
  headers: Record<string, string | string[] | undefined>,
  body: unknown,
): Promise<EsignWebhookEvent> => {
  return getProvider().processWebhook(headers, body)
}
