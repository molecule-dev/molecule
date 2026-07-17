/**
 * Shipping convenience functions that delegate to the bonded provider.
 *
 * @module
 */

import { getProvider } from './provider.js'
import type {
  Shipment,
  ShipmentQuote,
  ShippingLabel,
  ShippingRate,
  TrackingStatus,
} from './types.js'

/**
 * Lists carriers supported by the bonded provider.
 *
 * @returns Array of carrier identifiers.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const listSupportedCarriers = async (): Promise<string[]> => {
  return getProvider().listSupportedCarriers()
}

/**
 * Creates a shipment using the bonded provider, returning its provider-assigned
 * id together with the rate quotes for it. Use this (not {@link getRates}) when
 * you intend to purchase a label — {@link createLabel} needs the returned
 * `shipmentId`.
 *
 * @param shipment - The shipment to create and rate.
 * @returns The created shipment's id and its available rates.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const createShipment = async (shipment: Shipment): Promise<ShipmentQuote> => {
  return getProvider().createShipment(shipment)
}

/**
 * Requests rate quotes for a shipment using the bonded provider, discarding the
 * shipment id. Convenience over {@link createShipment} for display-only flows;
 * to buy a label use {@link createShipment} and keep the `shipmentId` too.
 *
 * @param shipment - The shipment to rate.
 * @returns Array of available rates.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const getRates = async (shipment: Shipment): Promise<ShippingRate[]> => {
  return getProvider().getRates(shipment)
}

/**
 * Purchases a shipping label for the given rate using the bonded provider.
 *
 * @param shipmentId - Provider-assigned shipment identifier from a prior rate quote.
 * @param rate - The rate selected for purchase.
 * @returns The purchased label.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const createLabel = async (
  shipmentId: string,
  rate: ShippingRate,
): Promise<ShippingLabel> => {
  return getProvider().createLabel(shipmentId, rate)
}

/**
 * Voids a previously purchased label using the bonded provider.
 *
 * @param labelId - Provider-assigned label identifier to void.
 * @returns A promise that resolves when the label has been voided.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const voidLabel = async (labelId: string): Promise<void> => {
  return getProvider().voidLabel(labelId)
}

/**
 * Retrieves the current tracking status for a package using the bonded provider.
 *
 * @param carrier - Carrier identifier.
 * @param trackingNumber - Carrier-assigned tracking number.
 * @returns The aggregated tracking status.
 * @throws {Error} If no shipping provider has been bonded.
 */
export const trackPackage = async (
  carrier: string,
  trackingNumber: string,
): Promise<TrackingStatus> => {
  return getProvider().trackPackage(carrier, trackingNumber)
}
