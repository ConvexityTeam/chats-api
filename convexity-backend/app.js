require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const util = require("./libs/Utils");

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//Routers link
const usersRoute = require("./routers/users");
const transactionRouter = require("./routers/transaction");
const authRouter = require("./routers/auth");
const campaignRouter = require("./routers/campaign");
const rolesRouter = require("./routers/role");
const ngoAuthRouter = require("./routers/ngo-auth");
const ngosRouter = require("./routers/ngo");
const vendorsAuthRouter = require("./routers/vendors-auth");
const vendorsRouter = require("./routers/vendors");
const beneficiariesRouter = require("./routers/beneficiaries");
const cashforworkRouter = require("./routers/cash-for-work");
const organisationRouter = require("./routers/organisation");
const adminRouter = require("./routers/admin");

// Routing endpoint
app.get("/", (req, res) => {
  try {
    const pass = util.generatePassword(200);
    util.setSuccess(200, "Welcome to CHATS App " + pass, pass);
    return util.send(res);
  } catch (error) {
    util.setSuccess(500, "Internal Server Error " + error.toString());
    return util.send(res);
  }
});

app.use("/v1/users", usersRoute);
app.use("/v1/transactions", transactionRouter);
app.use("/v1/auth", authRouter);
app.use("/v1/campaigns", campaignRouter);
app.use("/v1/roles", rolesRouter);
app.use("/v1/ngo/auth", ngoAuthRouter);
app.use("/v1/ngos", ngosRouter);
app.use("/v1/vendors", vendorsRouter);
app.use("/v1/vendors/auth", vendorsAuthRouter);
app.use("/v1/beneficiaries", beneficiariesRouter);
app.use("/v1/cash-for-work", cashforworkRouter);
app.use("/v1/organisation", organisationRouter);
app.use("/v1/admin", adminRouter);

// when a fage route is requested
app.get("*", (req, res) => {
  try {
    const pass = util.generatePassword(200);
    util.setSuccess(200, "Welcome to CHATS App " + pass);
    return util.send(res);
  } catch (error) {
    util.setSuccess(500, "Internal Server Error " + error.toString());
    return util.send(res);
  }
});
module.exports = app;
