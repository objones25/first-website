import { describe, expect, it, vi } from 'vitest'
import worker, { CACHE_TTL_MS, STALE_TTL_S, type Env } from '../src/index'
import { SITE_ORIGIN, recordUpstream } from '../../shared/test/helpers'

class FakeKV {
  readonly store = new Map<string, string>()
  readonly puts: { key: string; options: unknown }[] = []
  async get(key: string, _type: 'json'): Promise<unknown> {
    const value = this.store.get(key)
    return value === undefined ? null : JSON.parse(value)
  }
  async put(key: string, value: string, options?: unknown): Promise<void> {
    this.puts.push({ key, options })
    this.store.set(key, value)
  }
}

const stats = { commitCount: 42, lastCommitDate: '2026-11-20T00:00:00Z', stars: 3, primaryLanguage: 'Python', openIssues: 1 }

const graphql = () =>
  Response.json({
    data: {
      repository: {
        defaultBranchRef: { target: { history: { totalCount: 42 }, committedDate: '2026-11-20T00:00:00Z' } },
        stargazerCount: 3,
        primaryLanguage: { name: 'Python' },
        issues: { totalCount: 1 },
      },
    },
  })

function setup(respond: () => Response | Promise<Response> = graphql) {
  const kv = new FakeKV()
  const calls = recordUpstream(vi.stubGlobal, respond)
  const env = { GITHUB_STATS_CACHE: kv, GITHUB_TOKEN: 'gh-secret' } as unknown as Env
  const get = (query: string, init: { origin?: string | null; method?: string } = {}) => {
    const headers = new Headers()
    if (init.origin !== null) headers.set('Origin', init.origin ?? SITE_ORIGIN)
    return worker.fetch(new Request(`https://stats.test/repo-stats${query}`, { method: init.method ?? 'GET', headers }), env)
  }
  return { kv, calls, get }
}

const REPO = '?owner=objones25&repo=my-skills'

describe('github-stats-proxy', () => {
  it('fetches, returns and caches stats with an expiry', async () => {
    const { kv, calls, get } = setup()
    const res = await get(REPO)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(stats)
    expect(calls).toHaveLength(1)
    expect(calls[0].headers.get('Authorization')).toBe('Bearer gh-secret')
    expect(kv.puts).toEqual([{ key: 'objones25/my-skills', options: { expirationTtl: STALE_TTL_S } }])
  })

  it('serves a fresh cache entry without calling GitHub', async () => {
    const { kv, calls, get } = setup()
    kv.store.set('objones25/my-skills', JSON.stringify({ payload: stats, fetchedAt: Date.now() }))
    expect(await (await get(REPO)).json()).toEqual(stats)
    expect(calls).toHaveLength(0)
  })

  it('serves a stale entry when GitHub fails', async () => {
    const { kv, get } = setup(() => new Response('boom', { status: 500 }))
    const stale = { ...stats, stars: 2 }
    kv.store.set('objones25/my-skills', JSON.stringify({ payload: stale, fetchedAt: Date.now() - CACHE_TTL_MS - 1 }))
    const res = await get(REPO)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(stale)
  })

  it('answers a generic 502 when GitHub fails and nothing is cached', async () => {
    const { get } = setup(() => Response.json({ errors: [{ message: 'Bad credentials for token ghp_abc' }] }))
    const res = await get(REPO)
    expect(res.status).toBe(502)
    expect(await res.text()).toBe('{"error":"Could not load repository stats"}')
  })

  it('keeps the stale entry long enough to outlive the refresh window', () => {
    expect(STALE_TTL_S * 1000).toBeGreaterThan(CACHE_TTL_MS * 24)
  })

  it.each([
    ['missing params', '', {}, 400],
    ['missing params and no origin', '', { origin: null }, 400],
    ['a disallowed origin', REPO, { origin: 'https://evil.test' }, 403],
    ['no origin', REPO, { origin: null }, 403],
    ['another owner', '?owner=torvalds&repo=linux', {}, 400],
    ['a repo name with a slash', '?owner=objones25&repo=a/b', {}, 400],
    ['a POST', REPO, { method: 'POST' }, 405],
  ] as [string, string, { origin?: string | null; method?: string }, number][])(
    'rejects %s without calling GitHub',
    async (_name, query, init, status) => {
      const { calls, get } = setup()
      expect((await get(query, init)).status).toBe(status)
      expect(calls).toHaveLength(0)
    },
  )

  it('answers a preflight', async () => {
    const { get } = setup()
    const res = await get(REPO, { method: 'OPTIONS', origin: 'http://localhost:3000' })
    expect(res.status).toBe(204)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })
})
