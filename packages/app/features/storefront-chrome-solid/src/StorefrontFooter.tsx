/**
 * Solid storefront footer: brand block + N columns of links + copyright row.
 *
 * Solid counterpart of `@molecule/app-storefront-chrome-react`'s
 * `StorefrontFooter` — the same props (React names), the same DOM for the same
 * input.
 *
 * @module
 */

import { type Component, For, type JSX, Show } from 'solid-js'

import { Link } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { FooterColumn, StorefrontFooterProps } from './types.js'

/**
 * Storefront footer with brand block + columns + copyright.
 *
 * @param props - Component props (see {@link StorefrontFooterProps}).
 * @returns The rendered storefront footer.
 */
export const StorefrontFooter: Component<StorefrontFooterProps> = (props) => {
  const cm = getClassMap()
  const columns = (): FooterColumn[] => props.columns ?? []

  return (
    <footer
      class={cm.cn(
        cm.w('full'),
        cm.sp('pt', 16),
        cm.sp('pb', 8),
        cm.storefrontChromeFooter,
        props.className,
      )}
    >
      <div
        class={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.grid({ cols: 1, gap: 'xl' }),
          cm.storefrontChromeFooterColumns,
        )}
      >
        <div class={cm.cn(cm.storefrontChromeFooterBrandCol)}>
          <div class={cm.cn(cm.textSize('xl'), cm.sp('mb', 4), cm.storefrontChromeFooterBrand)}>
            {props.brand}
          </div>
          <Show when={props.tagline}>
            <p class={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterTagline)}>
              {props.tagline}
            </p>
          </Show>
        </div>
        <For each={columns()}>
          {(col): JSX.Element => (
            <div>
              <h4
                class={cm.cn(
                  cm.fontWeight('bold'),
                  cm.sp('mb', 4),
                  cm.textSize('sm'),
                  cm.storefrontChromeFooterHeading,
                )}
              >
                {col.heading}
              </h4>
              <ul class={cm.stack(2)}>
                <For each={col.links}>
                  {(link): JSX.Element => (
                    <li>
                      <Link
                        class={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterLink)}
                        to={link.to}
                      >
                        {link.label}
                      </Link>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          )}
        </For>
      </div>
      <div
        class={cm.cn(
          cm.maxW('[1280px]'),
          cm.mxAuto,
          cm.sp('px', 6),
          cm.sp('pt', 12),
          cm.sp('mt', 12),
          cm.storefrontChromeFooterDivider,
        )}
      >
        <p class={cm.cn(cm.textSize('sm'), cm.storefrontChromeFooterCopyright)}>
          {props.copyright}
        </p>
      </div>
    </footer>
  )
}

export default StorefrontFooter
