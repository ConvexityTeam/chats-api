const nodemailer = require('nodemailer');
const {mailerConfig} = require('../config');

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
        rejectUnauthorized: false
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
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  verify(to, name, password, vendor_id) {
    return new Promise((resolve, reject) => {
      this.transporter.verify((err, success) => {
        if (!err) {
          console.log('Server is ready to take our messages');
          this.sendPassword(to, name, password, vendor_id);
          resolve(success);
        } else {
          console.log('Not verified', err);
          reject(err);
        }
      });
    });
  }
  verifyToken(smsToken, to, name) {
    return new Promise((resolve, reject) => {
      this.transporter.verify((err, success) => {
        if (!err) {
          console.log('Server is ready to take our messages');
          this.sendSMSToken(smsToken, to, name);
          resolve(success);
        } else {
          console.log('Not verified', err);
          reject(err);
        }
      });
    });
  }

  sendPassword(to, name, password, vendor_id) {
    const body = `
    <div>
      <p>Hi, ${name}\nYour CHATS account ${
      vendor_id
        ? 'ID is: ' + vendor_id + ', password is: ' + password
        : 'password is: ' + password
    }</p>
      <p>Best,\nCHATS - Convexity</p>
    </div>
    `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Account Credentials',
      html: body
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  sendSMSToken(smsToken, to, name) {
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
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendOTP(otp, ref, to, name) {
    const body = `
    <div>
      <p>Hello ${name},</p>
      <p>Your Convexity reset password OTP is: ${otp} and ref is: ${ref}</p>
      <p>CHATS - Convexity</p>
    </div>
    `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Reset password',
      html: body
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
  sendInvite(to, token, campaign, ngo, exist, message, link) {
    const body = `
    <div>
      <p>Hi ${to.match(/^([^@]*)@/)[1]} !</p>
      <p>We’ve given you access to campaign titled: ${
        campaign.title
      } so that you can manage your journey with us and get to know all the possibilities offered by CHATS.</p>
      <p>${
        exist
          ? `If you want to login to confirm access, please click on the following link: ${link}&token=${token}&first_timer=true&is_public=${campaign.is_public}`
          : `If you want to create an account, please click on the following link: ${link}&token=${token}&first_timer=false&is_public=${campaign.is_public}`
      }</p>
      <p>${message}</p>
      <p>Enjoy!</p>
      <p>Best,</p>
      <p>The ${ngo} team</p>
      </div>
    `;
    const options = {
      from: this.config.from,
      to,
      subject: 'Donor Invitation',
      html: body
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendAdminSmsCreditMail(to, amount) {
    const body = `
    <div>
      <p>Hello Admin,</p>
      <p>This is to inform you that your SMS service balance is running low. Current balance is ${amount}. Please recharge your account.</p>
      <p>CHATS - Convexity</p>
    </div>
    `;
    const options = {
      from: this.config.from,
      to: [to, 'charles@withconvexity.com'],
      subject: 'Recharge Your Wallet Balance',
      html: body
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }

  sendAdminNinCreditMail(to, amount) {
    const body = `
    <div>
      <p>Hello Admin,</p>
      <p>This is to inform you that your NIN service balance is running low. Current balance is ${amount}. Please recharge your account</p>
      <p>CHATS - Convexity</p>
    </div>
    `;
    const options = {
      from: this.config.from,
      to: [to, 'charles@withconvexity.com'],
      subject: 'Recharge Your Wallet Balance',
      html: body
    };

    return new Promise((resolve, reject) => {
      this.transporter.sendMail(options, (err, data) => {
        if (!err) {
          console.log('sent');
          resolve(data);
        } else {
          reject(err);
        }
      });
    });
  }
}

module.exports = new MailerService();
