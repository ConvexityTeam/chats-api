const util = require('../libs/Utils');

const fs = require('fs');
const {Op} = require('sequelize');
const {
  compareHash,
  createHash,
  SanitizeObject,
  HttpStatusCode,
  AclRoles,
  generateRandom,
  GenearteVendorId
} = require('../utils');
const db = require('../models');
const formidable = require('formidable');
var bcrypt = require('bcryptjs');
const Validator = require('validatorjs');
const sequelize = require('sequelize');
const uploadFile = require('./AmazonController');
const {
  BeneficiaryService,
  UserService,
  PaystackService,
  QueueService,
  WalletService,
  SmsService,
  MailerService,
  CampaignService
} = require('../services');
const {Response, Logger} = require('../libs');

const {Message} = require('@droidsolutions-oss/amqp-ts');
var amqp_1 = require('./../libs/RabbitMQ/Connection');
const codeGenerator = require('./QrCodeController');
const ZohoService = require('../services/ZohoService');
const sanitizeObject = require('../utils/sanitizeObject');
const AwsUploadService = require('../services/AwsUploadService');
const {data} = require('../libs/Response');

var transferToQueue = amqp_1['default'].declareQueue('transferTo', {
  durable: true
});

var transferFromQueue = amqp_1['default'].declareQueue('transferFrom', {
  durable: true
});

const environ = process.env.NODE_ENV == 'development' ? 'd' : 'p';

