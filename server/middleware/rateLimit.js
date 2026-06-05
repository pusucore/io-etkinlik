const buckets = new Map();

function rateLimit({ windowMs = 60000, max = 80 } = {}) {
  return (req, res, next) => {
    const key =
      req.headers['x-telegram-init-data']?.slice(0, 32) ||
      req.ip ||
      req.socket.remoteAddress ||
      'anon';
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: 'Çok fazla istek. Lütfen bekleyin.' });
    }
    next();
  };
}

module.exports = { rateLimit };
