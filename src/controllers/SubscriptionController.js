require('dotenv').config();
const { Subscriptions } = require('../models');

class SubscriptionController {
  static async createSubscriptions(req, res) {
    try {
      const plan = await Subscriptions.create(req.body);
      res.status(201).json(plan);
    } catch (err) {
      res.status(400).json(err);
    }
  }

  static async getAllSubscriptions(req, res) {
    try {
      const subscriptions = await Subscriptions.getAllSubscriptions();
      res.status(200).json(subscriptions);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = SubscriptionController;
