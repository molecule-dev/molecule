/**
 * Storefront footer: brand block + N columns of links + copyright row.
 *
 * @module
 */

import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { getClassMap } from '@molecule/app-ui'

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
    <footer
      className={cm.cn(
        cm.w('full'),
        cm.sp('pt', 16),
        cm.sp('pb', 8),
        'bg-slate-900 dark:bg-black border-t border-slate-800 mt-20',
        className,
      )}
    >
      <div
        className={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.grid({ cols: 1, gap: 'xl' }),
          'md:grid-cols-4',
        )}
      >
        <div className={cm.cn('col-span-1 md:col-span-1')}>
          <div className={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), 'font-black text-white')}>
            {brand}
          </div>
          {tagline ? (
            <p className={cm.cn(cm.textSize('sm'), 'text-slate-400 font-sans leading-relaxed')}>
              {tagline}
            </p>
          ) : null}
        </div>
        {columns.map((col, i) => (
          <div key={i}>
            <h4
              className={cm.cn(
                cm.fontWeight('bold'),
                cm.sp('mb', 4),
                cm.textSize('sm'),
                'text-white',
              )}
            >
              {col.heading}
            </h4>
            <ul className={cm.stack(2)}>
              {col.links.map((link) => (
                <li key={link.to}>
                  <Link
                    className={cm.cn(
                      cm.textSize('sm'),
                      'text-slate-400 hover:text-green-400 transition-colors',
                    )}
                    to={link.to}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        className={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('pt', 12),
          cm.sp('mt', 12),
          'border-t border-slate-800',
        )}
      >
        <p className={cm.cn(cm.textSize('sm'), 'text-slate-400')}>{copyright}</p>
      </div>
    </footer>
  )
}

export default StorefrontFooter
