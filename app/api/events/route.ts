/**
 * Server-Sent Events (SSE) API for real-time updates
 * 
 * Clients can subscribe to:
 * - Transaction updates (pending, confirmed, failed)
 * - Sync notifications
 * - University-specific events
 */

import { NextRequest } from 'next/server'

// Store active connections
const connections = new Map<string, {
  controller: ReadableStreamDefaultController
  channels: Set<string>
}>()

// Message queue for broadcasting
const messageQueue: Array<{
  channel: string
  data: unknown
  timestamp: Date
}> = []

// Clean up old messages (older than 5 minutes)
setInterval(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  while (messageQueue.length > 0 && messageQueue[0].timestamp < fiveMinutesAgo) {
    messageQueue.shift()
  }
}, 60000)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const channels = searchParams.get('channels')?.split(',') || ['global']
  const connectionId = `${Date.now()}-${Math.random().toString(36).substring(7)}`

  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      connections.set(connectionId, {
        controller,
        channels: new Set(channels)
      })

      // Send initial connection message
      const encoder = new TextEncoder()
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'connected',
        connectionId,
        channels,
        timestamp: new Date().toISOString()
      })}\n\n`))

      // Send any recent messages from subscribed channels
      const recentMessages = messageQueue.filter(
        msg => channels.includes(msg.channel) || msg.channel === 'global'
      ).slice(-10)

      for (const msg of recentMessages) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg.data)}\n\n`))
      }

      // Keep-alive ping every 30 seconds
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`))
        } catch {
          clearInterval(pingInterval)
        }
      }, 30000)

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        connections.delete(connectionId)
      })
    },
    cancel() {
      connections.delete(connectionId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// POST endpoint to broadcast messages
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { channel = 'global', type, data } = body

    const message = {
      type,
      channel,
      data,
      timestamp: new Date().toISOString()
    }

    // Add to message queue
    messageQueue.push({
      channel,
      data: message,
      timestamp: new Date()
    })

    // Broadcast to all relevant connections
    const encoder = new TextEncoder()
    const encodedMessage = encoder.encode(`data: ${JSON.stringify(message)}\n\n`)

    let sentCount = 0
    for (const [, connection] of connections) {
      if (connection.channels.has(channel) || connection.channels.has('global') || channel === 'global') {
        try {
          connection.controller.enqueue(encodedMessage)
          sentCount++
        } catch {
          // Connection closed, will be cleaned up
        }
      }
    }

    return Response.json({
      success: true,
      sentTo: sentCount,
      totalConnections: connections.size
    })
  } catch (error) {
    return Response.json(
      { error: 'Failed to broadcast message', details: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to broadcast from server-side code
export function broadcastEvent(channel: string, type: string, data: unknown): void {
  const message = {
    type,
    channel,
    data,
    timestamp: new Date().toISOString()
  }

  messageQueue.push({
    channel,
    data: message,
    timestamp: new Date()
  })

  const encoder = new TextEncoder()
  const encodedMessage = encoder.encode(`data: ${JSON.stringify(message)}\n\n`)

  for (const [, connection] of connections) {
    if (connection.channels.has(channel) || connection.channels.has('global') || channel === 'global') {
      try {
        connection.controller.enqueue(encodedMessage)
      } catch {
        // Connection closed
      }
    }
  }
}
