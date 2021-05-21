var CryptoJS = require("crypto-js");
require("dotenv").config();

class Utils {
  constructor() {
    this.statusCode = null;
    this.type = null;
    this.data = null;
    this.message = null;
  }

  setSuccess(statusCode, message, data = "") {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.type = "success";
  }

  setError(statusCode, message) {
    this.statusCode = statusCode;
    this.message = message;
    this.type = "error";
  }

  send(res) {
    const result = {
      code: this.statusCode,
      status: this.type,
      message: this.message,
      data: this.data,
    };
    if (this.type === "success") {
      return res.status(this.statusCode).json(this.encryptResponse(result));
    }
    return res.status(this.statusCode).json(
      this.encryptResponse({
        code: this.statusCode,
        status: this.type,
        message: this.message,
      })
    );
  }

  generatePassword(passLength = 8) {
    var pass = "";
    var str =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";
    for (let i = 1; i <= passLength; i++) {
      var char = Math.floor(Math.random() * str.length + 1);
      pass += str.charAt(char);
    }
    return pass;
  }

  generateOTP(otpLength = 6) {
    const digits = "0123456789";
    let otp = "";
    for (let i = 1; i <= otpLength; i++) {
      let index = Math.floor(Math.random() * digits.length);
      otp = otp + digits[index];
    }
    return otp;
  }

  encryptResponse(data) {
    return CryptoJS.AES.encrypt(
      JSON.stringify(data),
      process.env.PRIVATE_KEY
    ).toString();
  }

  decryptRequest(payload) {
    let bytes = CryptoJS.AES.decrypt(payload, process.env.PRIVATE_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  }
}

module.exports = new Utils();
