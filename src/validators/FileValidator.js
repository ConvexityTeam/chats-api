const { check } = require("express-validator");
const { maxFileUploadSize } = require("../constants/file.constant");
const multer = require("../middleware/multer");
const BaseValidator = require("./BaseValidator");

class FileValidator extends BaseValidator {
  static checkLogoFile() {
    return [
      multer.single('logo'),
      check('logo')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(req.file.size > maxFileUploadSize) {
          reject('Maximum upload size [10 MB] exceeded.');
        }
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
  static checkTaskProgressEvidenceFile(){
    return [
    multer.single('uploads'),
      check('uploads')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();
        console.log(req.file, 'file')
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(req.file.size > maxFileUploadSize) {
          reject('Maximum upload size [10 MB] exceeded.');
        }
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
  static checkTaskProgressFile(){
    return [
    multer.single('imageUrl'),
      check('imageUrl')
      .custom((value, {req}) => new Promise((resolve, reject) => {
        const ext = req.file.mimetype.split('/').pop();

       
        const allowedExt = ['png', 'jpg', 'jpeg'];
        if(req.file.size > maxFileUploadSize) {
          reject('Maximum upload size [10 MB] exceeded.');
        }
        if(!allowedExt.includes(ext)) {
          reject(`Allowed file type are ${allowedExt.join(',')}.`)
        }
        resolve(true);
      })),
      this.validate
    ]
  }
}

module.exports = FileValidator;