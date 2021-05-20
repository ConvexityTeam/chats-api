var nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();
class Mailer {
    constructor() {

    }
    sendMail(to, subject, body, html = true) {
        return new Promise((resolve, reject) => {
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_EMAIL , //this should be fetched from the .env file
                    pass: process.env.GMAIL_PASSWORD //this should be fetched from the .env file
                }
            });
            var mailOptions = {
                from: process.env.GMAIL_EMAIL,//this should be fetched from the .env file
                to: to,
                subject: subject,
                html: body
            };
            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                    reject(error);
                } else {
                    console.log('Email sent: ' + info.response);
                    resolve(info.response);
                }
            });
        });
    }
    mailPassword(recipientsEmail, recipientsName, newPassword) {
        const mail = `<div>Hello ${recipientsName},<br/>
            <p>You Requested For Password Reset on our platform.
             If You did not request for password request, quickly login to our portal and reset your password on the profile page.</p>
             <p>But if you are the one who made a request for password update, 
             here is your new password:<br/> ${newPassword}</p>
            </div>`;
        try {
            this.sendMail(recipientsEmail, "Password Reset", mail);
        } catch (error) {
            console.log(error);
        }
    }
    confirmSignUp(recipientsEmail, recipientsName, uniqueCode) { }
}

module.exports = new Mailer();