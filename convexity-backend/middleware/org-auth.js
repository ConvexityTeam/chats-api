const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decodedToken.userId;
        const OrganisationId = decodedToken.OrganisationId;
        const RoleId = decodedToken.RoleId;
        // console.log(OrganisationId);
        req.body.UserId = userId;
        req.body.OrganisationId = OrganisationId;
        if (req.body.UserId && req.body.UserId != userId) {
            throw 'Invalid User Id';
        } else {
            if (RoleId) {
                //cannot validate the admin(1) roleId as a result of language construct bug
                // if (RoleId != 3 || RoleId !== '1') { // if not an organisation or admmin
                if (RoleId != 3) { // if not an organisation or admmin
                    throw 'Access Denied, UnAuthorised Access';
                } else {
                    next();
                }
            } else {
                throw 'Access Denied';
            }
        }


    } catch (error) {
        res.status(419).json({
            error: error,
        });
    }
};
