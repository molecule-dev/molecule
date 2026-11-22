import { RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

import { moleculeLocalPlugin } from '../plugin.mjs'
import { lintProject } from './project.js'

const project = await lintProject({
  dependencies: { '@molecule/app-react': '1.0.0', '@molecule/app-routing-react-router': '1.0.0' },
})
afterAll(() => project.remove())

const rule = moleculeLocalPlugin.rules?.['url-lists-use-list-route']
const ruleId = 'molecule-local/url-lists-use-list-route'

const home = `import { useState } from 'react'

export function Home() {
  const [category, setCategory] = useState('all')
  const visible = products.filter((product) => category === 'all' || product.category === category)
  return <ProductList items={visible} category={category} onCategory={setCategory} />
}
`

describe('molecule-local/url-lists-use-list-route', () => {
  it('allows local-only filtering under the full config with the package-doc message', async () => {
    expect(rule).toBeDefined()
    const findings = (await project.lint(home, 'Home.tsx')).filter(
      (message) => message.ruleId === ruleId,
    )
    expect(findings).toEqual([])
  })

  if (rule) {
    const tester = new RuleTester({
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    })

    tester.run('url-lists-use-list-route', rule, {
      valid: [
        {
          name: 'mapping static choices to selected form controls is not list filtering',
          filename: 'Preferences.tsx',
          code: `import { useState } from 'react'
export function Preferences() {
  const [provider, setProvider] = useState('a')
  return <div>{['a', 'b'].map((choice) => <button aria-pressed={provider === choice} onClick={() => setProvider(choice)}>{choice}</button>)}</div>
}
`,
        },
        {
          name: 'a file already using useListRoute stays silent',
          filename: 'Catalog.tsx',
          code: `import { useListRoute } from '@molecule/app-routing-react-router'
import { useSearchParams } from 'react-router'
const list = useListRoute()
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'Settings reads tab only to choose a form',
          filename: 'Settings.tsx',
          code: `import { useSearchParams } from 'react-router'
export function Settings() {
  const [params] = useSearchParams()
  const tab = params.get('tab')
  if (tab === 'billing') return <BillingForm />
  return <ProfileForm />
}
`,
        },
        {
          name: 'a nested helper reads topic only to build a share URL',
          filename: 'Share.tsx',
          code: `import { useSearchParams } from 'react-router'
export function SharePage() {
  const [params] = useSearchParams()
  const buildShareUrl = () => '/share?topic=' + (params.get('topic') ?? '')
  return <a href={buildShareUrl()}>Share</a>
}
`,
        },
        {
          name: 'login navigation and credential query keys stay silent',
          filename: 'Login.tsx',
          code: `import { useSearchParams } from 'react-router'
const [params] = useSearchParams()
const returnTo = params.get('returnTo')
const redirect = params.get('redirect')
const token = params.get('token')
`,
        },
        {
          name: 'a redirect value is not list state',
          filename: 'Login.tsx',
          code: `import { useNavigate, useSearchParams } from 'react-router'
export function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = params.get('returnTo') ?? '/'
  return <button onClick={() => navigate(returnTo)}>Continue</button>
}
`,
        },
        {
          name: 'a reset token copied into a form field is not list state',
          filename: 'ResetPassword.tsx',
          code: `import { useState } from 'react'
import { useSearchParams } from 'react-router'
export function ResetPassword() {
  const [params] = useSearchParams()
  const [token] = useState(params.get('token') || '')
  return <input value={token} />
}
`,
        },
        {
          name: 'an upload album preselection is not a rendered list filter',
          filename: 'Upload.tsx',
          code: `import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
export function Upload() {
  const [params] = useSearchParams()
  const initial = params.get('album_id') ?? ''
  const [album] = useState(initial)
  useEffect(() => {
    listAlbums({ owner: 'me' }).then((items) => {
      if (initial && !items.some((item) => item.id === initial)) return null
      return items
    })
  }, [initial])
  return <select value={album} />
}
`,
        },
        {
          name: 'a token in a tracking fetch path is not a list request',
          filename: 'PublicIssue.tsx',
          code: `import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
export function PublicIssue() {
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  useEffect(() => {
    if (token) fetch('/api/issues/open/' + encodeURIComponent(token))
  }, [token])
  return <article />
}
`,
        },
        {
          name: 'an analytics range chip is not list evidence',
          filename: 'Analytics.tsx',
          code: `import { useSearchParams } from 'react-router'
export function Analytics() {
  const [params] = useSearchParams()
  const range = params.get('range') ?? '7d'
  return <button aria-pressed={range === '7d'}>Last 7 days</button>
}
`,
        },
        {
          name: 'a prompt style chip is not list evidence',
          filename: 'PromptComposer.tsx',
          code: `import { useLocation } from 'react-router'
export function PromptComposer() {
  const params = new URLSearchParams(useLocation().search)
  const style = params.get('style') ?? 'photoreal'
  const active = style === 'anime'
  return <button aria-pressed={active}>Anime</button>
}
`,
        },
        {
          name: 'a payment return translation is not list evidence',
          filename: 'PlanUpdated.tsx',
          code: `import { useSearchParams } from 'react-router'
export function PlanUpdated() {
  const [params] = useSearchParams()
  const planKey = params.get('planKey')
  return <p>{t('planUpdated.confirmed', { planKey })}</p>
}
`,
        },
        {
          name: 'a passenger count in a pricing memo is not a list operation',
          filename: 'Booking.tsx',
          code: `import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
export function Booking() {
  const [params] = useSearchParams()
  const passengers = Number(params.get('passengers') ?? '1')
  const total = useMemo(() => price * passengers, [price, passengers])
  return <><p>{total}</p><dd>×{passengers}</dd></>
}
`,
        },
        {
          name: 'hook-managed filter state controlling the same list stays silent',
          filename: 'Catalog.tsx',
          code: `import { useListRoute } from '@molecule/app-routing-react-router'
export function Catalog() {
  const route = useListRoute({ filters: { category: {} } })
  const category = route.filters.category ?? 'all'
  const visible = products.filter((p) => category === 'all' || p.category === category)
  return <ProductList items={visible} category={category} />
}
`,
        },
        {
          name: 'editable email prefill in a form preview is not a list consumer',
          filename: 'Compose.tsx',
          code: `import { useState } from 'react'
import { useSearchParams } from 'react-router'
export function Compose() {
  const [params] = useSearchParams()
  const [recipient, setRecipient] = useState(params.get('to') ?? '')
  const [subject, setSubject] = useState(params.get('subject') ?? '')
  return <><EmailPreview recipient={recipient} subject={subject} onRecipient={setRecipient} onSubject={setSubject} /><pre>{recipient}:{subject}</pre></>
}
`,
        },
        {
          name: 'generic analytics and detail queries are not list-fetching hooks',
          filename: 'Analytics.tsx',
          code: `import { useSearchParams } from 'react-router'
export function Analytics() {
  const [params] = useSearchParams()
  const range = params.get('range') ?? '7d'
  const id = params.get('id') ?? ''
  const analytics = useQuery({ queryKey: ['analytics', range] })
  const detail = useQuery({ queryKey: ['product', id] })
  return <Dashboard analytics={analytics} detail={detail} />
}
`,
        },
        {
          name: 'cross-file re-exports wrappers and URL prop chains are out of scope',
          filename: 'Catalog.tsx',
          code: `import { useFilters } from './router'
export function Catalog() {
  const params = useFilters()
  return <ProductList sort={params.get('sort')} />
}
`,
        },
        {
          name: 'local state consumed by a non-list form stays silent',
          filename: 'Profile.tsx',
          code: `import { useState } from 'react'
export function Profile() {
  const [name, setName] = useState('Ada')
  return <ProfileForm name={name} onName={setName} />
}
`,
        },
        {
          name: 'loading refresh keys result metadata and retry closures are not URL list state',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const result = useProducts({ refreshKey })
  return <ProductList loading={loading} totalPages={totalPages} onRetry={() => reload(refreshKey)} />
}
`,
        },
        {
          name: 'a local analytics range only changes a count, not a rendered list',
          filename: 'Analytics.tsx',
          code: `import { useState } from 'react'
export function Analytics() {
  const [range, setRange] = useState(7)
  const count = events.filter((event) => event.age < range).length
  return <><input value={range} onChange={setRange} /><p>{count}</p></>
}
`,
        },
        {
          name: 'filtering form choices without rendering the result stays silent',
          filename: 'Compose.tsx',
          code: `import { useState } from 'react'
export function Compose() {
  const [recipient, setRecipient] = useState('')
  const valid = contacts.filter((contact) => contact.email === recipient).length > 0
  return <EmailPreview recipient={recipient} valid={valid} onRecipient={setRecipient} />
}
`,
        },
        {
          name: 'a type-only import creates no runtime search-params binding',
          filename: 'Types.tsx',
          code: `import type { useSearchParams } from 'react-router'
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'an inline type-only specifier creates no runtime binding',
          filename: 'Types.tsx',
          code: `import { type useSearchParams } from 'react-router-dom'
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'a same-named hook from another package stays silent',
          filename: 'Catalog.tsx',
          code: `import { useSearchParams } from './useSearchParams'
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'awaited list responses retain the local request filter dependency',
          filename: 'Catalog.tsx',
          code: `import { useEffect, useState } from 'react'
export function Catalog() {
  const [category, setCategory] = useState('all')
  const [products, setProducts] = useState([])
  useEffect(() => {
    async function load() {
      const response = await http.get('/api/products', { params: { category } })
      setProducts(response.data)
    }
    void load()
  }, [category])
  return <ProductList items={products} onCategory={setCategory} />
}
`,
        },
        {
          name: 'a local filter used only inside a rendered array callback warns',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [feed, setFeed] = useState('all')
  const visible = products.filter((product) => feed === 'all' || product.feed === feed)
  return <><select value={feed} onChange={setFeed} /><ProductList items={visible} /></>
}
`,
        },
        {
          name: 'derived local search through a memo still controls a rendered list',
          filename: 'Catalog.tsx',
          code: `import { useMemo, useState } from 'react'
export function Catalog() {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const visible = useMemo(() => products.filter((product) => product.name.includes(normalized)), [normalized])
  return <><input value={query} onChange={setQuery} /><ProductList items={visible} /></>
}
`,
        },
        {
          name: 'local sorting in a memo controls a rendered collection',
          filename: 'Catalog.tsx',
          code: `import { useMemo, useState } from 'react'
export function Catalog() {
  const [sort, setSort] = useState('price')
  const visible = useMemo(() => [...products].sort((a, b) => sort === 'price' ? a.price - b.price : a.name.localeCompare(b.name)), [sort])
  return <><select value={sort} onChange={setSort} /><ProductGrid items={visible} /></>
}
`,
        },
        {
          name: 'local pagination controls a sliced rendered list',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [page, setPage] = useState(1)
  const visible = products.slice((page - 1) * 20, page * 20)
  return <><button onClick={() => setPage(page + 1)}>Next</button><ProductList items={visible} /></>
}
`,
        },
        {
          name: 'an unrelated URL hook does not exempt a callback-only local filter',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
import { useListRoute } from '@molecule/app-routing-react-router'
export function Catalog() {
  const route = useListRoute()
  const [category, setCategory] = useState('all')
  const visible = products.filter((product) => category === 'all' || product.category === category).slice(route.offset, route.offset + route.pageSize)
  return <><select value={category} onChange={setCategory} /><ProductList items={visible} /></>
}
`,
        },
        {
          name: 'a local useState filter controls a same-file product list',
          filename: 'Home.tsx',
          code: home,
        },
        {
          name: 'a useListRoute import does not exempt an unrelated local filter',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
import { useListRoute } from '@molecule/app-routing-react-router'
export function Catalog() {
  const route = useListRoute()
  const [category, setCategory] = useState('all')
  const visible = products.filter((p) => category === 'all' || p.category === category).slice(route.offset, route.offset + route.limit)
  return <ProductList items={visible} category={category} onCategory={setCategory} />
}
`,
        },
        {
          name: 'a non-X1 local filter is passed to a list-fetching hook in the same file',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [category, setCategory] = useState('all')
  const result = useProducts({ category })
  return <ProductList items={result.data} category={category} onCategory={setCategory} />
}
`,
        },
        {
          name: 'local state passed to a list component prop warns without array operations',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [sort, setSort] = useState('featured')
  return <ProductList sort={sort} onSort={setSort} />
}
`,
        },
      ],
      invalid: [
        {
          name: 'URL-initialized state in HTTP options still leaves a rendered list off the URL',
          filename: 'Catalog.tsx',
          code: `import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
export function Catalog() {
  const [params] = useSearchParams()
  const [category, setCategory] = useState(params.get('category') ?? 'all')
  const [products, setProducts] = useState([])
  useEffect(() => {
    http.get('/api/products', { params: { category } }).then((response) => setProducts(response.data))
  }, [category])
  return <><select value={category} onChange={setCategory} /><ProductList items={products} /></>
}
`,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'a URL-initialized local filter still warns when it controls a list consumer',
          filename: 'Issues.tsx',
          code: `import { useState } from 'react'
import { useSearchParams } from 'react-router'
export function Issues() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'all')
  return <IssueList status={status} onStatus={setStatus} />
}
`,
          errors: [{ messageId: 'useListRoute' }],
        },
      ],
    })
  }
})
