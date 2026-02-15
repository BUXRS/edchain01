/**
 * Utility to serialize objects containing BigInt values for JSON responses
 * JSON.stringify cannot handle BigInt natively
 */

export function serializeBigInt<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'bigint') {
    return Number(obj) as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => serializeBigInt(item)) as unknown as T
  }

  if (typeof obj === 'object') {
    const serialized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'bigint') {
        serialized[key] = Number(value)
      } else if (Array.isArray(value)) {
        serialized[key] = value.map(item => serializeBigInt(item))
      } else if (value !== null && typeof value === 'object') {
        serialized[key] = serializeBigInt(value)
      } else {
        serialized[key] = value
      }
    }
    return serialized as T
  }

  return obj
}
