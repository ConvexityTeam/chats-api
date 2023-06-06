class SubscriptionsControllers {
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
      const Subscriptions = await Subscriptions.getAllSubscriptions();
    } catch (error) {
      console.log(error);
    }
  }
  static async getSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
  static async getSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
  static async updateSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
  static async deleteSubscriptions(req, res) {
    try {
    } catch (error) {}
  }
}
