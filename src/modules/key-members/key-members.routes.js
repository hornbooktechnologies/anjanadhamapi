const express = require('express');
const router = express.Router();
const controller = require('./key-members.controller');
const { createKeyMemberSchema, updateKeyMemberSchema } = require('./key-members.validation');
const validate = require('../../middlewares/validate.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public GET routes
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Protected routes
router.use(authMiddleware);

router.post('/', checkPermission('key_members.create'), validate(createKeyMemberSchema), controller.create);
router.put('/:id', checkPermission('key_members.update'), validate(updateKeyMemberSchema), controller.update);
router.delete('/:id', checkPermission('key_members.delete'), controller.remove);
router.patch('/:id/status', checkPermission('key_members.update'), controller.toggleStatus);

module.exports = router;
