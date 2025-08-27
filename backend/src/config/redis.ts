import { createClient, RedisClientType } from 'redis';
import logger from './logger';
import { config } from './env';

let redisClient: any = null;

const createRedisClient = (): any => {
  if (!config.redis.url) {
    logger.warn('Redis URL not provided, Redis functionality will be disabled');
    return null;
  }

  const client = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  client.on('error', (error) => {
    logger.error('Redis client error:', error);
  });

  client.on('end', () => {
    logger.info('Redis client connection ended');
  });

  client.on('reconnecting', () => {
    logger.info('Redis client reconnecting...');
  });

  return client;
};

// Initialize Redis client
redisClient = createRedisClient();

// Redis utility functions
export const redisUtils = {
  // Set key-value with optional expiration (in seconds)
  async set(key: string, value: string, expiresIn?: number): Promise<boolean> {
    try {
      if (!redisClient || !config.redis.url) return false;
      
      if (expiresIn) {
        await redisClient.setEx(key, expiresIn, value);
      } else {
        await redisClient.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Redis SET error:', error);
      return false;
    }
  },

  // Get value by key
  async get(key: string): Promise<string | null> {
    try {
      if (!redisClient || !config.redis.url) return null;
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis GET error:', error);
      return null;
    }
  },

  // Delete key
  async del(key: string): Promise<boolean> {
    try {
      if (!redisClient || !config.redis.url) return false;
      const result = await redisClient.del(key);
      return result > 0;
    } catch (error) {
      logger.error('Redis DEL error:', error);
      return false;
    }
  },

  // Set expiration for existing key
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (!redisClient || !config.redis.url) return false;
      const result = await redisClient.expire(key, seconds);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE error:', error);
      return false;
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      if (!redisClient || !config.redis.url) return false;
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS error:', error);
      return false;
    }
  },

  // Increment value
  async incr(key: string): Promise<number | null> {
    try {
      if (!redisClient || !config.redis.url) return null;
      return await redisClient.incr(key);
    } catch (error) {
      logger.error('Redis INCR error:', error);
      return null;
    }
  },

  // Hash operations
  async hset(key: string, field: string, value: string): Promise<boolean> {
    try {
      if (!redisClient || !config.redis.url) return false;
      await redisClient.hSet(key, field, value);
      return true;
    } catch (error) {
      logger.error('Redis HSET error:', error);
      return false;
    }
  },

  async hget(key: string, field: string): Promise<string | null> {
    try {
      if (!redisClient || !config.redis.url) return null;
      return await redisClient.hGet(key, field);
    } catch (error) {
      logger.error('Redis HGET error:', error);
      return null;
    }
  },

  async hgetall(key: string): Promise<Record<string, string> | null> {
    try {
      if (!redisClient || !config.redis.url) return null;
      return await redisClient.hGetAll(key);
    } catch (error) {
      logger.error('Redis HGETALL error:', error);
      return null;
    }
  },

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number | null> {
    try {
      if (!redisClient || !config.redis.url) return null;
      return await redisClient.lPush(key, values);
    } catch (error) {
      logger.error('Redis LPUSH error:', error);
      return null;
    }
  },

  async rpop(key: string): Promise<string | null> {
    try {
      if (!redisClient || !config.redis.url) return null;
      return await redisClient.rPop(key);
    } catch (error) {
      logger.error('Redis RPOP error:', error);
      return null;
    }
  },

  // Pattern matching
  async keys(pattern: string): Promise<string[]> {
    try {
      if (!redisClient || !config.redis.url) return [];
      return await redisClient.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS error:', error);
      return [];
    }
  },

  // Clear all keys matching pattern
  async clearPattern(pattern: string): Promise<boolean> {
    try {
      if (!redisClient || !config.redis.url) return false;
      const keys = await this.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      return true;
    } catch (error) {
      logger.error('Redis clear pattern error:', error);
      return false;
    }
  }
};

// Cache decorator for functions
export const cache = (ttl: number = 3600) => {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cacheKey = `cache:${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      // Try to get from cache
      const cached = await redisUtils.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          // If parsing fails, continue to execute original method
        }
      }
      
      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Cache the result
      if (result !== undefined && result !== null) {
        await redisUtils.set(cacheKey, JSON.stringify(result), ttl);
      }
      
      return result;
    };
    
    return descriptor;
  };
};

export { redisClient };
export default redisUtils;
