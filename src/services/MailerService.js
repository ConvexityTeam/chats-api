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
      secure: true
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

  sendPassword(to, name, password) {
    const body = `
    <div>
      <p>Hello ${name},</p>
      <p>Your Convexity password is: ${password}</p>
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
          resolve(data);
        } else {
          reject(err);
        }
      })
    })
}
}

module.exports = new MailerService();