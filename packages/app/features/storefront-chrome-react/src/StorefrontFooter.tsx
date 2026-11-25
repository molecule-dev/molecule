/**
 * Storefront footer: brand block + N columns of links + copyright row.
 *
 * @module
 */

import type { ReactElement, ReactNode } from 'react'

import { getClassMap } from '@molecule/app-ui'
import { Box, Link, Text } from '@molecule/app-ui-react/elements'

import type { FooterColumn } from './types.js'

/** Props for the {@link StorefrontFooter} component. */
export interface StorefrontFooterProps {
  brand: ReactNode
  tagline?: ReactNode
  columns?: FooterColumn[]
  copyright: ReactNode
  className?: string
}

/** Storefront footer with brand block + columns + copyright. */
export function StorefrontFooter({
  brand,
  tagline,
  columns = [],
  copyright,
  className,
}: StorefrontFooterProps): ReactElement {
  const cm = getClassMap()
  return (
    <Box
      as="footer"
      className={cm.cn(
        cm.w('full'),
        cm.sp('pt', 16),
        cm.sp('pb', 8),
        cm.storefrontChromeFooter,
        className,
      )}
    >
      <Box
        as="div"
        className={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.grid({ cols: 1, gap: 'xl' }),
          cm.storefrontChromeFooterColumns,
        )}
      >
        <Box as="div" className={cm.cn(cm.storefrontChromeFooterBrandCol)}>
          <Box
            as="div"
            className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), cm.storefrontChromeFooterBrand)}
          >
            {brand}
          </Box>
          {tagline ? (
            <Text as="p" className={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterTagline)}>
              {tagline}
            </Text>
          ) : null}
        </Box>
        {columns.map((col, i) => (
          <Box as="div" key={i}>
            <Text
              as="h4"
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                cm.storefrontChromeFooterHeading,
              )}
            >
              {col.heading}
            </Text>
            <Box as="ul" className={cm.stack(2)}>
              {col.links.map((link) => (
                <Box as="li" key={link.to}>
                  <Link
                    className={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterLink)}
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      <Box
        as="div"
        className={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('pt', 12),
          cm.sp('mt', 12),
          cm.storefrontChromeFooterDivider,
        )}
      >
        <Text as="p" className={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterCopyright)}>
          {copyright}
        </Text>
      </Box>
    </Box>
  )
}

export default StorefrontFooter
