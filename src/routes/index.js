const express = require('express')
const router = express.Router()
const AuthenticationController = require('../controller/AuthenticationController')

const AuthenticationControllerPolicy = require('../policy/AuthenticationControllerPolicy')

// const UserController = require('../controller/UserController')
//
const TransactionController = require('../controller/TransactionController')
const OfferController = require('../controller/OfferController')
const MemberController = require('../controller/MemberController')

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
    '/login',
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

router.get(
    '/offer',
    isAuthenticated,
    OfferController.list
)

router.post(
    '/offer',
    isAuthenticated,
    OfferController.createOffer
)

router.post(
    '/offer/image',
    isAuthenticated,
    OfferController.uploadImage
)

router.get(
    '/offer/:offerId',
    isAuthenticated,
    OfferController.get
)

router.get(
    '/offer/image/:uuid',
    OfferController.getImage
)

router.put(
    '/offer/:offerId',
    isAuthenticated,
    OfferController.updateOffer
)

router.get(
    '/member',
    isAuthenticated,
    MemberController.list
)

router.post(
    '/member',
    isAdmin,
    MemberController.createMember
)

router.get(
    '/member/:memberId',
    isAdmin,
    MemberController.get
)

router.put(
    '/member/:uuid',
    isAuthenticated,
    MemberController.updateMember
)

router.get(
    '/transaction/user/:userId',
    isAuthenticated,
    TransactionController.list
)

router.post(
    '/transaction',
    isAuthenticated,
    TransactionController.addTransaction
)

router.post(
    '/transaction/:transactionId/confirm',
    isAuthenticated,
    TransactionController.confirm
)

router.post(
    '/transaction/token',
    TransactionController.confirmWithToken
)

router.get(
    '/transaction/pending/user/:userId/offer/:offerId',
    isAuthenticated,
    TransactionController.pendingTransactionOfOffer
)

module.exports = router
