const database = require('../models')
const formidable = require("formidable")
require('dotenv').config();

module.exports = async (req, res, next) => {
  try {
    const data = req.body
    if (data.organisation_id) {
      const organisation_exist = await database.Organisations.findOne({ where: { id: data.organisation_id } })
      if (organisation_exist) {
        req.organisation = organisation_exist
        const member = await database.OrganisationMembers.findOne({ where: { UserId: req.user.id, OrganisationId: data.organisation_id } })
        if (!member) {
          return res.status(401).json({ error: 'Unauthorised, User is not a Member of the company' })
        } else {
          req.member = member
        }
      } else {
        return res.status(401).json({ error: 'Invalid Organisation Id' })
      }
    } else {
      const form = new formidable.IncomingForm()
      form.parse(req, async (err, fields, files) => {
        if (fields.organisation_id) {
          const organisation = fields.organisation_id
          const organisation_exist = await database.Organisations.findOne({ where: { id: organisation } })
          if (organisation_exist) {
            req.organisation = organisation_exist
            const member = await database.OrganisationMembers.findOne({ where: { UserId: req.user.id, OrganisationId: organisation } })
            if (!member) {
              return res.status(401).json({ error: 'Unauthorised, User is not a Member of the company' })
            } else {
              req.member = member
            }
          } else {
            return res.status(401).json({ error: 'Invalid Organisation Id' })
          }
        }
      })
    }
    next()


  } catch (error) {
    res.status(401).json({
      error: error.message,
    });
  }
};
