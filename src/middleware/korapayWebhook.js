const crypto = require('crypto');
const {koraPayConfig} = require('../config');

const koraPayWebhookGuard = (req, res, next) => {
  const data = req.body;
  const signature = req.headers['x-korapay-signature'];
  const hash = crypto
    .createHmac('sha256', koraPayConfig.secret_key)
    .update(JSON.stringify(data))
    .digest('hex');
  if (hash === signature) {
    next();
    return;
  }
  res.sendStatus(400);
};

exports.koraPayWebhookGuard = koraPayWebhookGuard;
