const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
        const userId = decodedToken.userId;
        const OrganisationId = decodedToken.OrganisationId;
        // console.log(process.env.SECRET_KEY);
        req.body.UserId = userId;
        req.body.OrganisationId = OrganisationId;
        if (req.body.UserId && req.body.UserId != userId) {
            throw 'Invalid User Id';
        } else {
            next();
        }
    } catch (error) {
        res.status(401).json({
            error: error,
        });
    }
};
