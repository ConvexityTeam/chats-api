"use strict";
var _a;
exports.__esModule = true;
var amqp_1 = require("./Connection");
const db = require("./../../models");
const ninVerification = require("./../../controllers/NinController");
var queue = amqp_1["default"].declareQueue("nin_verification", {
  durable: true,
  prefetch: 1,
});

amqp_1["default"]
  .completeConfiguration()
  .then(function () {
    queue
      .activateConsumer(async function (msg) {
        let content = msg.getContent();
        let user = await db.User.findByPk(content.id);

        ninVerification(user)
          .then(async (response) => {
            if (response.message == "norecord") {
              await user.update({ status: "suspended" });
            } else if (response.message == "Success") {
              let data = response[0].demoData[0];
              let names = [
                String(data.firstname).toLowerCase(),
                String(data.surname).toLowerCase(),
              ];
              if (
                names.includes(String(user.first_name).toLowerCase()) &&
                names.includes(String(user.last_name).toLowerCase())
              ) {
                await user.update({ status: "activated" });
                console.log("User Activated");
              } else {
                await user.update({ status: "suspended" });
              }
              msg.ack();
              console.log("Concluded");
            }
          })
          .catch((error) => {
            msg.nack();
          });
      })
      .then(function () {
        return console.log("Running consumer");
      })
      ["catch"](function (err) {
        return console.error(err);
      });
  })
  ["catch"](function (err) {
    return console.error(err);
  });
