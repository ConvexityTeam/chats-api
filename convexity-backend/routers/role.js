const express = require('express');
const router = express.Router();
const RolesController = require('../controllers/RolesController');
const e2e = require('../middleware/e2e'); //End2End Encryption middleware
router.use(e2e);

router.get('/', RolesController.getAllRoles);
router.post('/', RolesController.addRole);
router.get('/:id', RolesController.getARole);
router.put('/:id', RolesController.updatedRole);
router.delete('/:id', RolesController.deleteRole);

module.exports = router;