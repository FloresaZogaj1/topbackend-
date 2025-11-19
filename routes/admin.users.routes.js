// routes/admin.users.routes.js
const express = require('express');
const router = express.Router();
const userCtrl = require('../controllers/user.controller');

function mustBeFn(fn, name) {
  if (typeof fn !== 'function') {
    console.error(`[AdminUsersRoutes] "${name}" must be a function. Got:`, typeof fn, fn);
    throw new TypeError(`argument handler must be a function: ${name}`);
  }
  return fn;
}

router.get('/users', mustBeFn(userCtrl.getAllUsers, 'getAllUsers'));
router.get('/users/:id', mustBeFn(userCtrl.getUserById, 'getUserById'));
router.put('/users/:id/role', mustBeFn(userCtrl.updateUserRole, 'updateUserRole'));
router.put('/users/:id', mustBeFn(userCtrl.updateUser, 'updateUser'));
router.delete('/users/:id', mustBeFn(userCtrl.deleteUser, 'deleteUser'));

module.exports = router;
