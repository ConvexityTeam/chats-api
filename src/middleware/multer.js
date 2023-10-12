const multer = require('multer');
const { maxFileUploadSize } = require('../constants/file.constant');
// const storage = multer.memoryStorage();

module.exports = multer({
  dest: 'temp/',
  limits: {
    fieldSize: maxFileUploadSize,
  },
});
