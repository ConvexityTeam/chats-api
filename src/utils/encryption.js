const bcryptjs = require('bcryptjs');
exports.createHash = (value) => bcryptjs.hashSync(value, 10);

exports.compareHash = (value, hash) => bcryptjs.compareSync(value, hash);