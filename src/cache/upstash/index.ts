import type { SetCommandOptions } from '@upstash/redis';
import { Redis } from '@upstash/redis';
import type { Cache, CacheItem, CacheStore, GetCacheInfo, PutCacheInfo } from '../types';
import { cacheItemToType, calculateExpiration, decodeCacheItem, encodeCacheItem } from '../utils';

export class UpStashRedis implements Cache {
    private redis: Redis;

    constructor(redis: Redis) {
        this.redis = redis;
    }

    static create(url: string, token: string): UpStashRedis {
        const redis = new Redis({
            url,
            token,
        });
        return new UpStashRedis(redis);
    }

    async get(key: string, info?: GetCacheInfo): Promise<CacheItem | null> {
        const item = await this.redis.get<CacheStore>(key);
        if (!item) {
            return null;
        }
        return decodeCacheItem(item.value, info?.type || item.info?.type);
    }

    async put(key: string, value: CacheItem, info?: PutCacheInfo): Promise<boolean | void> {
        const cacheStore: CacheStore = {
            info: {
                type: cacheItemToType(value),
                expiration: calculateExpiration(info),
            },
            value: await encodeCacheItem(value),
        };
        const options: SetCommandOptions = {};
        if (cacheStore.info.expiration) {
            options.exat = cacheStore.info.expiration as never;
        }

        if (info?.condition === 'NX') {
            options.nx = true as never;
        } else if (info?.condition === 'XX') {
            options.xx = true as never;
        }
        return this.redis.set<CacheStore>(key, cacheStore, options).then(res => ['NX', 'XX'].includes(info?.condition || '') ? res === 'OK' : undefined);
    }

    async list(prefix?: string, limit?: number): Promise<string[]> {
        const keys = await this.redis.keys(`${prefix || ''}*`);
        if (limit === null || limit === undefined) {
            return keys;
        } else {
            return keys.slice(0, limit);
        }
    }

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}
