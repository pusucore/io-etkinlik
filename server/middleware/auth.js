const jwt = require('jsonwebtoken');
const { validateInitData } = require('../services/telegramAuth');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Yetkisiz' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('invalid');
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Gecersiz token' });
  }
}

function requireTelegramUser(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData;
  const botToken = process.env.BOT_TOKEN;

  if (process.env.NODE_ENV === 'development' && req.headers['x-dev-telegram-id']) {
    req.telegramUser = {
      id: parseInt(req.headers['x-dev-telegram-id'], 10),
      username: req.headers['x-dev-username'] || 'devuser',
      first_name: req.headers['x-dev-first-name'] || 'Dev',
    };
    return next();
  }

  const user = validateInitData(initData, botToken);
  if (!user?.id) {
    return res.status(401).json({ error: 'Telegram dogrulamasi basarisiz' });
  }
  req.telegramUser = user;
  req.initData = initData;
  next();
}

module.exports = { requireAdmin, requireTelegramUser };
