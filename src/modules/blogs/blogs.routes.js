const express = require('express');
const router = express.Router();
const controller = require('./blogs.controller');
const { createBlogSchema, updateBlogSchema } = require('./blogs.validation');
const validate = require('../../middlewares/validate.middleware');
const checkPermission = require('../../middlewares/permission.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

// Public GET routes
router.get('/', controller.getAll);
router.get('/:id', controller.getById);

// Protected routes
router.use(authMiddleware);

router.post('/', checkPermission('blogs.create'), validate(createBlogSchema), controller.create);
router.put('/:id', checkPermission('blogs.update'), validate(updateBlogSchema), controller.update);
router.delete('/:id', checkPermission('blogs.delete'), controller.remove);
router.patch('/:id/status', checkPermission('blogs.update'), controller.toggleStatus);

module.exports = router;
