const express = require('express');
const router = express.Router();
const controller = require('./facilities.controller');
const { createFacilitySchema, updateFacilitySchema } = require('./facilities.validation');
const validate = require('../../middlewares/validate.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public GET routes
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Protected routes
router.use(authMiddleware);

router.post('/', checkPermission('facilities.create'), validate(createFacilitySchema), controller.create);
router.put('/:id', checkPermission('facilities.update'), validate(updateFacilitySchema), controller.update);
router.delete('/:id', checkPermission('facilities.delete'), controller.remove);
router.patch('/:id/status', checkPermission('facilities.update'), controller.toggleStatus);

module.exports = router;
