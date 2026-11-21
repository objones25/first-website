import { describe, expect, it } from 'vitest'
import { MAX_MESSAGE_BYTES, MAX_PENDING_MESSAGES, PendingBuffer, messageBytes, upstreamUrl } from '../src/relay'

describe('upstreamUrl', () => {
  it('swaps the session token for the service token and keeps the path', () => {
    const url = new URL(upstreamUrl('https://proxy.test/ws/run?auth=session.jwt.value', 'service-secret'))
    expect(url.origin + url.pathname).toBe('https://microagent-production.up.railway.app/ws/run')
    expect(Object.fromEntries(url.searchParams)).toEqual({ token: 'service-secret' })
  })

  it('drops every other client query parameter, including a client-supplied token', () => {
    const url = new URL(upstreamUrl('https://proxy.test/ws/run?token=forged&debug=1&auth=x', 'service-secret'))
    expect(url.searchParams.getAll('token')).toEqual(['service-secret'])
    expect(url.searchParams.has('debug')).toBe(false)
    expect(url.searchParams.has('auth')).toBe(false)
  })
})

describe('messageBytes', () => {
  it('counts UTF-8 bytes of a string, not characters', () => {
    expect(messageBytes('abc')).toBe(3)
    expect(messageBytes('é')).toBe(2)
  })

  it('counts the bytes of a binary message', () => {
    expect(messageBytes(new ArrayBuffer(7))).toBe(7)
  })
})

describe('PendingBuffer', () => {
  it('returns messages in the order they were pushed, once', () => {
    const buffer = new PendingBuffer()
    expect(buffer.push('a')).toBe(true)
    expect(buffer.push('b')).toBe(true)
    expect(buffer.drain()).toEqual(['a', 'b'])
    expect(buffer.drain()).toEqual([])
  })

  it('refuses the message that would exceed the count limit', () => {
    const buffer = new PendingBuffer()
    for (let i = 0; i < MAX_PENDING_MESSAGES; i++) expect(buffer.push('x')).toBe(true)
    expect(buffer.push('x')).toBe(false)
    expect(buffer.drain()).toHaveLength(MAX_PENDING_MESSAGES)
  })

  it('refuses the message that would exceed the byte limit', () => {
    const buffer = new PendingBuffer()
    expect(buffer.push('x'.repeat(MAX_MESSAGE_BYTES))).toBe(true)
    expect(buffer.push('x')).toBe(false)
  })
})
