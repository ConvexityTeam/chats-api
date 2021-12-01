

const { OrderController } = require("../controllers");
const {
  Auth
} = require("../middleware");
const router = require("express").Router();
const { ParamValidator } = require("../validators");

router.route('/:reference')
  .get(
    Auth,
    ParamValidator.Reference,
    OrderController.getOrderByReference
  );