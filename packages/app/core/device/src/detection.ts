/**
 * Device, browser, and OS detection logic.
 *
 * @module
 */

import type { DeviceInfo } from './types.js'

/**
 * Parses a user agent string to extract browser, OS, and device
 * type information.
 *
 * @param ua - The user agent string to parse.
 * @returns A `DeviceInfo` object with browser, OS, device type, and touch support.
 */
export const parseUserAgent = (ua: string): DeviceInfo => {
  const unknown = 'Unknown'

  // Browser detection
  let browserName = unknown
  let browserVersion = ''

  // Opera
  if (/Opera|OPR/.test(ua)) {
    browserName = 'Opera'
    const match = ua.match(/(?:Opera|OPR)[/ ](\d+(?:\.\d+)?)/i)
    browserVersion = match?.[1] || ''
  }
  // Edge
  else if (/Edg/.test(ua)) {
    browserName = 'Microsoft Edge'
    const match = ua.match(/Edg\/(\d+(?:\.\d+)?)/i)
    browserVersion = match?.[1] || ''
  }
  // Chrome
  else if (/Chrome/.test(ua) && !/Chromium/.test(ua)) {
    browserName = 'Chrome'
    const match = ua.match(/Chrome\/(\d+(?:\.\d+)?)/i)
    browserVersion = match?.[1] || ''
  }
  // Safari
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browserName = 'Safari'
    const match = ua.match(/Version\/(\d+(?:\.\d+)?)/i)
    browserVersion = match?.[1] || ''
  }
  // Firefox
  else if (/Firefox/.test(ua)) {
    browserName = 'Firefox'
    const match = ua.match(/Firefox\/(\d+(?:\.\d+)?)/i)
    browserVersion = match?.[1] || ''
  }
  // IE
  else if (/MSIE|Trident/.test(ua)) {
    browserName = 'Internet Explorer'
    const match = ua.match(/(?:MSIE |rv:)(\d+(?:\.\d+)?)/i)
    browserVersion = match?.[1] || ''
  }

  const browserMajorVersion = parseInt(browserVersion, 10) || 0

  // OS detection
  let osName = unknown
  let osVersion = ''
  let osFamily = unknown

  const osPatterns: Array<{ pattern: RegExp; name: string; family: string }> = [
    { pattern: /Windows NT 10\.0/, name: 'Windows 10/11', family: 'Windows' },
    { pattern: /Windows NT 6\.3/, name: 'Windows 8.1', family: 'Windows' },
    { pattern: /Windows NT 6\.2/, name: 'Windows 8', family: 'Windows' },
    { pattern: /Windows NT 6\.1/, name: 'Windows 7', family: 'Windows' },
    { pattern: /Mac OS X/, name: 'macOS', family: 'macOS' },
    { pattern: /iPhone|iPad|iPod/, name: 'iOS', family: 'iOS' },
    { pattern: /Android/, name: 'Android', family: 'Android' },
    { pattern: /Linux/, name: 'Linux', family: 'Linux' },
    { pattern: /CrOS/, name: 'Chrome OS', family: 'Chrome OS' },
  ]

  for (const { pattern, name, family } of osPatterns) {
    if (pattern.test(ua)) {
      osName = name
      osFamily = family
      break
    }
  }

  // Extract OS version
  if (osFamily === 'iOS') {
    const match = ua.match(/OS (\d+[_\d]*)/i)
    osVersion = match?.[1]?.replace(/_/g, '.') || ''
  } else if (osFamily === 'Android') {
    const match = ua.match(/Android (\d+(?:\.\d+)?)/i)
    osVersion = match?.[1] || ''
  } else if (osFamily === 'macOS') {
    const match = ua.match(/Mac OS X (\d+[_\d]*)/i)
    osVersion = match?.[1]?.replace(/_/g, '.') || ''
  }

  // Device type detection
  const isMobile = /Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua)
  const isDesktop = !isMobile && !isTablet

  let type: DeviceInfo['type'] = 'unknown'
  if (isMobile) type = 'mobile'
  else if (isTablet) type = 'tablet'
  else if (isDesktop) type = 'desktop'

  // Touch support
  const hasTouch =
    typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

  return {
    name: `${osName} ${browserName}`,
    browser: {
      name: browserName,
      version: browserVersion,
      majorVersion: browserMajorVersion,
    },
    os: {
      name: osName,
      version: osVersion,
      family: osFamily,
    },
    isMobile,
    isTablet,
    isDesktop,
    type,
    hasTouch,
    userAgent: ua,
  }
}
