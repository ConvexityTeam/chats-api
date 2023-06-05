class PlansController {
  static async createPlan(req, res) {
    try {
      const plan = await Plan.create(req.body);
      res.status(201).json(plan);
    } catch (err) {
      res.status(400).json(err);
    }
  }

  static async getPlans(req, res) {
    try {
      const plans = await Plan.find();
      res.status(200).json(plans);
    } catch (err) {
      res.status(400).json(err);
    }
  }
  static async getPlan(req, res) {
    try {
      const plan = await Plan.findById(req.params.id);
      res.status(200).json(plan);
    } catch (err) {
      res.status(400).json(err);
    }
  }
  static async updatePlan(req, res){
    try {
      const plan = await Plan.findByIdAndUpdate(req.params.id, req.body);
      res.status(200).json(plan);
    } catch (err) {
      res.status(400).json(err);
    }
  }
  static async deletePlan(req, res){
    try {
      const plan = await Plan.findByIdAndDelete(req.params.id);
      res.status(200).json(plan);
    } catch (err) {
      res.status(400).json(err);
    }
  }
}

module.exports = PlansController;
