/**
 * Type definitions for the HelloSign (Dropbox Sign) e-signature provider.
 *
 * @module
 */

export type {
  CreateSignatureRequestInput,
  EsignDocument,
  EsignProvider,
  EsignWebhookEvent,
  EsignWebhookEventType,
  SignatureRequest,
  SignatureRequestStatus,
  Signer,
  SignerStatus,
  SignerWithStatus,
} from '@molecule/api-esign'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /**
     * Process Env interface.
     */
    export interface ProcessEnv {
      /**
       * The API key used for HelloSign / Dropbox Sign. Sent as the username
       * in HTTP Basic auth (with an empty password) to
       * `https://api.hellosign.com/v3/`.
       */
      HELLOSIGN_API_KEY?: string
    }
  }
}
