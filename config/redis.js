const Redis = require('ioredis')
require('dotenv').config()

// Redis client configuration
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false
})

redis.on('connect', () => {
  console.log('✓ Connected to Redis cache')
})

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err)
})

redis.on('ready', () => {
  console.log('✓ Redis is ready')
})

// Cache helper functions
const cacheHelpers = {
  // Get cached data
  async get(key) {
    try {
      const data = await redis.get(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('Redis get error:', error)
      return null
    }
  },

  // Set cache with expiration (default 1 hour)
  async set(key, value, expirationInSeconds = 3600) {
    try {
      await redis.setex(key, expirationInSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.error('Redis set error:', error)
      return false
    }
  },

  // Delete cache
  async del(key) {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.error('Redis del error:', error)
      return false
    }
  },

  // Check if key exists
  async exists(key) {
    try {
      const result = await redis.exists(key)
      return result === 1
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  },

  // Get cache with pattern
  async getPattern(pattern) {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length === 0) return []
      
      const values = await redis.mget(keys)
      return values.map((val, idx) => ({
        key: keys[idx],
        value: val ? JSON.parse(val) : null
      }))
    } catch (error) {
      console.error('Redis pattern get error:', error)
      return []
    }
  },

  // Clear cache by pattern
  async clearPattern(pattern) {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      return keys.length
    } catch (error) {
      console.error('Redis pattern clear error:', error)
      return 0
    }
  },

  // Increment counter
  async increment(key, expirationInSeconds = 3600) {
    try {
      const value = await redis.incr(key)
      if (value === 1) {
        await redis.expire(key, expirationInSeconds)
      }
      return value
    } catch (error) {
      console.error('Redis increment error:', error)
      return 0
    }
  }
}

module.exports = {
  redis,
  ...cacheHelpers
}


