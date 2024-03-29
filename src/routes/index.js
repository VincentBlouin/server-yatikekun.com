const express = require('express')
const router = express.Router()
const AuthenticationController = require('../controller/AuthenticationController')

const AuthenticationControllerPolicy = require('../policy/AuthenticationControllerPolicy')

// const UserController = require('../controller/UserController')
//
const TransactionController = require('../controller/TransactionController')
const OfferController = require('../controller/OfferController')
const MemberController = require('../controller/MemberController')
const OrganisationController = require('../controller/OrganisationController')
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
    '/login/facebook',
    AuthenticationController.facebookLogin
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
    '/offer/offset/:offset',
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
    '/offer/user/:userUuid',
    isAuthenticated,
    OfferController.listForUser
)

router.get(
    '/offer/available/user/:userUuid',
    isAuthenticated,
    OfferController.listAvailableForUser
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

router.post(
    '/offer/search',
    isAuthenticated,
    OfferController.search
)

router.get(
    '/offer/search/indexAll',
    OfferController.indexAllOffers
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
    '/member/count',
    isAdmin,
    MemberController.getNbMembers
)

router.get(
    '/member/members-of-hg-not-of-partageheure',
    isAdmin,
    MemberController.membersOfHgNotOfPartageHeure
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
    '/organisation',
    isAuthenticated,
    OrganisationController.list
)

router.get(
    '/organisation/active-for-transactions',
    isAuthenticated,
    OrganisationController.listActiveForTransactions
)

router.get(
    '/organisation/:organisationId',
    isAdmin,
    OrganisationController.get
)

router.post(
    '/organisation',
    isAdmin,
    OrganisationController.createOrganisation
)

router.post(
    '/organisation/image',
    isAdmin,
    OrganisationController.uploadImage
)

router.put(
    '/organisation/:organisationId',
    isAdmin,
    OrganisationController.updateOrganisation
)

router.get(
    '/transaction/user/:userId',
    isAuthenticated,
    TransactionController.list
)
router.get(
    '/transaction/org/:orgId',
    isAdmin,
    TransactionController.listForOrg
)

router.get(
    '/transaction/recalculate',
    TransactionController.recalculate
)

router.get(
    '/transaction/toutes',
    isAdmin,
    TransactionController.listAll
)

router.get(
    '/transaction/nbTransactionsBetweenMembers',
    isAdmin,
    TransactionController.getNbTransactionsBetweenMembers
)

router.get(
    '/transaction/nbMembersInvolvedInTransactions',
    isAdmin,
    TransactionController.getNbMembersInvolvedInTransactions
)

router.get(
    '/transaction/:transactionId',
    isAuthenticated,
    TransactionController.getOne
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
    '/transaction/:transactionId/giver-org/:orgId',
    isAuthenticated,
    TransactionController.setGiverOrg
)

router.post(
    '/transaction/:transactionId/receiver-org/:orgId',
    isAuthenticated,
    TransactionController.setReceiverOrg
)

router.post(
    '/transaction/:transactionId/refuse',
    isAuthenticated,
    TransactionController.refuse
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
    '/transaction/pending/user/:userId',
    isAuthenticated,
    TransactionController.getAllPendingOffersOfUser
)

module.exports = router
