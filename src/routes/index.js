const express = require('express')
const config = require('../config')
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
    '/reset-password',
    AuthenticationController.resetPassword
)

router.post(
    '/token-valid',
    AuthenticationController.isTokenValid
)

router.post(
    '/change-password',
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
    '/offer/user/:userId',
    isAuthenticated,
    OfferController.listForUser
)

router.get(
    '/offer/image/:uuid',
    OfferController.getImage
)

router.get(
    '/offer/image/:uuid/medium',
    OfferController.getMediumImage
)

router.get(
    '/offer/:offerId/image',
    OfferController.getImageByOfferId
)

router.put(
    '/offer/:offerId',
    isAuthenticated,
    OfferController.updateOffer
)

router.delete(
    '/offer/:offerId',
    isAuthenticated,
    OfferController.removeOffer
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
    isAuthenticated,
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

router.delete(
    '/transaction/:transactionId',
    isAdmin,
    TransactionController.removeTransaction
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

router.get(
    '/transaction/recalculate',
    TransactionController.recalculate
)

module.exports = router
