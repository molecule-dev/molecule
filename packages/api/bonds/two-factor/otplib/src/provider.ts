/**
 * Two-factor authentication provider implementation using otplib.
 *
 * @see https://www.npmjs.com/package/otplib
 * @see https://www.npmjs.com/package/qrcode
 *
 * @module
 */

import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'

import type {
  TwoFactorProvider,
  TwoFactorUrlParams,
  TwoFactorUrls,
  TwoFactorVerifyParams,
} from '@molecule/api-two-factor'

/**
 * Two-factor authentication provider backed by otplib and qrcode.
 */
export const provider: TwoFactorProvider = {
  generateSecret(): string {
    return generateSecret()
  },

  async getUrls(params: TwoFactorUrlParams): Promise<TwoFactorUrls> {
    const { username, service, secret } = params
    const keyUrl = generateURI({ issuer: service, label: username, secret })
    const QRImageUrl = await QRCode.toDataURL(keyUrl)
    return { keyUrl, QRImageUrl }
  },

  async verify(params: TwoFactorVerifyParams): Promise<boolean> {
    const { secret, token } = params
    // Allow ±30 seconds tolerance for clock skew between server and mobile devices
    return verifySync({ secret, token, epochTolerance: 30 }).valid
  },
}
