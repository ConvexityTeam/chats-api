const nodemailer = require('nodemailer');
const { mailerConfig } = require("../config");

class MailerService {
  config = {};
  transporter;
  constructor() {
    this.config = mailerConfig;
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      auth: {
        user: this.config.user,
        pass: this.config.pass
      },
      secure: true,
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false,
      }
    });
  }


  _sendMail(to, subject, html) {
    const options = {
      from: this.config.from,
      to,
      subject,
      html
    };
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if(!err) {
          resolve(data);
        } else {
          reject(err);
        }
      })
    })
  }
  verify (to,name, password, vendor_id){
    return new Promise((resolve, reject) => {
    this.transporter.verify( (err, success) => {
        if(!err) {
          console.log('Server is ready to take our messages')
          this.sendPassword(to,name, password, vendor_id)
          resolve(success);
        } else {
          console.log('Not verified', err)
          reject(err);
        }
      })
    });
  }
  verifyToken (smsToken, to, name){
    return new Promise((resolve, reject) => {
    this.transporter.verify( (err, success) => {
        if(!err) {
          console.log('Server is ready to take our messages')
          this.sendSMSToken(smsToken, to, name)
          resolve(success);
        } else {
          console.log('Not verified', err)
          reject(err);
        }
      })
    });
  }
  
  sendPassword(to, name, password, vendor_id) {
    const body = `
    <div>
      <p>Hello ${name},</p>
      <p>Your Convexity password is: ${ vendor_id ? password +" and Vendor ID is: " + vendor_id : password}</p>
      <p>CHATS - Convexity</p>
    </div>
    `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Login credentials',
      html: body
    };
    
   return new Promise((resolve, reject) => {
    this.transporter.sendMail(options, (err, data) => {
        if(!err) {
          console.log('sent')
          resolve(data);
        } else {
          reject(err);
        }
      })
    });
}
sendSMSToken(smsToken, to, name){

const body = `
    <div>
      <p>Hello ${name},</p>
      <p>Your Convexity token is: ${smsToken}</p>
      <p>CHATS - Convexity</p>
    </div>
    `;
    const options = {
      from: this.config.from,
      to,
      subject: 'SMS Token',
      html: body
    };
    
   return new Promise((resolve, reject) => {
    this.transporter.sendMail(options, (err, data) => {
        if(!err) {
          console.log('sent')
          resolve(data);
        } else {
          reject(err);
        }
      })
    });
}
}

module.exports = new MailerService();