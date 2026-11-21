import { describe, expect, it } from 'vitest'
import { corsHeaders, isAllowedOrigin } from '../src/origin'

describe('isAllowedOrigin', () => {
  it.each([
    'https://owenbeckettjones.com',
    'http://localhost',
    'http://localhost:3000',
    'https://localhost:5173',
  ])('accepts %s', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true)
  })

  it.each([
    '',
    'null',
    'http://owenbeckettjones.com',
    'https://owenbeckettjones.com.evil.test',
    'https://evil.test/https://owenbeckettjones.com',
    'https://www.owenbeckettjones.com',
    'http://localhost.evil.test',
    'http://localhost:3000.evil.test',
    'http://localhost:3000/',
    'http://127.0.0.1:3000',
  ])('rejects %j', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false)
  })
})

describe('corsHeaders', () => {
  it('echoes an allowed origin and lists the methods and headers given', () => {
    const headers = corsHeaders('http://localhost:3000', { methods: ['GET'], headers: ['Authorization'] })
    expect(headers).toEqual({
      'Access-Control-Allow-Origin': 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    })
  })

  it('never echoes a disallowed origin', () => {
    const headers = corsHeaders('https://evil.test', { methods: ['GET'], headers: [] })
    expect(headers['Access-Control-Allow-Origin']).toBe('https://owenbeckettjones.com')
  })
})
