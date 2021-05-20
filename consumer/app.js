let express = require('express');
var cors = require('cors');
let app = express();
const path = require('path');
const util = require('./libs/Utils');

app.use(cors());
const helmet = require('helmet');
const morgan = require('morgan');
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// for parsing application/xwww-
app.use(express.urlencoded({ extended: true }));

//Routers link
const usersRoute = require('./routers/users');
const transactionRouter = require('./routers/transaction');
const authRouter = require('./routers/auth');
const campaignRouter = require('./routers/campaign');
const rolesRouter = require('./routers/role');
const ngoAuthRouter = require('./routers/ngo-auth');
const ngosRouter = require('./routers/ngo');
const vendorsAuthRouter = require('./routers/vendors-auth');
const vendorsRouter = require('./routers/vendors');
const beneficiariesRouter = require('./routers/beneficiaries');
const cashforworkRouter = require('./routers/cash-for-work');
const organisationRouter = require('./routers/organisation');

// Routing endpoint
app.get('/', (req, res) => {
    try {
        const pass = util.generatePassword(200);
        util.setSuccess(200, 'Welcome to CHATS App ' + pass, pass);
        return util.send(res);
    } catch (error) {
        util.setSuccess(500, 'Internal Server Error ' + error.toString());
        return util.send(res);
    }
});


app.use('/api/v1/users', usersRoute);
app.use('/api/v1/transactions', transactionRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/campaigns', campaignRouter);
app.use('/api/v1/roles', rolesRouter);
app.use('/api/v1/ngo/auth', ngoAuthRouter);
app.use('/api/v1/ngos', ngosRouter);
app.use('/api/v1/vendors', vendorsRouter);
app.use('/api/v1/vendors/auth', vendorsAuthRouter);
app.use('/api/v1/beneficiaries', beneficiariesRouter);
app.use('/api/v1/cash-for-work', cashforworkRouter);
app.use('/api/v1/organisation', organisationRouter);

// when a fage route is requested
app.get('*', (req, res) => {
    try {
        const pass = util.generatePassword(200);
        // console.log(pass);
        util.setSuccess(200, 'Welcome to CHATS App ' + pass);
        return util.send(res);
    } catch (error) {
        util.setSuccess(500, 'Internal Server Error ' + error.toString());
        return util.send(res);
    }
});
module.exports = app;
