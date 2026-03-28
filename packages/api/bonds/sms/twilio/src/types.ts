/**
 * Twilio SMS provider configuration types.
 *
 * @module
 */

/**
 * Configuration for the Twilio SMS provider.
 */
export interface TwilioSMSConfig {
  /** Twilio Account SID. Defaults to `process.env.TWILIO_ACCOUNT_SID`. */
  accountSid?: string

  /** Twilio Auth Token. Defaults to `process.env.TWILIO_AUTH_TOKEN`. */
  authToken?: string

  /** Default sender phone number in E.164 format. Defaults to `process.env.TWILIO_FROM_NUMBER`. */
  defaultFrom?: string
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    /** Twilio-specific environment variable declarations. */
    export interface ProcessEnv {
      TWILIO_ACCOUNT_SID?: string
      TWILIO_AUTH_TOKEN?: string
      TWILIO_FROM_NUMBER?: string
    }
  }
}