class UsersController {
  static async getAllUsers(req, res) {
    try {
      const allUsers = await UserService.getAllUsers();
      if (allUsers.length > 0) {
        Response.setSuccess(200, 'Users retrieved', allUsers);
      } else {
        Response.setSuccess(200, 'No User found');
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async addUser(req, res) {
    if (!req.body.first_name || !req.body.last_name || !req.body.email) {
      Response.setError(400, 'Please provide complete details');
      return Response.send(res);
    }
    try {
      const createdUser = await UserService.addUser(newUser);
      Response.setSuccess(201, 'User Added!', createdUser);
      return Response.send(res);
    } catch (error) {
      Response.setError(500, error.message);
      return Response.send(res);
    }
  }

  static async createVendor(req, res) {
    const {first_name, last_name, email, phone, address, location, store_name} =
      req.body;

    try {
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        email: 'required|email',
        phone: ['required', 'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        store_name: 'required|string',
        address: 'required|string',
        location: 'required|string'
      };

      const validation = new Validator(req.body, rules);

      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const user = await UserService.findByEmail(email);
      if (user) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken'
        );
        return Response.send(res);
      }
      const rawPassword = generateRandom(8);
      const password = createHash(rawPassword);
      const vendor_id = GenearteVendorId();
      const createdVendor = await UserService.createUser({
        RoleId: AclRoles.Vendor,
        first_name,
        last_name,
        email,
        phone,
        password
      });
      await QueueService.createWallet(createdVendor.id, 'user');
      const store = await db.Market.create({
        store_name,
        address,
        location,
        UserId: createdVendor.id
      });

      await MailerService.verify(
        email,
        first_name + ' ' + last_name,
        rawPassword,
        vendor_id
      );
      await QueueService.createWallet(createdVendor.id, 'user');

      await SmsService.sendOtp(
        phone,
        `Hi, ${first_name}  ${last_name} your CHATS account ID is: ${vendor_id} , password is: ${rawPassword}`
      );
      createdVendor.dataValues.password = null;
      createdVendor.dataValues.store = store;
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Vendor Account Created.',
        createdVendor
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Contact Support' + error
      );
      return Response.send(res);
    }
  }
  static async groupAccount(req, res) {
    const {group, representative, member, campaignId} = req.body;

    try {
      const rules = {
        campaignId: 'required|integer',
        'representative.first_name': 'required|alpha',
        'representative.last_name': 'required|alpha',
        'representative.gender': 'required|in:male,female',
        'representative.email': 'required|email',
        'representative.phone': [
          'required',
          'regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'
        ],
        'representative.address': 'string',
        'representative.location': 'string',
        'representative.password': 'required',
        'representative.dob': 'required|date',
        'representative.nfc': 'string',
        'member.*.full_name': 'required|string',
        'member.*.dob': 'required|date',
        'member.*.full_name': 'required|string',
        'group.group_name': 'required|string',
        'group.group_category': 'required|string'
      };
      const validation = new Validator(req.body, rules);
      if (validation.fails()) {
        Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        return Response.send(res);
      }
      const data = member;
      const find = await UserService.findByEmail(representative.email);
      if (find) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Email already taken'
        );
        return Response.send(res);
      }
      const result = await db.sequelize.transaction(async t => {
        const campaignExist = await CampaignService.getCampaignById(campaignId);
        if (!campaignExist) {
          Response.setError(404, 'Campaign not found');
          return Response.send(res);
        }
        representative.RoleId = AclRoles.Beneficiary;
        representative.password = createHash('0000');
        const parent = await db.User.create(representative, {transaction: t});
        await db.Beneficiary.create(
          {
            UserId: parent.id,
            CampaignId: campaignExist.id,
            approved: true,
            source: 'field app'
          },
          {transaction: t}
        );

        await QueueService.createWallet(parent.id, 'user', campaignId);
        group.representative_id = parent.id;
        const grouping = await db.Group.create(group, {transaction: t});

        for (let mem of data) {
          mem.group_id = grouping.id;
          //await QueueService.createWallet(mem.id, 'user');
        }
        const members = await db.Member.bulkCreate(data, {transaction: t});

        parent.dataValues.group = grouping;
        parent.dataValues.members = members;
        return parent;
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Group Created',
        result
      );
      return Response.send(res);
      // });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal Server Error. Contact Support' + error
      );
      return Response.send(res);
    }
  }
  static async addBankAccount(req, res) {
    try {
      const data = SanitizeObject(req.body, ['account_number', 'bank_code']);
      try {
        const resolved = await PaystackService.resolveAccount(
          data.account_number,
          data.bank_code
        );
        data.account_name = resolved.account_name;
      } catch (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, err.message);
        return Response.send(res);
      }

      try {
        const recipient = await PaystackService.createRecipientReference(
          data.account_name,
          data.account_number,
          data.bank_code
        );
        data.bank_name = recipient.details.bank_name;
        data.recipient_code = recipient.recipient_code;
        data.type = recipient.type;
      } catch (err) {
        Response.setError(HttpStatusCode.STATUS_BAD_REQUEST, err.message);
        return Response.send(res);
      }

      const account = await UserService.addUserAccount(req.user.id, data);
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Bank Account Added',
        account
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async getUserAccouns(req, res) {
    try {
      const accounts = await UserService.findUserAccounts(req.user.id);
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Bank Accounts', accounts);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async liveness(req, res) {
    try {
      // const rules = {
      //   first_name: 'required|alpha',
      //   surname: 'alpha',
      //   phone: ['regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
      //   nin_photo_url: 'required|string',
      //   liveness_capture: 'string|image',
      //   email: 'email',
      //   dob: 'date'
      // };
      var form = new formidable.IncomingForm();
      form.parse(req, async (err, fields, files) => {
        //   const validation = new Validator(fields, rules);
        //   if (validation.fails()) {
        //     Response.setError(422, Object.values(validation.errors.errors)[0][0]);
        //     return Response.send(res);
        //   }
        const outputFilePath = 'image.png';
        const base64Image =
          '/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAHSAV4DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDrqKKKBBRRRQAUUUUAFFJRQIWjNJRQMDRRikPHSgBcUtIDxzQTxQIWimhuelOzQAUlLmkFAC0hFGTQaACikBzS0AIabinGkHNACUE0tIfSgApCaBRjNAC0hoxR0oAM0UZJooAMCikpcmgAJzSYFGaMGgBaUCgUZoACMDrTTSsabQAUClxRQAUuaSigCaikPSkB7UDFozRjmkNAC5ozSZ5paACiiigQUhOKWmsPagBwNB5pq5pxoAMCijFFACEcUA0p6U3BoAcaKTd2xS0AB4pM0pooATNLRQTgUANNKAAKQZNOxQA3FIadTT1oATvS8GjrRwKACgmkzRQAmPeilpDQACiijpQADkUUZooAXPFFJ3ooAKKPekzQAtFJmjNAhaQ0uaSgZPTTTqafSgYDNJSnpTec0AKOtOHNNAwetLmgBeaQc0Emk70CHY96KSl7UAFGaTNBNAC5ozSZoyKAFzSUfjQaADpRSE8UlADs0hPFGaaTzQA4GgnIptLxigABpc02igB2aQ0lIaAHA0h602lAoAXFJgUuaTNAC8dqTJNGaTNAC0GkzRQAUuaSigBaKSlNACUUUUAFFFFAgooozQMkzQetJnmgnNAxc4oyKbRmgB1ITzSZpKAHZOaXNNHNOzQAtJk0meKKACg0hOKM0CHUdabmkzQA/pSE0maSgAOaO1LQRQAA0neijj1oAWlqNpFX7zAfU1G11AvWZB+NAE2aKrm9t1XJmQD609Z43AKuDn3oAkozSE0maAFpc0lFAC0UUUAGKKKKACiiigAoooxQAUUvA60nFABRSZozQAtJmkzS5oAKQ0oOaKAJMUlGabQMdSGkooAWikooAfmkzTaKAFJooozQAUUmaM0ALRSUUALRRmszUtat9OGHO5/7ooEaeQOpqnc6raWuRJMoI6jNcffeI725kxEfLj9BWHO7SOXZ9xPWgqzOwu/GESHEERf3PFY8/iO/kbcr7Qew7ViA5UbupqRS5+7GcAYNK5XKWJb+7uGJe4cj61H5xdW3ytx05ot48yEbDhRyM0hQyZOzv6UXCwnmtuC+YxH1p4vZoFykzce9QyIWAxlcHBpqRAlhnJzxTCxuWXia8tgof96D61t23iq2lIWVDGe9cZ5TxMVcAEjOKrs7iTB70E8p6pbXtvdJuikDe1WO1eW2l/PayblfaB2FdDpvioqNt2NwzwwNArHZZoqC3uYrmMPE4YH0qfkdaBBRSZ96AaAFopCwBoJz0FAwzRupPrRkUAGeaKTNGetAhaM03JxR2oAdxR3pA1KB3oAM0c0tFAC5ooooGFFJmjNAC0UmaM0ALRSZozQAtFFFABSZpaTpQAZqO4uI7aIySHCDqaS4uEt4y8jBVHrXEanq8uozMqEiJTjHrQC1L+q+I3lYxWnC93rBIuJ5FLsXJ6k9amithIMYwT0q7aWpcM2eM4zU3NVGxUi0x5E3BwWPG0UselLIxiRgrLy1dDbWpto8nkHnp2qS1t0mLERYBOQaB2OeTTDh22cjgEjirAs1iUbwCrHBx3rpY7RgGVlGzqRTo7dApBQYByBQNI5iO2MLZEYCj171X8kvJKu4AEcYrpbm33/MTgDsKzJ8L91FoEULa0SRm24fb1B9arx2K+a2QcE/lWnA4XmPuck4qWSEzRfLwe9IRkS2rSOERskDAzWbNFJGzgx9D1rqPszxrGQMkdWNV/sgkkffEwB6MPWi5VjnRB8ocjB7igxAEHhga3HgWCNo3G53PBxWXJAoDA5ULTTJcSSx1O40+X90xweq11uk69FfgpIQkg7E9a4QIZT8rcg0v76Dk8N2KmnchxPU8+9OzXMeH9dWaNbe4PzjhWPeukDBhkUyBxajJApKTmgYpbilByKbn1p3BHWgBcA0mMUAE0oHPI4oAOtLt4ozik6mgQuBmlpOKAME0AAPPNKaQnNJmgB9JRmjNAwpM80tNPBoAKUGkzRmgB1FJS0ALRTc0ZoAdTXYKCSQABkmkJ4rnfE+rG0hFvE37xxz7CgDH1zWHvr0xw58pOOD1NV7K0Jw2e/IqjDGxkDbuvJrpbGJWh461EmawiKlnnGOD61p2NgFAUdOppYIssM9BWnCoQZpIpiG2UAKBxTlRY1wBjFOaXt2qtJLVASPLjgDNV2cl8k4x2qNpevNQNN2pDJZW3LycVnXKFulWGlB69ahkYHpRcTRRCFG9BVmJzSHb3oQKOhouFi6j7lwRUq7WTBwKpBz61Ir4FIZZmtoJUycbuxrOnsYzCygA+9WGmwOlRvOCCMge1JiRhPp4jJAHOc5qnLEA5B4IFdA7K3HGKz7qAMcipvYpoxmVoiGV8YOfpXb+HNWW/tvKb/WRjn3965W4ti0e8AHHaodPvpNNvY50wBnDA+laRlcynGx6WSPWjB60y3lWeFJVIIYZFPJqzMXGetLhRz1pvalDUAOzRmm5ooEGcnmlzjpTRRQAuaXeKbmkoAfmkzSDrS0DHfWkzQDQTkUALnFIeaSgGgApe9GaSgB2aN1NozQApNJmkzRkUAMuJlt4WlcgKozzXm2oXRvtQknJypOBXX+K5QmkFckF2A+tcXZKWbG3IzxSkXBXZr2NtH5QJ5b0Nbdl8oxjFU4QqoOBV2BuKy6nRayL8Ry1WgxB5IxVCKTHfinG449qtGbLMkwHeq7zr071UluVzjPPpVV7kkntSbGkXnnUngVA8ue1UzMcZNNM+aVyuUslx60xpBUO8Uxm4qbhYn8z1ppkBqHJppbFFx2LCTBTUouhnB5rPLim7j607isaD3AbpVSSU84qEsR3pu6lcLEhlNJ5hqOlyPWkwFcbxgcVkXke1iMEitbcR0qpeqwjYrwSM007CeqN7wjqDTW72rnmM5XPpXT15poV99k1iFi2FY7Wr0sEEAjoRwa3WpztWYUUZpCaBDqKTIozxQAUUZooEFFJRQAtLmkNJQMdmjNApcCgBKM0UlAC0UCigAooooASiignANAHG+MJzJdQ2ynhFLGs2xVcLgdO9Jrkhm8QXG1zhcKKksVbaF6DtUSNqaNbdhBirET/J1qkcgYHanxuQmcVmal8S4qKWfqM1XL96ru3U5qrj5SWWfHTmoDID1qB5MZwaYGLVm2UoljzPenbxVTIJp24jvRcdizv60ocGqu9h70vmn0oEWC2DTWOR1qHzDSmT2oCw+kGc1H5hoDnPWgViTrRgUwOPWkDc0ybD8U0jFG+jcCKYhMmkkwyU0nFDHC0hmJOm2clW2kc5r07SbgXOmQSA5Gwc15peAht2Oa7PwXOZdIZGb7j4ArWOxzz3OlprEGlz7GkPWrIADilzim0ZPSgBd1LvBplOBoAXrS4pM0uaBBRRRQMdRSUtABQaKKAEpaKSgAooooAKRjhSfalziorhtsDkdQpoA81lk36rO/UbyP1rRtyRGT6dKxItz3chOPmY5/OtuP5IQO9ZTZ00loW1mwDkU9XB6CqoOVqZCcVBrYWRjVSVyRVhyahZSxwaGUkVSSO9KJPSntCSPam+SQKVh3HBgPrS7snpTRGRT8YNILj9ox1oA5pAPWnDBNIQm0EYpCtS4ppzQJohPB5pCRT256imbaoQwnP3eKA56ClK80m04qrEtoeoJqYICADTEOMU/JzkGgkjmURkDrmoHboO9STsWbkVWkI3UmNFO7OTtJ5Fb3gaULc3UPPIBArAul3qcferS8Ftt1yQOSCYuB681cDKoeiZxSZzSdaB1rUxF70HnvRiigQlKaQGjvQMUdaUUg60vegQoNLTQaWgY6ijNITQAtFIDRmgBaKTNGaAFpDS0hoADUNycW0hxnCnj8Km7VFNnyXwOcGgDy21jJnPzfNvOc/Wtx1IUc1kWiML8qx/5aNkfjWtIx3YFYz3OqlsOToB3NWAAo6/hVaNWLAitBQgTDcnNJJluSRAI2c8U8WxOM083kUAIAGahfWIUBPeqsLmJGtQvBpPswxVGTXIw2ShNMXXo2bG0ioeg0y8YQKYYxUceoxS55xjsalWVXJHtUjQnljFNCANjFTHJHFGDSuUM2e9BSlP3uuKQyqMihsBhi5pDFTxMu0nPApn2qPnJxTTJY0w8cCmFCKRtRiBwT+FN+3RMDng+9O7JaQ4jBpBnJ9Kha4XqDxSpcI2MHn0qiSUgkZIqlIvJ9Kul8r26VSdypPpSY0QyxjbkVa8HLv8QyFyPlTioX5jJx2q14Kh8zWp5cZ2JjNVTepnV2PQTkCkzS9cCgitjnAUhIpKWgBKWko70AOFHSgdKBQAo60d6M4oJoAdUZbFP3VGRzQMXcTS5puMUooAcCO9APNNozigCTNLUYNLmgB1MlXdGyjgkYBpc0EnFAHm9vCY9XnjPLKWOavPkBiRmi4jSLxBd7CMHpSzqRkdFPesZb3Omm9AimxGUH3vWrInjijPzDJrLkkSMqF/GmOFYKVySDzS5zRQEu5TJISG59qznMwY55FaDJubgYpjwMwPrSc2PkRjSXBGc5zVc3GHHOBWjcWbZ5WqEluB8pUihSFyFuGdiBtPzdDV+G+cOEzyCAax4F2HrV2L7249azky1FnQx3RZQQeKmNyMYFZUMvygE8VI0u04FZ3NbF95NyHHXtWTcTupOT8w/Wp/P5HNVrkb2zTTJaKZv5I8qGNRJqLBmL5yaSaHcc1WMA55zWikjJxZYS+RWO4Ek9KjEstwx2Z/CmQ2DNJubn0ArXtrTy14Wr5ieS5TjhuUQkZOPU0+OeRfvIynPOa1UifbxQIAuWcZ9qOYXJYZHP5kZYEHHWkyJRx1oWBU3kfKD1qFn2OCp6dRRoDiyZTlWWtPwLERJeuSfvAYrMJBQsPStvwOjCyuJCOGlODV09zKrsdb2oI4zSZo3VqYAKcRTM4pd1AC9KM03NGeaAHdKM80gNGTmgBxOaQ0DOaWgBKDSZoBzQMUUCijFACHrRmim0AOzRmkFFAC5oLUnPUGq0915cvlLtLYzyaASOZvogniOcoOqA1XvZMfWrc8jyalPLJHsdVAPv71l3khZzzWFQ6qS7lF2YtnNOF3HCPnaqdzOyghOSaymu/LkzJ+8fstZxibylY6D+1UY/uoXc+wpZNTljQF7Zlz645qpYaXq2oRNIr+RGBkADk1Ql0e8adFuL1CsiFgwfgfWtFG+xnKdkar6mBjzLd1z0PWoJLm3mBCHn0NUDpMscLzJqcbCM/KqSZOasXmmXlvBHc3SeZHIoIkTgiiULCjUuRthW4qeF+aohXYBkbevrVuzRnk2kc1nKJ0Rlc0oyTzU4GRRBD2xVuKHrkVnYp6FJlwc1BI4H1rUeBQuazbpVRS3pSsTcoSNlsHinRCMDJIxVKaWR2+VagJeSUIN7v2RK1jDQiUjcS+tYuCwJ9BzUv9rxKwQRP+IqhNoGr2th57JDbgjcFJ+bFUI9Ou3ww1OBXc8h3wRVxpmUqltzpf7Xt0H7wMn1U1JHfW84+VwR9a5mH+1TKbTdHMAM9cgio5p5Ipgk8PkHHBXpT5LC577HTTyjaQp61SBJfHY1n298zNsfketaEbA9Kzki07l90C2jtnHymup8KoE0OHC47/WuWP7yykHcqRXaaSqQ6dbxBl3BBkA81tT7nPV3NCkoorUxCiiigQd+tFFJmgB1FJ2ooAdmlJptGaAEBxS5pKKBik0h+tJzRigAzSg0mKMZoAXrSGkwRRnHQUALn1rH8QzLaWH2vvGwyfatgYrmvGxY6J5aZzI20Y9aT2KjuQvcLcQrIvO4ZFZ00HmGrMEIt7SCAdEQCrKQhiDWD1OxaGK2lGXqOO5zUM2lRW4DQookBzuIzn2rqhANtUL+Bth2gk0tkO9x+la5bpF9nuU8lsYPHFcjrOnSWV20tv8AvrZ2yrKckZ7VZunmRsMhqo126jG3JFCbQSjdFazsJry7CNiGEnLMwANdxeaxYvaJZpE0iIu3IFcd9quHI2ryOnFWYba4kBaZ2A+tNtszULES2himVo1YKWy+7gfhVmJV+2/JyPWkIGPLjBI7sauWltt57mpZrE0IEAHvVlY3wTjii3t2bBrQMe2Ej2pIcmY8rjbWXdkGAj1NaN0h3HFUSpZSCOtK5OxRlty1sgiZcnrzjA/xpbD/AIlzllhEhzkEt0p5RoSQQSpNI9qJV3Rkg+lVfQXqXtdvV1bT0wzLPH0GOD7VypWfIMsDt6AAAVoPHcQkgEkGgXMpG1gaqMmlYmUFJmlon2XT1kvLlS07KFWJBnAqDVS+qyAi1VIx1DdTSQTsMfLV2PfKRwPzqb63Go2MuLSTCgKZIP6VPEjIdprbSLKYIqOS2UnPFVuLYhthviZD3rSslk3xQW+d2c5z/OqMQ2SYqz4VuJLjW7wMOIxtAqodjOfc7NNwUBuuOtPptA61sc46k70hNJmgQ6jApM0m7FADqWk4NAoAU0UUUAIKDSbqNwoGLRQCMUZBFABmgHNFGcUABpDS9aQ0AGPesvX4FmsUyM7XDVqVQ1c/6FtHUmk9hx+IwGYB8Vct8MKzpSQ4z1xVu0kI5rBs7UaC8KQagnIIxinmUAZqrNKDUtlJFC5t0c/MKoNaQ54QZ+laj/N1pFhyeKBlBLZVH3QKcYHlO1fu960vsx/CnKix8DNIVirFYRxqOMn1qzBbqGJxUoHFKjKpp2AtQp2FSTDah5p1qyspNNuVJU07aE9THlAZ6haAZyKkmO2T0PvQrgioRRGbVXBGOaqyWjRNuXkelaKtinsN4xTYl5mUYVkGab9jUnoKvPbkHK9fSmqrDgihMGislqFPQVZijUdh+VPXOeRUgGegoARVFNkFTCMHvTLjCxH1pisUjxJWj4ZtvL1S8lUfK+CPrWWrbmxW/oGFlnP0rSG5jPZm9uOTS5FMV1bOKdkZrY5xcUlKTk0h60CEpDTs0hoAcvSlFNU8UuaAHiim5oOKAG5o460Y5o4oGFOBpuaM5NADs80hPNIfrSZoAcTQPrTc0Z5oAcc44rK1nzPsyeXktnOK0+ar3cJkhz3Xn8KT2HHc5e73IwJPJGaijuirDmptSOTv96zgQME1zSPQp2NgXOV9zUMjEt3quswDY/KpxICMZ5NQjRoci5IJFWk44AqBOO4qXOBnPNURYkd8Cos1G756mliJkb5Rn0pJhYnwelNMZZwo6077LcuQduAKuW8XluGfrTEixa2TImWzmnzQ5BFOe8xwDVZ5y2eafNoTZ3My9tSMnris+Pg8mtmUs4I7Vmz25zkcVm3rctWtYRWBPBzUgbBqv9mkQb1PNO3EoM8EdaaZLRZ4PNJjPQVCkpqcOCOaaQC7AOaBjHBFG8VGzgVRI6R9nTpWdc3GeOanll2jis6V9zVLLSJbdt0uK3NDYfaZlznC1iWagPk9K3NDtzFJOwOR61pDc56mzNxRtc+5qQHmmoDgZpcZroOUfnikzSUUAKDil+8KbSqQOtAC/dpQQaMg0goAO9KeaKKBiE5o700U4UDDmjrRSZ5oEBpAM0vem96AHUopKO1AC0jYxgnjvTScVG3LdxQBh6lZOgb5cx9Qw7VgScDHeu0vB5ls49BXHXSfMTjFYzidVKdyFJChyRkVainJPTAqgCc1aiPQCsbHVzXNGN8jrT3fjFQRDjmrATdimK5GELfjU0dwlpIAeo5qeOHNZetxSRqJEzjoakZsHWYyPvVWk1VN2Qc1w7T3Bk4mx7GpVlvIyN4Vl9RQ7sasdmb9ZBuFILsHvXORXfy9alW75rJ3RpZM6H7aiDk1C2oROxBxisOe7AT73NZ0lxP94YC1SuzN2Ov+1w7AM1XM0bS7Qetcit9ch/vcVt6b5krhmqrMjoabrt6U0S9Klcr0qBwR0FVYVyQyHHWoJJuKjMh6E8+lQSE0CFeY96hJy1RtuLA5qWNQWFCQm9C7CNsY6c11OnxGO0QsOTWbpWnQyKs8mSV6L2rbJPAGBj0reETlnNPQeG6cU4kg0zlVp2ccmtTIXdzilzTCw3gd6WgB1FJnIpCRwKAH546UZpoyM0uaAHA0uKaKXNAAcZpOlIaKBi5zQBSUZoEOxim0ZozQAUZxRmmk80AI7cU089aUkAUdRmgCCQOd6t9wjg1y90g3MPQ11xPGOua5q+iKXLpjgnINTNXNKejMVo8E4qaEAGnyR7TnNRocGsGjrizShUHGKuRrzWfDIAAO9XUf5c5oKLiFVpswjmQqwGD2qsZeKaZcjrRYTZl3mjxebvRRWbdWr7CobpW9NMNnJ6VmyFG3FjyaTiCmznzHNE9SNLIF4XmtCRTnOAR2pRHGVORzUtD5zHEM0r5Ymr8cBKAEnFSgpGfmxz0pUYiTj7uelVZkORJBZxggkdK1IQsajbxVKNi/PQVZVsDFHKHMTN8xBNO7c1Dup+8YoBMimQHp1FVJflHWrkrDb0qjL8xHNAEYBPWrUCktUKLk1qafaPc3MUUY3O7YAHenBEVHodHYgR2KLjtVoYwCTTZLaS3/AHUqNG68EMMUuAqj9a6Ecg4MG5DAihckknpTVHJwePan9KYCKPmPA+tKfakzzS5oABQTyox3o+tOBBoAXPOKKTvSOcAYpAOzzRmm56UtAC0UUhpjDPWm5oJpAMUAG7mlySaZzmpVQuQqqST0AGTQIbnmjGa3rHwjqt8VLQiCM/xSkg/lXTWXgbT4CDdSPcN/d+6v6daAPO1RnYKilm7ADJrbsvCmr3+D9n8hD/FNx+nWvS7awtLNAtvbRRAf3VANTKcyHngcUDsclY+AbOEBryZ527qvyj/E1yXxH0eCwvbWW2hWKN49u1RxkV67XD/EqNJNKg3Abg/BoHHc8bljBBrPkQhuK1502tuHTpVGZCp3DoKxaOmLIInORzVvz9i+1Z7NtPFV3uGORk1Brc1hejPP4VFJdZUjP0qiCJVwOCO9WIYTjnpTJY9pPNG3nd3qtNDI7AAGrpktoDuZgT7Ux9ViLfJHQKzKEymLhu1QpKME1otexS8yxCmiCzkG4DHtS0GkZrASEH07VJtkwSoxmr263jOEjyfWkNwF6oMUCsQqzIoHepA7bQc896X7TA33hg9qVijJ8rCncizEM+0daclwGOKzp8jpUSSPuJHbtTGjWmkwKgB3GmKzOozU8SjdUFN2JYU56V2vgTTzd+I7c4+SL5ziuVtoyzYr1T4d2Xk2st2y4Mnyrx2ramjnqSO7vLC0vo/9It45M8ZI5x9a5jUfATbzJp86hT/yzl6j6GuqkfbB+IxV5SCorZoxTPKrvwrrNqMtatIv96Nt36VlSQSwttlieM+jrivasYqG5tLe8iMdxCkqHswpDPFyecUma9A1HwRZzgtYym3f+63K1ymoeGtU075pLcyR/wDPSMbhSAy6B1pOjHPUdqAeaAH5ppyaOaU9KAEzijcaNoXmgUgHUh6daBknFPhgmuX2QRPK/ogzTGR9antbSe9mENvE0sh7KOldVpngSaULLqE3lqefKTr+Jrs7HTbTTYRHawrGvfA5P1NAHIad4CLbZNRnx/0zj/xrrLHR7DT1AtraNCP4sZP51dx6VHLLt4FACSS7eB1pYVb7zd6gjUySZNXB6U3oJCVHCdxkJ/vU84AOelRWpzCW9WNBRPXF+O4zOtpD2Z+a7QnArj/Fsga+sEH94k0AeU6raNZ3bxOOnI+lZUiZBWvQvFejtdaat9HjzVySB3Fefq2WwazsaRZkTjYSD1rMlk2GtzUI8AtjisGVNzHnFZNG6dxseopHJtZttLPqzAYVuKcLKK4XY6jJ71GmibSVOSO1MSbGJceYcs35mraOo5yKlg0NWIGcGrDaCwGA5+tJlrUptKD3qM3GDjdV3/hHJT0mNVpvD8ySbS7GgrlY0XQFS/aUI5IpV0B8fM7VaTQlA5yfrSE4mbLIhGR+lVheGM4GcVvPpSovPAHaqk9nHsKqoqkZvQyJdT34SNWY9+Kmt5DkEjrVqOzigjPyjcajWP5gKbsSi3G3Q1ehTaM4qvaQ73HHArTCKOKSQpSLOmQNcXcUKAlpGCjHavc9JtUtLOGBAAEUCvP/AANog3/2nMPaMH+dek2/b1reCsjnm7ssXB/dAerCrykhFqhORiMH+8KuHh0HrWjMyxSUjMAMUwuRzmoGSYHpSEqOuPpVdpSxwGxSiEMPmfNFh3M3VfDOn6qrMYxFN2kQY/MV53quiXukTFJ4yY8/LIBwRXrUcKp0J/E0s0Ec8TRSxq6MMFWGaQ0eJ88UortdR8BuC8mnzqQTkRycfrXM32i6jpxP2m1dV/vqMigCj9aaXxQQaNoHWgDttI8DswEupORnkRIen1NdhZ6faWEQjtoEjX2HNWqKBhRRRQMKqy8tirVM8pd24mmmJhEgVQae3Kn1NFZ1/rVhYKRPcxqw/h3c0MEXP9XA245wDSWnNshHcZrmH8XWctuI4H8x3bGScV0mnnNhDn+6KALB6VxHinnWbUegJrt26VxHiM58Q23oFpdBkV0SVSE8jGCK4HxPoh0u+EsS/uZeRx0runbddDJ71z3xGvTbaAjp94yoo/FgKzTKWhw1xEJrc+ornJ4jGT65ro1bA3A5z1rNvocsWXoeaJK5qnZmWrke1aFrcg4V+az2XFR+YUORWZrudGhAOUOam+0E8VzKahJH0NO/td/ekUmjp1nI5NSfaFI5HNcmdZb3qP8Atlt3ep1LvHudc1wpyOKa9zgcVyo1ds/dNSpqzH+E01cltG3LI8nXiqczqi+9UjqMkg6YqMyl+pqjFkhky2TSxrvemKmTWhaQjIJ6UJCbsWrePyoie5q7Z2zTuGI+VeW+lVS+WGegqfwzqJnuNQifoPL2j69a1ijKT0PYtLVYrKBEAChQAPSt23HFYtimI0HoK3bcYWtjAw/FV3cWkNsYJNh35Y+grCHje5t5Y1lIkAGSUrtJYorq48uVFdAMEGsXU/BWl3jFoFa2YD/ln0/KkFx1j44tbkqHOM9fUV00Mi3MSyRyBkPRga8f1jw9e6JINw3wnlZVB/WobfX9UshtgvJY1HbPFFwPaWCRjkj65qI6hZxsA06DHXJrx2fxLrF6BFLfSFPQcGqrBzh5S5/3yeaYI9v/ALXsP+fqL/vqrUVxDMMxyI49jmvB/tIhBKICfcVY0zVLu3bfHM6nOeDUj5j3Q01kVlKsAQexFeZ2fjy7gYLPhx0zXbaL4gtdYh+SRRKOqZ5pDvcoax4NtL7Mtri3m9B901wd/ptzpdwYbmMoex7N9K9jqC4s7e7VVuIUlCnI3DpQMnzRXNar4007TgVjJnl7KvT865C/8XatqWVil+yxekfX86AuekX2qWOnRl7u5jiA/vHmueuPiDo8eRAJZiP7qcV5vNFc3m5sySt/ebkmix0XUp0B8hlBPVuKAudrN8R3z+401yPUkCqM/wASdSAzHpqD6yVHZ+Ft5BurvaPRVraXwZpMsePOn6ddwppBc5a58c61qKmNpEt424IjHP51n28VxfXISEOzk/Mzc/rXaweAtOgm3tLLKg5CMeK3INNgtxsgiSJB02imI5nRvB1xKqT3OAUbIrv7JdtpGnXaMVHCAtuF38D0p9qcRlc9GNAyc1wviHP/AAkcQ9EruutcP4i48RRntsqXsMoTHFxn3ri/ifc/6BYQg/enBP4c12dwcMWrzn4jy5ewU/8APQn9KyKSMbz/ACpAT909aZMzMp28j+lV3O6IH25pkdwEQpID7EUJm1iCVT1qqwbB4qeWU7/l5X1pYyHODUscWUCp54pmw46VqtbA9KQ26jtSNLGUU9RSGPOK02hTGcVAYRnimKxVVMVIo54FW0gHenmFR2pXJZXUZwKmVaUqFNOCkjigRInUVfhbA9qz0YbgKs+aRmNcYPU1SIkXGlDKzAcKKp+FWP8Awknl54kC5/76FPdtls3uKg8HkyeMLceoH/oQq47kS2Pomzj+VfpWsnypVKzX5FOO1WLmTyrdm74wK2MAs23ySuR1PFW41ByfWqNpiO3HPJq9HwooERXEEbRukiK6N1DDINcvdeFdImkL/Z2TPZGwK6m5fK4qh1ODSGUrDRdPtABBaR5H8TDJ/Or11aWssPlzW8cgPYqOKsIBGm6qzuXYnPFAHOXng7TrhiY2khz2U5FVZvAsywbrS58zHRHGD+ddWvLVfThAKAPILrTLyzlZZ4JFIPUjg0yGaW3lWSKRkcdGU4r2B40l4kUMDwQwzWHqPg6wvcyW5NvKfToaAMzR/HVzbAR3486McBx94V3On6zZalAJLeZT6qTgivKdV0C/0n5pY90Z6SJyPxrNtrmRSwDMPcNilYfMTx6deX7g28Dye+OK7HRfC0MJDag29jz5Y6CupSCK2gWKGNUQdABUMoBGV4IoGgaxtYYtsMKKB0AFVxEpyuKtJJ5icnkdagfKtkUCaKs1qQcimRTPEcGtFHDjFVriHkkCiw0y3DdhgM1YI8wAqetYSuyGrtvdkDDHincLGnG2MqvNOh3LcMD35qmlyocbR1qcsQ6tnp1ouM0QRjNcR4nGNdgPqldmp4/lXH+LRt1O1b1UikxmXfjBXFeY/EXPn6eT/eb+VeoXw+RW7cV5j8SRxYt6Ow/SsrFI5yN90C/SoH5JpkEnyYzT2bioe50rYqyOSGQ5yfu4psU/kEADLHrmnuN3PcdKrvw5bHNUrMh+6aqXGUz3pTOrdxmsaO4ZcinG43MSPSocS1JGk75qMPtqkbg5AzSGbPeizHzIvrL83WpTOAKyTc7aaLhmPJ4p2Icka28Pyaa0m0HFUI7hh3461J5rSN8o4PU00iWy1uVmBXn+lWouMVUiXaoFWFbHegLEtzLiFh7U7wKQ3ja1H0/mKo3Uv7thVz4f8+NbRuwx/MCrgRJaH01brhBUV22944l5ycmrKYEYqrGfNunc9F+UGtkc5IxGY0xjJzV7ICCs8HzL0r/cGKsyP8uBQBFO3PtTYo8nJpcbjzUn3EpAQ3DkkIOlQ42oaVm+Yk9ailk+QgUASW/zSVdLYqjacZY1K0mWNICcPzUqyVS3+9PEuKdwsXDskiZHUMpHII4Nc5J4P029laWMNCxPIQ8VsSTYjODU2nN+7J9aAJWYGIGqLvhj6U+GUMu30qKXgmkUwik2vj1qZhuBBrOLkMD6VeRtyhvWhDexACyPVwYkTmoJV7iiCXBwaZK1IZ4sHpVXBU1sOgcVTlh56UmNMZDLjGa1In3xYPU1keUytx2q9byEY9aEM0on+UfSuc8YIDHaz4+6+DW4jgHHrWZ4mj87RJjjlMMPwoYzFlQSWKt1xXmvxNg26dYy44E+D/3ya9LspBPp/qa4f4m2+7wuZcf6qdG/M4/rWY1ueVI+3ipPMyKrn174pu8jrWbOmOxZZuKib5himiQUZoRRC8RVw2MgdqTgcHhianBzUbDJyapO5Dj2IcE59qiy44zUxGKQFc/dp6ENMjG7vzTirHG0damBB7VOiggYFDaFytkUVs5xvOB6VcRFjXC0DijdzUt3KUbEwOBmkaTjioWfAqIyUihbhsoa1vADY8VRv2BT/wBCUVgTyACrnhSeWPxRpscBx5t3Cjf7u8E1pExmz6uaQJDk+lQxHyockH1NJJ87Inbq1LPzGQOtbGBXgl2Ss7HljVpZQ3essKVbk1bizilcqxdTk0SHK0IDjNMkbApElWRucVXZstinyN81Qocy0DRcU7IfrUQfk0+U4jAqsDz1oBE4kyamY/KCKoB/mxVsnMX4UAyOWQldoNaFiSsf4VkjJlH1rXtiFXFA7FCCXbIAT1qzKQc1l79rZ9DWgzb41PtQPoVJ+pxVm0kzFz1FV5xxTLV8OVoBGpnIxVaT5XyKmB5psq5FFyepPDLuUDNTlQ46VlRv5b4NacTggUDsIIueRTxGikHFTqAaGjFMCJxwRjkVBdKs9rLE33XUqasMCPqKhcdT+lBR5T4c8XwRavdaDqTC3vIZGjTdwJADxj8K1vGVmL7wnfxKMnyiw+o5H8q4f4yeHvsOrQa5ApVLj93KR/fHQ/l/Ksrw58Q57a0Omaxunt2QoJjyycY5qGhnMoN0SkelMkjNSQuu0hTkAkA+tSgBqyaOiLM4sVPSnb+OtWZYMjIFU3XacUi2PD80pcEVBnFN3EUySZmBpuBURc03eaAZaXFTowAqgr1IHPrQSXTJmkL8VWVzTixNA0x7Pk4qCScIOKbLNtGAeaqkknJNNRM5SHMzOcmut+GdgL7x3YEjMdtunb/gI4/UiuQU8Zr2T4LaDIEvNXljKrLiKPcMHAOW/WtUrGLdz2GFSAXbqaVhzmnZzgdqcwpsVik8Q3dKmhSpNuaeqhaAF+6vWoJT8tSs1V5T8tAim3Ummwr+8zQ2cmnwDDUhpD7puBVXJ61ZujwKqdutNghFOZKvZxGKoL/rauHIQUgaEQfNmtCAZSqMfQmrBuVt4wzdzimMyZDhmFXbV99v9KymZgcN1q5p75DCgEWJhlaqBtkwYVckGQRWfLw30oBGvG+4Cp8ZFZ1tJlRV5GxigTRXnQjkUsFwUbBNTyruB96z3Uo3NIaN6GbfjmranNc9bXBQjmteG4DADNNMGiw8WeRVV49pyfxq/GwYc0kkQboKYkzi/Gmgrr/he8sdgZiheH1DjkV8tMjRsVbIZTgg+1fZM6MuRjivn/4m+A7vTNTuNasovM0+4cu4QZMTHrkehpMZ5vHK8Rypq9Ddh+GODWdyDzR0qXG5am0bgcMOtQyxg8is+K6KkAniriTBxxWfLY2jUTIWTBqJ0PWrbENSKoPBFIp6lAg5owavm3B6Uw2+KLisVQD6U4VP5OBzTW2qPehDcRg4pkkwAwOtMkc1AT781aRlKVhxfPJPNIMselNAJrqPBvhG58V6qsCBktEwZ5vQeg96sxuaXw+8DzeJ9QW5uFKabAw3kj/Wkfwj296+hrS2hsYxDBGqIM4VRjrUOmaba6Rp8VlaRiOGJdqhavIQx5piJFByTTu9KCMYpeBSGGABTCRilLcVBI+KBATk4FE64QU6BcnJp1yPlxTEZhPzGpIfvUw9TT4hgmkV0GXNVu1WLg1WJ4piQkf381bycVUiHJNW1G4ikUSoMKKz9QmzOkIP3VJNaDHaMntWErmfUJXxkYwPzprcTLd1HgE4qG3uBA2T0Jq9MN0ZB6jg1iz9CKYkdHkOuRzkZrOnHzGpdNmMloueo4pLgfNSGNs35xWmrd6xYW2y1qRNmkMuA5qCZMj3qVDxTmUMKBGcVKjipYrgxsOakaH0qtJGVzQNG1b3inA3VfjmVu9cmspQ9atw35XAJNA3E6GVA4461nXEKlGjljDRuCpVhkEGiLUFbHNWC6zLjNO5Ox4b4++FZh83VPD8eY8FpLReo91/wryF1ZGKuCrDgqRyDX2HKhjYnnFee+M/hxYeIw95YbLTUuuQMLIfegD56PFPjmKng1f1nQ7/AEO9a01C2eGUdyOG9way8YNIFoaEc6v161Mp5z1rJ3EHg1MlwydelQ4mkaljYVs0FlrOW74pftHvU8rNVNF1yMGqU8qr061FLck8A1WLFuppqJMqi6Cs5JpByaMVv+F/CeoeKNQWC0QrCD+8nYfKo/xrQwbuR+G/Dl74k1WOxs0IBP7yQjiNfU19I+H9AsvDelRWNmgCryzd2buTUPh3w7YeGNNWzsYxuI+eQj5nPqa1XkCKR3NMQ9n96ckmD1qiZM96lhyaQzQWXNSB8iq6LwKkHSgY524qMfM3tSOc8U+FOM0ySzGu1ahuuKnSoLsZFAGcfvVJHUZ6mnoeKQ3sQXJ5qtnPFT3B5qEU2JEkQAarqrgbqpp1q35vyAUiirfzeVbuSeTwKzLDlmPtS6vNysfvzRYgAc+lNCZqz/LO4PRhkVj3i7WJrVvmOxHz0OKzrsB4ye9AiXR5MxOvoatXA71maK/+kSofTNak4yKBlA8SA1owv0rPcYOaswtgCkNGtEQw4qUVTifGDVxXDAUCFxUckeR0qdeaHWgEZckODmqzAg1rSR5HSqzQZzxQO5TVivQmp0vHjPWkMBHQUhhPpQBZGoqVw/SkLJIMxnmqEsJx0qFTJGcg0ASaxpGna5ZNaanarNGRgNj5k9we1eNeKvhPqGl77rSCb20HJQffQfTvXtcd0rja/wCdPIZfmQ5FMD5LkjkhcpIjKw4IYYIpp6V9Ja74R0PxBGftloEn7TRDa2f615zq/wAH7+ENJpV3Hcr18uT5W/OkI8zDYpd5rbvvBniHT8+fpc+B3QbhWQbW4VxG0EquTgKUOaAIs5pQMkDqT0x3rqtE+Huu6xIh+zG2hbrJNxx9K9R8O/DjR9DYTTL9suh0aQfKp9hQB5/4P+G1/rsiXV+GtLDg/MMM49hXuGl6ZZaPYR2WnwrFCgx8o6+5qVQcDOFUdAKkL9lHFMCR5Aq4HLVXbLdacQcUinNIBgXmrtumKrhfmFXoVwM0AiUClPApRjFMZsUAxo5PNWIgcYqFOasx9aYkSquKr3PSrHU1WucYoAzm6mlXhaRvvUHpQDK05yajXrSynLUi9aARKpwacze9MFMnfy4mNIpmNeSebdHnvWnbLhR9KxgfMuRx3rbjOEX6UxLcnufmhdfbNZayho8E1ou/zYrDY+XdSR575FAE+mOF1Nl9RW5IPlzXM2b7dWj565FdMxypFAFGTinwngU2Uc0RHBpAjQjYd6tRsARWcjcirkbUAzRjO4Zp+M1WgargwwoERFc1GVXPNWCp7VVk4amMd5YIppiA7UqOOmal4PQ0AU5YQUJxzVFoDk1ssvy1TYDJpAZpt/alVHQ9eKuMo61C545pgRsFcfNx71CyFMlWGKe+aZjPWgBBNjhqgljt3lEht4iw6MUGanKjPSkGAegpAIJC/wB0YFPBCnjk03fkY6fSgc0xEhYtzSAtmlXpSE80ASA0vU0g9qUUAOQEtV+M4GO1VoVBNWwMUhjj0pp6UtIeKaJYsfDYq0FyM1VTrVpDxQNCkk+1V7k8VYY1VuDQIpP96mMeDT361C5OKENld/vUChutFAIeDVTUX2wbc9asr1rN1WT5lX0oGyjb/wCu/GtwYES1i2i5bNbH/LIUwQ2b7zVjXP8AyEB/u0UUgGW3/IUh/wB6upHQ0UUAV5fvUxPvH6UUUgROvSrUP3RRRQDLsPSrsdFFAiQ9KpTdTRRTGQL1qwtFFAD3+7VF/vUUUgI26VXbrRRTAjam96KKBA3Som7UUUhjF61ItFFMQ9etK1FFAD06U4UUUAWoOtWxRRSGIetJRRTRLHJ1qwtFFA0DVVuOlFFAio/WoX6UUUIbK7daKKKAQq9ax9U/4+DRRQNjLPrWqf8AVj60UUwR/9k='.replace(
            /^data:image\/\w+;base64,/,
            ''
          );
        const imageBuffer = Buffer.from(base64Image, 'base64');

        // 14625019521;
        fs.writeFileSync(outputFilePath, imageBuffer);
        const fileContent = fs.readFileSync(outputFilePath);
        console.log('Image saved:', fileContent);
        // const extension = fileContent.name.substring(
        //   fileContent.name.lastIndexOf('.') + 1
        // );
        // const url = await uploadFile(
        //   fileContent,
        //   'u-' + environ + '-' + 'backend' + '-' + '-i.' + extension,
        //   'convexity-profile-images'
        // );
        // console.log(url, 'url');
        //   const user = await UserService.findSingleUser({id: req.user.id});
        //   if (!user) {
        //     Response.setError(404, 'User not found');
        //     return Response.send(res);
        //   }
        //   const existLiveness = await UserService.findLiveness(req.user.id);
        //   if (existLiveness) {
        //     existLiveness.update(fields);
        //     Response.setSuccess(
        //       HttpStatusCode.STATUS_OK,
        //       'Liveness Updated',
        //       existLiveness
        //     );
        //     return Response.send(res);
        //   }
        //   fields.liveness_capture = url;

        // const liveness = await UserService.createLiveness(fields);
        Response.setSuccess(HttpStatusCode.STATUS_CREATED, 'Liveness');
        return Response.send(res);
      });
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }
  static async updateProfile(req, res) {
    try {
      const data = req.body;
      const location = JSON.parse(req.user.location);
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        phone: ['regex:/^([0|+[0-9]{1,5})?([7-9][0-9]{9})$/'],
        username: 'string',
        nin: 'size:16'
      };
      Logger.info(`Request Body: ${JSON.stringify(data)}`);
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Logger.error(`Validation Error: ${JSON.stringify(validation.errors)}`);
        Response.setError(422, validation.errors);
        return Response.send(res);
      }

      if (data.username) {
        const user = await UserService.findSingleUser({
          username: data.username
        });
        const me = await UserService.findSingleUser({
          username: data.username,
          id: req.user.id
        });
        if (!me && user) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            `Username already taken`
          );
          return Response.send(res);
        }
      }

      if (data.nin && process.env.ENVIRONMENT !== 'staging') {
        const hash = createHash(data.nin);
        const isExist = await UserService.findSingleUser({nin: data.nin});
        if (isExist) {
          Response.setError(
            HttpStatusCode.STATUS_BAD_REQUEST,
            `user with this nin: ${data.nin} exist`
          );
          return Response.send(res);
        }
        const nin = await UserService.nin_verification(
          {number: data.nin},
          location.country
        );
        if (!nin.status) {
          Response.setError(
            HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
            'Not a Valid NIN'
          );
          return Response.send(res);
        }
        data.is_verified = true;
        data.is_nin_verified = true;
        data.nin = hash;
        await req.user.update(data);
        Response.setSuccess(
          HttpStatusCode.STATUS_OK,
          'Profile Updated',
          req.user.toObject()
        );
        return Response.send(res);
      }
      data.is_nin_verified = true;
      data.is_verified = true;
      await req.user.update(data);
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'Profile Updated',
        req.user.toObject()
      );
      return Response.send(res);
    } catch (error) {
      Logger.error(`Server Error. Please retry: ${JSON.stringify(error)}`);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.' + error
      );
      return Response.send(res);
    }
  }

  static async findProfile(req, res) {
    try {
      const profile = (await UserService.findUser(req.user.id)).toObject();
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'User profile', profile);
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Server Error. Please retry.'
      );
      return Response.send(res);
    }
  }

  static async updatedUser(req, res) {
    try {
      const data = req.body;
      data['today'] = new Date(Date.now()).toDateString();
      const rules = {
        first_name: 'required|alpha',
        last_name: 'required|alpha',
        phone: 'required|string',
        address: 'required|string',
        location: 'required|string',
        marital_status: 'required|alpha|in:single,married',
        dob: 'date|before:today',
        bvn: 'numeric',
        nin: 'numeric',
        id: 'required|numeric'
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        var filterData = {
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          address: data.address,
          location: data.location,
          marital_status: data.marital_status,
          dob: data.dob,
          bvn: data.bvn,
          nin: data.nin
        };

        var updateData = {};
        for (const index in filterData) {
          if (data[index]) {
            updateData[index] = data[index];
          }
        }
        const user_exist = await db.User.findByPk(data.id)
          .then(async user => {
            await user.update(updateData).then(response => {
              Response.setSuccess(200, 'User Updated Successfully');
              return Response.send(res);
            });
          })
          .catch(err => {
            Response.setError(404, 'Invalid User Id');
            return Response.send(res);
          });
      }
    } catch (error) {
      Response.setError(422, error.message);
      return Response.send(res);
    }
  }

  static async updateProfileImage(req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      const rules = {
        userId: 'required|numeric'
      };
      const validation = new Validator(fields, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        if (!files.profile_pic) {
          Response.setError(422, 'Profile Image Required');
          return Response.send(res);
        } else {
          const user = await db.User.findByPk(fields.userId);
          if (user) {
            const extension = files.profile_pic.name.substring(
              files.profile_pic.name.lastIndexOf('.') + 1
            );
            await uploadFile(
              files.profile_pic,
              'u-' + environ + '-' + user.id + '-i.' + extension,
              'convexity-profile-images'
            ).then(url => {
              user.update({
                profile_pic: url
              });
            });
            Response.setSuccess(200, 'Profile Picture Updated');
            return Response.send(res);
          } else {
            Response.setError(422, 'Invalid User');
            return Response.send(res);
          }
        }
      }
    });
  }

  static async updateNFC(req, res) {
    try {
      const data = req.body;
      const rules = {
        nfc: 'required|string',
        id: 'required|numeric'
      };
      const validation = new Validator(data, rules);
      if (validation.fails()) {
        Response.setError(422, validation.errors);
        return Response.send(res);
      } else {
        await db.User.update(data, {
          where: {
            id: data.id
          }
        }).then(() => {
          Response.setSuccess(200, 'User NFC Data Updated Successfully');
          return Response.send(res);
        });
      }
    } catch (error) {
      Response.setError(422, error.message);
      return Response.send(res);
    }
  }

  static async getAUser(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Please input a valid numeric value');
      return Response.send(res);
    }

    try {
      const theUser = await UserService.getAUser(id);
      if (!theUser) {
        Response.setError(404, `Cannot find User with the id ${id}`);
      } else {
        Response.setSuccess(200, 'Found User', theUser);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(404, error.toString());
      return Response.send(res);
    }
  }

  static async resetPassword(req, res, next) {
    const email = req.body.email;
    try {
      //check if users exist in the db with email address
      db.User.findOne({
        where: {
          email: email
        }
      })
        .then(user => {
          //reset users email password
          if (user !== null) {
            //if there is a user
            //generate new password
            const newPassword = Response.generatePassword();
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then(hash => {
                const encryptedPassword = hash;
                return db.User.update(
                  {
                    password: encryptedPassword
                  },
                  {
                    where: {
                      email: email
                    }
                  }
                ).then(updatedRecord => {
                  //mail user a new password
                  //respond with a success message
                  res.status(201).json({
                    status: 'success',
                    message:
                      'An email has been sent to the provided email address, kindly login to your email address to continue'
                  });
                });
              });
            });
          }
        })
        .catch(err => {
          res.status(404).json({
            status: 'error',
            error: err
          });
        });
    } catch (error) {
      Response.setError(500, 'Internal Server Error ' + error.toString);
      return Response.send(res);
    }
  }

  static async deactivate(req, res) {
    try {
      const id = req.body.userId;

      const user = await db.User.findByPk(id);

      user.status = 'suspended';
      user.save();

      Response.setSuccess(200, 'User Deactivated successfully');
      return Response.send(res);
    } catch (error) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
  }

  static async updatePassword(req, res) {
    const {oldPassword, newPassword, confirmedPassword} = req.body;
    if (newPassword !== confirmedPassword) {
      Response.setError(400, 'New password does not match confirmed password ');
      return Response.send(res);
    }
    const userId = req.user.id;
    db.User.findOne({
      where: {
        id: userId
      }
    })
      .then(user => {
        bcrypt
          .compare(oldPassword, user.password)
          .then(valid => {
            if (!valid) {
              Response.setError(419, 'Old Password does not match');
              return Response.send(res);
            }
            //update new password in the db
            bcrypt.genSalt(10, (err, salt) => {
              bcrypt.hash(newPassword, salt).then(async hash => {
                const encryptedPassword = hash;
                await user
                  .update({
                    password: encryptedPassword
                  })
                  .then(updatedRecord => {
                    //mail user a new password
                    // //respond with a success message
                    // res.status(201).json({
                    //   status: "success",
                    //   message:
                    //     "An email has been sent to the provided email address, kindly login to your email address to continue",
                    // });
                    Response.setError(200, 'Password changed successfully');
                    return Response.send(res);
                  });
              });
            });
          })
          .catch(err => {
            Response.setError(419, 'Internal Server Error. Please try again.');
            return Response.send(res);
          });
      })
      .catch(err => {
        Response.setError(419, 'Internal Server Error. Please try again.');
        return Response.send(res);
      });
  }

  static async deleteUser(req, res) {
    const {id} = req.params;

    if (!Number(id)) {
      Response.setError(400, 'Please provide a numeric value');
      return Response.send(res);
    }

    try {
      const UserToDelete = await UserService.deleteUser(id);

      if (UserToDelete) {
        Response.setSuccess(200, 'User deleted');
      } else {
        Response.setError(404, `User with the id ${id} cannot be found`);
      }
      return Response.send(res);
    } catch (error) {
      Response.setError(400, error);
      return Response.send(res);
    }
  }

  static async getBeneficiaryTransactions(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await BeneficiaryService.getUser(beneficiary);
    if (beneficiary_exist) {
      const wallet = await beneficiary_exist.getWallet();
      const wallets = wallet.map(element => {
        return element.uuid;
      });
      await db.Transaction.findAll({
        where: {
          [Op.or]: {
            walletRecieverId: {
              [Op.in]: wallets
            },
            walletSenderId: {
              [Op.in]: wallets
            }
          }
        }
      }).then(response => {
        Response.setSuccess(200, 'Transactions Retrieved', response);
        return Response.send(res);
      });
    } else {
      Response.setError(422, 'Beneficiary Id is Invalid');
      return Response.send(res);
    }
  }

  static async getRecentTransactions(req, res) {
    const beneficiary = req.params.beneficiary;
    const beneficiary_exist = await BeneficiaryService.getUser(beneficiary);
    if (beneficiary_exist) {
      const wallet = await beneficiary_exist.getWallet();
      const wallets = wallet.map(element => {
        return element.uuid;
      });

      await db.Transaction.findAll({
        where: {
          [Op.or]: {
            walletRecieverId: {
              [Op.in]: wallets
            },
            walletSenderId: {
              [Op.in]: wallets
            }
          }
        },
        order: [['createdAt', 'DESC']],
        limit: 10
      }).then(response => {
        Response.setSuccess(200, 'Transactions Retrieved', response);
        return Response.send(res);
      });
    } else {
      Response.setError(422, 'Beneficiary Id is Invalid');
      return Response.send(res);
    }
  }

  static async getTransaction(req, res) {
    const uuid = req.params.uuid;
    const transaction_exist = await db.Transaction.findOne({
      where: {
        uuid: uuid
      },
      include: ['SenderWallet', 'RecievingWallet']
    });
    if (transaction_exist) {
      Response.setSuccess(200, 'Transaction Retrieved', transaction_exist);
      return Response.send(res);
    } else {
      Response.setError(422, 'Transaction Id is Invalid');
      return Response.send(res);
    }
  }

  static async getStats(req, res) {
    var date = new Date();
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    var lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const wallet = await db.User.findOne({
      where: {
        id: req.user.id
      },
      include: ['Wallet']
    });
    const wallets = wallet.Wallet.map(element => {
      return element.uuid;
    });

    const income = await db.Transaction.findAll({
      where: {
        walletRecieverId: {
          [Op.in]: wallets
        },
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay
        }
      },
      attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'income']],
      raw: true
    });
    const expense = await db.Transaction.findAll({
      where: {
        walletSenderId: {
          [Op.in]: wallets
        },
        createdAt: {
          [Op.gte]: firstDay,
          [Op.lte]: lastDay
        }
      },
      attributes: [[sequelize.fn('sum', sequelize.col('amount')), 'expense']],
      raw: true
    });
    Response.setSuccess(200, 'Statistics Retrieved', [
      {
        balance: wallet.Wallet.balance,
        income: income[0].income == null ? 0 : income[0].income,
        expense: expense[0].expense == null ? 0 : expense[0].expense
      }
    ]);
    return Response.send(res);
  }

  static async getChartData(req, res) {
    const users = await db.User.findAll({
      where: {
        RoleId: 5,
        dob: {
          [Op.ne]: null
        }
      }
    });
    const gender_chart = {
      male: 0,
      female: 0
    };
    const age_groups = {
      '18-29': 0,
      '30-41': 0,
      '42-53': 0,
      '54-65': 0,
      '65~': 0
    };
    for (const user of users) {
      if (user.gender == 'male') {
        gender_chart['male'] += 1;
      } else if (user.gender == 'female') {
        gender_chart['female'] += 1;
      }

      const diff = getDifference(user.dob);
      if (diff >= 18 && diff <= 29) {
        age_groups['18-29'] += 1;
      } else if (diff >= 30 && diff <= 41) {
        age_groups['30-41'] += 1;
      } else if (diff >= 42 && diff <= 53) {
        age_groups['42-53'] += 1;
      } else if (diff >= 54 && diff <= 65) {
        age_groups['54-65'] += 1;
      } else if (diff > 65) {
        age_groups['65~'] += 1;
      }
    }
    Response.setSuccess(200, 'Chart Data Retrieved', {
      gender_chart: gender_chart,
      age_chart: age_groups
    });
    return Response.send(res);
  }

  static async countUserTypes(req, res) {
    let vendors = await db.User.count({
      where: {
        RoleId: 4
      }
    });
    let beneficiaries = await db.User.count({
      where: {
        RoleId: 5
      }
    });
    Response.setSuccess(200, 'Users Type Counted', {
      vendors,
      beneficiaries
    });
    return Response.send(res);
  }

  static async getTotalAmountRecieved(req, res) {
    let id = req.params.id;
    await db.User.findOne({
      where: {
        id: req.params.id
      },
      include: {
        model: db.Wallet,
        as: 'Wallet'
      }
    }).then(async user => {
      await db.Transaction.findAll({
        where: {
          walletRecieverId: user.Wallet.uuid
        },
        attributes: [
          [sequelize.fn('sum', sequelize.col('amount')), 'amount_recieved']
        ]
      }).then(async transactions => {
        Response.setSuccess(200, 'Recieved Transactions', {
          transactions
        });
        return Response.send(res);
      });
    });
  }

  static async getWalletBalance(req, res) {
    const user_id = req.params.id;
    const userExist = await db.User.findOne({
      where: {
        id: user_id
      },
      include: ['Wallet']
    })
      .then(user => {
        Response.setSuccess(200, 'User Wallet Balance', user.Wallet);
        return Response.send(res);
      })
      .catch(err => {
        Response.setError(404, 'Invalid User Id');
        return Response.send(res);
      });
  }

  static async addToCart(req, res) {
    let data = req.body;
    let rules = {
      userId: 'required|numeric',
      productId: 'required|numeric',
      quantity: 'required|numeric'
    };
    let validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(400, validation.errors);
      return Response.send(res);
    } else {
      let user = await db.User.findByPk(data.userId);
      if (!user) {
        Response.setError(404, 'Invalid User');
        return Response.send(res);
      }
      let product = await db.Products.findOne({
        where: {
          id: data.productId
        },
        include: {
          model: db.Market,
          as: 'Vendor'
        }
      });
      if (!product) {
        Response.setError(404, 'Invalid Product');
        return Response.send(res);
      }
      let pendingOrder = await db.Order.findOne({
        where: {
          UserId: data.userId,
          status: 'pending'
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          order: [['createdAt', 'DESC']],
          include: {
            model: db.Products,
            as: 'Product'
          }
        }
      });

      if (!pendingOrder) {
        let uniqueId = String(
          Math.random().toString(36).substring(2, 12)
        ).toUpperCase();
        await user
          .createOrder({
            OrderUniqueId: uniqueId
          })
          .then(async order => {
            await order
              .createCart({
                ProductId: product.id,
                unit_price: product.price,
                quantity: data.quantity,
                total_amount: product.price * data.quantity
              })
              .then(cart => {
                Response.setSuccess(
                  201,
                  product.name + ' has been added to cart'
                );
                return Response.send(res);
              });
          });
      } else {
        if (pendingOrder.Cart.length) {
          if (pendingOrder.Cart[0].Product.MarketId != product.MarketId) {
            Response.setError(
              400,
              'Cannot add product that belongs to a different vendor'
            );
            return Response.send(res);
          } else {
            let productAddedToCart = await db.OrderProducts.findOne({
              where: {
                ProductId: product.id
              }
            });
            if (productAddedToCart) {
              await productAddedToCart
                .update({
                  quantity: data.quantity,
                  total_amount: data.quantity * product.price,
                  unit_price: product.price
                })
                .then(() => {
                  Response.setSuccess(
                    201,
                    product.name + ' has been added to cart'
                  );
                  return Response.send(res);
                });
            } else {
              await pendingOrder
                .createCart({
                  ProductId: product.id,
                  quantity: data.quantity,
                  total_amount: data.quantity * product.price,
                  unit_price: product.price
                })
                .then(() => {
                  Response.setSuccess(
                    201,
                    product.name + ' has been added to cart'
                  );
                  return Response.send(res);
                });
            }
          }
        } else {
          await pendingOrder
            .createCart({
              ProductId: product.id,
              quantity: data.quantity,
              total_amount: data.quantity * product.price,
              unit_price: product.price
            })
            .then(() => {
              Response.setSuccess(
                201,
                product.name + ' has been added to cart'
              );
              return Response.send(res);
            });
        }
      }
    }
  }

  static async getCart(req, res) {
    let id = req.params.userId;
    let user = await db.User.findByPk(id);
    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }
    let pendingOrder = await db.Order.findOne({
      where: {
        UserId: id,
        status: 'pending'
      },
      include: {
        model: db.OrderProducts,
        as: 'Cart',
        attributes: {
          exclude: ['OrderId']
        }
      }
    });

    if (pendingOrder && pendingOrder.Cart.length) {
      Response.setSuccess(200, 'Cart', {
        cart: pendingOrder.Cart
      });
      return Response.send(res);
    } else {
      Response.setError(400, 'No Item in Cart');
      return Response.send(res);
    }
  }

  static async updatePin(req, res) {
    let data = req.body;
    let rules = {
      userId: 'required|numeric',
      pin: 'required|numeric'
    };
    let validation = new Validator(data, rules);
    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      let user = await db.User.findByPk(data.userId);
      if (!user) {
        Response.setError(404, 'Invalid User');
        return Response.send(res);
      } else {
        await user
          .update({
            pin: data.pin
          })
          .then(() => {
            Response.setSuccess(200, 'Pin updated Successfully');
            return Response.send(res);
          });
      }
    }
  }

  static async getSummary(req, res) {
    const id = req.params.id;

    const user = await db.User.findOne({
      where: {
        id: req.params.id
      },
      include: {
        model: db.Wallet,
        as: 'Wallet'
      }
    });

    if (!user) {
      Response.setError(404, 'Invalid User');
      return Response.send(res);
    }

    const wallets = user.Wallet.map(element => {
      return element.uuid;
    });

    const spent = await db.Transaction.sum('amount', {
      where: {
        walletSenderId: {
          [Op.in]: wallets
        }
      }
    });
    const recieved = await db.Transaction.sum('amount', {
      where: {
        walletRecieverId: {
          [Op.in]: wallets
        }
      }
    });
    Response.setSuccess(200, 'Summary', {
      balance: user.Wallet.balance,
      recieved,
      spent
    });
    return Response.send(res);
  }

  static async fetchPendingOrder(req, res) {
    const userId = req.params.userId;
    const userExist = await db.User.findByPk(userId);

    if (userExist) {
      let pendingOrder = await db.Order.findOne({
        where: {
          UserId: userId,
          status: 'pending'
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          attributes: {
            exclude: ['OrderId']
          },
          include: {
            model: db.Products,
            as: 'Product',
            include: {
              model: db.Market,
              as: 'Vendor'
            }
          }
        }
      });

      if (pendingOrder) {
        const image = await codeGenerator(pendingOrder.id);
        let result;
        result = {
          orderUniqueId: pendingOrder.OrderUniqueId,
          image,
          status: pendingOrder.status
        };
        if (pendingOrder.Cart) {
          let cart = pendingOrder.Cart.map(cart => {
            return {
              quantity: cart.quantity,
              price: cart.unit_price,
              product: cart.Product.name
            };
          });
          result['vendor'] = pendingOrder.Cart[0].Product.Vendor.store_name;
          result['cart'] = cart;
        }
        Response.setSuccess(200, 'Pending Order', result);
        return Response.send(res);
      } else {
        Response.setSuccess(200, 'Pending Order', pendingOrder);
        return Response.send(res);
      }
    } else {
      Response.setError(400, 'Invalid User');
      return Response.send(res);
    }
  }

  static async transact(req, res) {
    const data = req.body;
    const rules = {
      senderAddr: 'required|string',
      recieverAddr: 'required|string',
      amount: 'required|numeric'
    };

    let validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      const senderExist = await db.Wallet.findOne({
        where: {
          address: data.senderAddr,
          CampaignId: NULL,
          [Op.or]: {
            AccountUserType: ['user', 'organisation']
          }
        }
      });

      if (!senderExist) {
        Response.setError(404, 'Sender Wallet does not Exist');
        return Response.send(res);
      }

      const recieverExist = await db.Wallet.findOne({
        where: {
          address: data.recieverAddr,
          CampaignId: NULL,
          [Op.or]: {
            AccountUserType: ['user', 'organisation']
          }
        }
      });

      if (!senderExist) {
        Response.setError(404, 'Reciever Wallet does not Exist');
        return Response.send(res);
      }

      if (senderExist.balance < data.amount) {
        Response.setError(
          422,
          'Sender Balance Insufficient to fund Transaction'
        );
        return Response.send(res);
      } else {
        let parentEntity, parentType;
        if (senderExist.AccountUserType === 'organisation') {
          parentType = 'organisation';
          parentEntity = await db.Organisations.findByPk(
            senderExist.AccountUserId
          );
        } else if (senderExist.AccountUserType === 'user') {
          parentType = 'user';
          parentEntity = await db.User.findByPk(senderExist.AccountUserId);
        }
        await parentEntity
          .createTransaction({
            walletSenderId: senderExist.uuid,
            walletRecieverId: recieverExist.uuid,
            amount: data.amount,
            narration:
              parentType === 'organisation'
                ? `Transfer to ${parentEntity.name}`
                : `Transfer to ${parentEntity.first_name} ${parentEntity.last_name}`
          })
          .then(transaction => {
            transferToQueue.send(
              new Message(
                {
                  senderAddress: senderExist.address,
                  senderPass: senderExist.privateKey,
                  reciepientAddress: recieverExist.address,
                  amount: data.amount,
                  transaction: transaction.uuid
                },
                {
                  contentType: 'application/json'
                }
              )
            );
          });

        Response.setSuccess(200, 'Payment Initiated');
        return Response.send(res);
      }
    }
  }

  static async checkOut(req, res) {
    let data = req.body;

    let rules = {
      userId: 'required|numeric',
      pin: 'required|numeric',
      orderId: 'required|numeric',
      campaign: 'campaign|numeric'
    };

    let validation = new Validator(data, rules);

    if (validation.fails()) {
      Response.setError(422, validation.errors);
      return Response.send(res);
    } else {
      let user = await db.User.findOne({
        where: {
          id: data.userId
        },
        include: {
          model: db.Wallet,
          as: 'Wallet',
          where: {
            CampaignId: NULL
          }
        }
      });

      if (!user) {
        Response.setError(404, 'Invalid User');
        return Response.send(res);
      }

      if (user.pin != data.pin) {
        Response.setError(400, 'Invalid Pin');
        return Response.send(res);
      }

      let pendingOrder = await db.Order.findOne({
        where: {
          UserId: data.userId,
          status: 'pending'
        },
        include: {
          model: db.OrderProducts,
          as: 'Cart',
          include: {
            model: db.Products,
            as: 'Product',
            include: {
              model: db.Market,
              as: 'Vendor'
            }
          }
        }
      });

      if (pendingOrder && pendingOrder.Cart.length) {
        let sum = pendingOrder.Cart.reduce((a, b) => {
          return Number(a) + Number(b.total_amount);
        }, 0);
        if (user.Wallet[0].balance < sum) {
          Response.setError(
            400,
            'Insufficient Funds in Wallet to clear Cart Items'
          );
          return Response.send(res);
        } else {
          try {
            let result = await db.sequelize.transaction(async t => {
              let vendor = await db.Wallet.findOne({
                where: {
                  AccountUserId: pendingOrder.Cart[0].Product.Vendor.UserId,
                  AccountUserType: 'user',
                  CampaignId: null
                }
              });
              let buyer, type;

              const belongsToCampaign = await db.Beneficiaries.findOne({
                where: {
                  CampaignId: data.campaign,
                  UserId: vendor.AccountUserId
                }
              });

              if (belongsToCampaign) {
                type = 'campaign';
                buyer = await db.Wallet.findOne({
                  where: {
                    AccountUserId: data.userId,
                    AccountUserType: 'user',
                    CampaignId: data.campaign
                  }
                });
              } else {
                type = 'main';
                buyer = await db.Wallet.findOne({
                  where: {
                    AccountUserId: data.userId,
                    AccountUserType: 'user',
                    CampaignId: null
                  }
                });
              }

              let ngo = await db.Wallet.findOne({
                where: {
                  AccountUserType: 'organisation',
                  CampaignId: data.campaign
                }
              });

              await pendingOrder
                .createTransaction({
                  walletSenderId: buyer.uuid,
                  walletRecieverId: vendor.uuid,
                  amount: sum,
                  status: 'processing',
                  is_approved: false,
                  narration: 'Payment for Order ' + pendingOrder.OrderUniqueId
                })
                .then(async transaction => {
                  if (type === 'campaign') {
                    const transferFromQueueMessage = {
                      ownerAddress: ngo.address,
                      recieverAddress: vendor.address,
                      spenderAddress: buyer.address,
                      senderKey: buyer.privateKey,
                      amount: sum,
                      transactionId: transaction.uuid,
                      pendingOrder: pendingOrder.id
                    };
                    transferFromQueue.send(
                      new Message(transferFromQueueMessage, {
                        contentType: 'application/json'
                      })
                    );
                  } else if (type == 'main') {
                    const transferToQueueMessage = {
                      reciepientAddress: vendor.address,
                      senderAddress: buyer.address,
                      senderPass: buyer.privateKey,
                      amount: sum,
                      transaction: transaction.uuid
                    };

                    transferToQueue.send(
                      new Message(transferToQueueMessage, {
                        contentType: 'application/json'
                      })
                    );
                  }
                  Response.setSuccess(200, 'Transfer Initiated');
                  return Response.send(res);
                });
            });
          } catch (error) {
            Response.setError(500, error.message);
            return Response.send(res);
          }
        }
      } else {
        Response.setError(400, 'No Item in Cart');
        return Response.send(res);
      }
    }
  }

  static async setAccountPin(req, res) {
    try {
      if (req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN already set. Chnage PIN or contact support.'
        );
        return Response.send(res);
      }
      const pin = createHash(req.body.pin.trim());
      await UserService.update(req.user.id, {
        pin
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'PIN set successfully.');
      return Response.send(res);
    } catch (error) {
      console.log('setAccountPin', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'PIN update failed..'
      );
      return Response.send(res);
    }
  }

  static async updateAccountPin(req, res) {
    try {
      if (!req.user.pin) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'PIN not found. Set PIN first.'
        );
        return Response.send(res);
      }

      if (!compareHash(req.body.old_pin, req.user.pin)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid or wrong old PIN.'
        );
        return Response.send(res);
      }
      const pin = createHash(req.body.new_pin);
      await UserService.update(req.user.id, {
        pin
      });
      Response.setSuccess(
        HttpStatusCode.STATUS_OK,
        'PIN changed successfully.'
      );
      return Response.send(res);
    } catch (error) {
      console.log('updateAccountPin', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'PIN update failed..'
      );
      return Response.send(res);
    }
  }

  static async beneficiaryWithdrawFromBankAccount(req, res) {
    const {amount, campaignId, accountno} = req.params;
    try {
      if (!Number(amount)) {
        Response.setError(400, 'Please input a valid amount');
        return Response.send(res);
      } else if (!Number(campaignId)) {
        Response.setError(400, 'Please input a valid campaign ID');
        return Response.send(res);
      } else if (!Number(accountno)) {
        Response.setError(400, 'Please input a valid campaign ID');
        return Response.send(res);
      }
      const bankAccount = await db.BankAccount.findOne({
        where: {UserId: req.user.id, account_number: accountno}
      });
      const userWallet = await WalletService.findUserCampaignWallet(
        req.user.id,
        campaignId
      );
      const campaignWallet = await WalletService.findSingleWallet({
        CampaignId: campaignId,
        UserId: null
      });
      if (!bankAccount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          "User Dos'nt Have a Bank Account"
        );
        return Response.send(res);
      }
      if (!userWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'User Wallet Not Found'
        );
        return Response.send(res);
      }
      if (!campaignWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Campaign Wallet Not Found'
        );
        return Response.send(res);
      }
      if (!userWallet.balance > campaignWallet.balance) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'Insufficient Fund'
        );
        return Response.send(res);
      }
      if (userWallet.balance < amount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Insufficient Wallet Balance'
        );
        return Response.send(res);
      }

      await QueueService.fundBeneficiaryBankAccount(
        bankAccount,
        campaignWallet,
        userWallet,
        req.user.id,
        amount
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Processing'
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }

  static async vendorWithdrawFromBankAccount(req, res) {
    const {amount, accountno} = req.params;
    try {
      if (!Number(amount)) {
        Response.setError(400, 'Please input a valid amount');
        return Response.send(res);
      }
      if (!Number(accountno)) {
        Response.setError(400, 'Please input a valid account number');
        return Response.send(res);
      }
      const bankAccount = await db.BankAccount.findOne({
        where: {UserId: req.user.id, account_number: accountno}
      });
      const userWallet = await db.Wallet.findOne({
        where: {UserId: req.user.id}
      });

      if (!bankAccount) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          "User Dos'nt Have a Bank Account"
        );
        return Response.send(res);
      }
      if (!userWallet) {
        Response.setSuccess(
          HttpStatusCode.STATUS_RESOURCE_NOT_FOUND,
          'User Wallet Not Found'
        );
        return Response.send(res);
      }
      // if (userWallet.balance < amount) {
      //   Response.setSuccess(
      //     HttpStatusCode.STATUS_BAD_REQUEST,
      //     'Insufficient Wallet Balance'
      //   );
      //   return Response.send(res);
      // }
      await QueueService.fundVendorBankAccount(
        bankAccount,
        userWallet,
        req.user.id,
        amount
      );
      Response.setSuccess(
        HttpStatusCode.STATUS_CREATED,
        'Transaction Processing'
      );
      return Response.send(res);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error. Please try again later.' + error
      );
      return Response.send(res);
    }
  }

  static async createTicket(req, res) {
    const {email, subject, phone, description} = req.body;
    // const rules = {
    //     subject: "required|alpha",
    //     description: "required|alpha",
    //     phone: ['required','regex:/^([0|\+[0-9]{1,5})?([7-9][0-9]{9})$/'],
    //     email: 'email|required',
    // }

    try {
      // const validation = new Validator(req.body, rules);
      // if (validation.fails()) {
      //   Response.setError(422, validation.errors);
      //   return Response.send(res);
      // } else {

      const crypto = await AwsUploadService.encrypt('jibril');
      console.log(crypto);
    } catch (error) {
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Internal server error' + error
      );
      return Response.send(res);
    }
  }

  static async changePassword(req, res) {
    try {
      const user = req.user;
      const {old_password, new_password} = SanitizeObject(req.body, [
        'old_password',
        'new_password'
      ]);

      if (!compareHash(old_password, user.password)) {
        Response.setError(
          HttpStatusCode.STATUS_BAD_REQUEST,
          'Invalid old password'
        );
        return Response.send(res);
      }

      const password = createHash(new_password);
      await UserService.update(user.id, {
        password
      });
      Response.setSuccess(HttpStatusCode.STATUS_OK, 'Password changed.');
      return Response.send(res);
    } catch (error) {
      console.log('ChangePassword', error);
      Response.setError(
        HttpStatusCode.STATUS_INTERNAL_SERVER_ERROR,
        'Password update failed. Please retry.'
      );
      return Response.send(res);
    }
  }
}

function getDifference(dob) {
  today = new Date();
  past = new Date(dob); // remember this is equivalent to 06 01 2010
  //dates in js are counted from 0, so 05 is june
  var diff = Math.floor(today.getTime() - dob.getTime());
  var day = 1000 * 60 * 60 * 24;

  var days = Math.floor(diff / day);
  var months = Math.floor(days / 31);
  var years = Math.floor(months / 12);

  return years;
}

module.exports = UsersController;
