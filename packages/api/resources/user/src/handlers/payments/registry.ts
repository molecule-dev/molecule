/**
 * Payment handler registry.
 *
 * Exports generic payment handlers that work with any bonded payment
 * provider via route parameters. No static imports of provider-specific
 * code needed — adding a new payment provider requires only a new bond
 * package and a registry entry.
 *
 * @module
 */

export { handlePaymentNotification } from './handlePaymentNotification.js'
export { verifyPayment } from './verifyPayment.js'
