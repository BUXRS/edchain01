'use client';

/**
 * React hook for subscribing to Server-Sent Events
 * 
 * Usage:
 * const { isConnected, lastEvent, subscribe } = useEventStream(['transactions', 'university:1'])
 */

import { useEffect, useState, useCallback, useRef } from 'react'

export interface SSEEvent {
  type: string
  channel: string
  data: unknown
  timestamp: string
}

interface UseEventStreamOptions {
  channels?: string[]
  onEvent?: (event: SSEEvent) => void
  onConnect?: () => void
  onDisconnect?: () => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useEventStream(options: UseEventStreamOptions = {}) {
  const {
    channels = ['global'],
    onEvent,
    onConnect,
    onDisconnect,
    autoReconnect = true,
    reconnectInterval = 5000
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const [events, setEvents] = useState<SSEEvent[]>([])
  const [connectionId, setConnectionId] = useState<string | null>(null)
  
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback(() => {
    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const channelsParam = channels.join(',')
    const eventSource = new EventSource(`/api/events?channels=${encodeURIComponent(channelsParam)}`)
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      setIsConnected(true)
      onConnect?.()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as SSEEvent
        
        if (data.type === 'connected') {
          setConnectionId((data as unknown as { connectionId: string }).connectionId)
          return
        }

        setLastEvent(data)
        setEvents(prev => [...prev.slice(-99), data]) // Keep last 100 events
        onEvent?.(data)
      } catch {
        // Ignore parse errors (might be ping)
      }
    }

    eventSource.onerror = () => {
      setIsConnected(false)
      eventSource.close()
      onDisconnect?.()

      // Auto reconnect
      if (autoReconnect) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, reconnectInterval)
      }
    }
  }, [channels, onEvent, onConnect, onDisconnect, autoReconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setIsConnected(false)
    setConnectionId(null)
  }, [])

  const subscribe = useCallback((newChannels: string[]) => {
    disconnect()
    // Reconnect with new channels by updating state and reconnecting
    setTimeout(() => connect(), 100)
  }, [connect, disconnect])

  const clearEvents = useCallback(() => {
    setEvents([])
    setLastEvent(null)
  }, [])

  // Connect on mount
  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    isConnected,
    connectionId,
    lastEvent,
    events,
    subscribe,
    disconnect,
    clearEvents
  }
}

/**
 * Helper hook for transaction-specific events
 */
export function useTransactionEvents(walletAddress?: string) {
  const [pendingTransactions, setPendingTransactions] = useState<string[]>([])
  const [confirmedTransactions, setConfirmedTransactions] = useState<string[]>([])
  const [failedTransactions, setFailedTransactions] = useState<string[]>([])

  const channels = walletAddress 
    ? ['global', `transactions:${walletAddress.toLowerCase()}`]
    : ['global']

  const handleEvent = useCallback((event: SSEEvent) => {
    if (event.type === 'transaction_pending') {
      const txHash = (event.data as { txHash?: string })?.txHash
      if (txHash) {
        setPendingTransactions(prev => [...prev, txHash])
      }
    } else if (event.type === 'transaction_confirmed') {
      const txHash = (event.data as { txHash?: string })?.txHash
      if (txHash) {
        setPendingTransactions(prev => prev.filter(h => h !== txHash))
        setConfirmedTransactions(prev => [...prev, txHash])
      }
    } else if (event.type === 'transaction_failed') {
      const txHash = (event.data as { txHash?: string })?.txHash
      if (txHash) {
        setPendingTransactions(prev => prev.filter(h => h !== txHash))
        setFailedTransactions(prev => [...prev, txHash])
      }
    }
  }, [])

  const stream = useEventStream({
    channels,
    onEvent: handleEvent
  })

  return {
    ...stream,
    pendingTransactions,
    confirmedTransactions,
    failedTransactions,
    hasPending: pendingTransactions.length > 0
  }
}

/**
 * Helper hook for university-specific events
 */
export function useUniversityEvents(universityId?: number) {
  const channels = universityId 
    ? ['global', `university:${universityId}`]
    : ['global']

  return useEventStream({ channels })
}
