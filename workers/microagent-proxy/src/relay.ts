const UPSTREAM = 'https://microagent-production.up.railway.app'

export type WsMessage = string | ArrayBuffer

// The demo sends one small JSON message (a prompt of at most 1000 characters).
// These bounds are far above that and far below anything that could hurt.
export const MAX_MESSAGE_BYTES = 64 * 1024
export const MAX_PENDING_MESSAGES = 8
const MAX_PENDING_BYTES = MAX_MESSAGE_BYTES

/** WebSocket close code 1009: message too big. */
export const CLOSE_TOO_BIG = 1009

const encoder = new TextEncoder()

export function messageBytes(message: WsMessage): number {
  return typeof message === 'string' ? encoder.encode(message).byteLength : message.byteLength
}

/**
 * The upstream URL for a client connection. Only the path is carried over:
 * the client's `auth` session token and any other query parameter are dropped,
 * and the service token is added. The upstream reads its token from the query
 * string, so it does appear in the upstream's access logs; changing that needs
 * a change to the microagent service itself.
 */
export function upstreamUrl(requestUrl: string, serviceToken: string): string {
  const url = new URL(UPSTREAM)
  url.pathname = new URL(requestUrl).pathname
  url.searchParams.set('token', serviceToken)
  return url.toString()
}

/** Messages the client sent before the upstream socket opened, bounded by count and bytes. */
export class PendingBuffer {
  private messages: WsMessage[] = []
  private bytes = 0

  /** Returns false, and stores nothing, if the message would exceed a limit. */
  push(message: WsMessage): boolean {
    const size = messageBytes(message)
    if (this.messages.length >= MAX_PENDING_MESSAGES || this.bytes + size > MAX_PENDING_BYTES) return false
    this.messages.push(message)
    this.bytes += size
    return true
  }

  drain(): WsMessage[] {
    const drained = this.messages
    this.messages = []
    this.bytes = 0
    return drained
  }
}
