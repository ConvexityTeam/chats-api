const multer = require('multer');
const __basedir = __dirname + '/..';

console.log("directory in middleware", __basedir);

const excelFilter = (req, file, cb) => {
  if (
    file.mimetype.includes('excel') ||
    file.mimetype.includes('spreadsheetml') ||
    file.mimetype.includes('text/csv') ||
    file.mimetype.includes('vnd.ms-excel')
  ) {
    cb(null, true);
  } else {
    cb('Please upload only excel file.', false);
  }
};

var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("path in middleware", __basedir + '/beneficiaries/upload/');
    cb(null, __basedir + '/beneficiaries/upload/');
  },
  filename: (req, file, cb) => { 
    console.log(file.originalname);
    cb(null, `${Date.now()}-chats-beneficiaries-${file.originalname}`);
  }
});

var uploadBeneficiaries = multer({storage: storage, fileFilter: excelFilter});
module.exports = uploadBeneficiaries;
