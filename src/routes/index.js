const express = require('express')
const router = express.Router()
const AuthenticationController = require('../controller/AuthenticationController')

const AuthenticationControllerPolicy = require('../policy/AuthenticationControllerPolicy')

// const UserController = require('../controller/UserController')
//
// const TransactionController = require('../controller/TransactionController')
//
// const ProductController = require('../controller/ProductController')

const isAuthenticated = require('../policy/isAuthenticated')
// const isOwnerOrAdmin = require('../policy/isOwnerOrAdmin')
// const isArdoiseUser = require('../policy/isArdoiseUser')
// const isOwnerArdoiseUserOrAdmin = require('../policy/isOwnerArdoiseUserOrAdmin')
const isAdmin = require('../policy/isAdmin')

// router.post(
//   '/api/register',
//   AuthenticationControllerPolicy.register,
//   AuthenticationController.register
// )

router.post(
    '/api/login',
    AuthenticationController.login
)

router.post(
    '/api/register',
    AuthenticationController.register
)

router.post(
    '/api/reset-password',
    AuthenticationController.resetPassword
)

router.post(
    '/api/token-valid',
    AuthenticationController.isTokenValid
)

router.post(
    '/api/change-password',
    AuthenticationController.changePassword
)

module.exports = router
