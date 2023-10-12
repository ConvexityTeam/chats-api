const path = require('path');
const multer = require('multer');

const basedir = path.join(__dirname, '..');

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes('excel')
    || file.mimetype.includes('spreadsheetml')
    || file.mimetype.includes('text/csv')
    || file.mimetype.includes('vnd.ms-excel')
  ) {
    cb(null, true);
  } else {
    cb('Please upload only excel file.', false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, `${basedir}/beneficiaries/upload/`);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-chats-beneficiaries-${file.originalname}`);
  },
});

const uploadBeneficiaries = multer({ storage, fileFilter: excelFilter });
module.exports = uploadBeneficiaries;
