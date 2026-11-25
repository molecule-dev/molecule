import { expectTypeOf } from 'vitest'

import type { UserChipProps } from '../index.js'

type NameLinkProps = NonNullable<UserChipProps['nameLinkProps']>

expectTypeOf<'draggable'>().not.toExtend<keyof UserChipProps>()
expectTypeOf<'download'>().not.toExtend<keyof NameLinkProps>()
expectTypeOf<'children'>().not.toExtend<keyof UserChipProps>()
expectTypeOf<'children' | 'href' | 'as'>().not.toExtend<keyof NameLinkProps>()
expectTypeOf<{ title: string; target: string; 'data-track': string }>().toExtend<NameLinkProps>()
