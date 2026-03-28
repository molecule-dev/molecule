/**
 * SMS convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type { BulkSMSMessage, BulkSMSResult, SMSOptions, SMSResult, SMSStatus } from './types.js'

/**
 * Sends a single SMS message using the bonded provider.
 *
 * @param to - Recipient phone number in E.164 format.
 * @param message - Message body text.
 * @param options - Optional send configuration.
 * @returns The send result with message ID and status.
 * @throws {Error} If no SMS provider has been bonded.
 */
export const send = async (
  to: string,
  message: string,
  options?: SMSOptions,
): Promise<SMSResult> => {
  return getProvider().send(to, message, options)
}

/**
 * Sends multiple SMS messages in a single batch using the bonded provider.
 *
 * @param messages - Array of messages to send.
 * @returns Aggregated results for the entire batch.
 * @throws {Error} If no SMS provider has been bonded.
 */
export const sendBulk = async (messages: BulkSMSMessage[]): Promise<BulkSMSResult> => {
  return getProvider().sendBulk(messages)
}

/**
 * Retrieves the delivery status of a previously sent message.
 *
 * @param messageId - The provider-assigned message identifier.
 * @returns Current delivery status information.
 * @throws {Error} If no SMS provider has been bonded.
 */
export const getStatus = async (messageId: string): Promise<SMSStatus> => {
  return getProvider().getStatus(messageId)
}
