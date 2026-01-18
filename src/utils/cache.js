const cache = new Map();

/**
 * Get cached value if it exists and hasn't expired
 * @param {string} key
 * @returns {any|null}
 */
export function getCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (entry.expiry && entry.expiry < now) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Set a value in the cache with optional TTL
 * @param {string} key
 * @param {any} value
 * @param {number} ttl - time to live in ms
 */
export function setCache(key, value, ttl = 1000 * 60 * 60) { // default 1 hour
  cache.set(key, {
    value,
    expiry: Date.now() + ttl
  })
}
