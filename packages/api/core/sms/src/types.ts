/**
 * SMS core types for molecule.dev.
 *
 * Defines the standard interfaces for SMS messaging providers.
 *
 * @module
 */

/**
 * Options for sending an SMS message.
 */
export interface SMSOptions {
  /** Sender phone number or alphanumeric ID. */
  from?: string

  /** Schedule the message for future delivery. */
  scheduledAt?: Date

  /** URL to receive delivery status callbacks. */
  callbackUrl?: string
}

/**
 * Result of sending a single SMS message.
 */
export interface SMSResult {
  /** Provider-assigned message identifier. */
  id: string

  /** Current delivery status. */
  status: 'queued' | 'sent' | 'delivered' | 'failed'

  /** Recipient phone number. */
  to: string
}

/**
 * A single message in a bulk send operation.
 */
export interface BulkSMSMessage {
  /** Recipient phone number. */
  to: string

  /** Message body text. */
  message: string

  /** Per-message send options. */
  options?: SMSOptions
}

/**
 * Result of a bulk SMS send operation.
 */
export interface BulkSMSResult {
  /** Individual results for each message in the batch. */
  results: SMSResult[]

  /** Total number of messages in the batch. */
  total: number

  /** Number of messages that were successfully queued or sent. */
  successful: number

  /** Number of messages that failed. */
  failed: number
}

/**
 * Delivery status information for a previously sent message.
 */
export interface SMSStatus {
  /** Provider-assigned message identifier. */
  id: string

  /** Current delivery status. */
  status: 'queued' | 'sent' | 'delivered' | 'failed'

  /** When the message was delivered, if applicable. */
  deliveredAt?: Date

  /** Error description if the message failed. */
  error?: string
}

/**
 * SMS provider interface.
 *
 * All SMS providers must implement this interface to provide
 * send, bulk send, and status query capabilities.
 */
export interface SMSProvider {
  /**
   * Sends a single SMS message.
   *
   * @param to - Recipient phone number in E.164 format.
   * @param message - Message body text.
   * @param options - Optional send configuration.
   * @returns The send result with message ID and status.
   */
  send(to: string, message: string, options?: SMSOptions): Promise<SMSResult>

  /**
   * Sends multiple SMS messages in a single batch.
   *
   * @param messages - Array of messages to send.
   * @returns Aggregated results for the entire batch.
   */
  sendBulk(messages: BulkSMSMessage[]): Promise<BulkSMSResult>

  /**
   * Retrieves the delivery status of a previously sent message.
   *
   * @param messageId - The provider-assigned message identifier.
   * @returns Current delivery status information.
   */
  getStatus(messageId: string): Promise<SMSStatus>
}
