import type { RedisOptions } from 'ioredis';
import { Redis } from 'ioredis';
import type { Cache, CacheItem, CacheStore, GetCacheInfo, PutCacheInfo } from '../types';
import { cacheItemToType, calculateExpiration, decodeCacheItem, encodeCacheItem } from '../utils';

export class RedisCache implements Cache {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    static create(options: RedisOptions): RedisCache {
        return new RedisCache(new Redis(options));
    }

    static createFromUri(uri: string): RedisCache {
        return new RedisCache(new Redis(uri));
    }

    async get(key: string, info?: GetCacheInfo): Promise<CacheItem | null> {
        const result = await this.redis.get(key);
        if (!result) {
            return null;
        }
        const item: CacheStore = JSON.parse(result);
        if (!item) {
            return null;
        }
        return decodeCacheItem(item.value, info?.type || item.info?.type);
    }

    async put(key: string, value: CacheItem, info?: PutCacheInfo): Promise<boolean> {
        const cacheStore: CacheStore = {
            info: {
                type: cacheItemToType(value),
                expiration: calculateExpiration(info),
            },
            value: await encodeCacheItem(value),
        };
        const setArgs: (string | number)[] = [key, JSON.stringify(cacheStore)];

        if (cacheStore.info.expiration) {
            const milliseconds = (cacheStore.info.expiration - Date.now() / 1000) * 1000;
            setArgs.push('PX', milliseconds);
        }

        if (info?.condition && ['NX', 'XX'].includes(info.condition)) {
            setArgs.push(info.condition);
        }
        return this.redis.set(
            ...setArgs as Parameters<Redis['set']>,
        ).then(res => ['NX', 'XX'].includes(info?.condition || '') ? res === 'OK' : undefined);
    }

    async list(prefix?: string, limit?: number): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            this.redis.keys(`${prefix || ''}*`, (err, keys) => {
                if (err) {
                    reject(err);
                } else {
                    if (limit === null || limit === undefined) {
                        resolve(keys);
                    } else {
                        resolve(keys.slice(0, limit));
                    }
                }
            });
        });
    }

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }

    async close() {
        await this.redis.quit();
    }
}
