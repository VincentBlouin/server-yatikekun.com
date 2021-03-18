const config = require('../config');
config.setEnvironment('test');
const {Users, Offers, Transactions} = require('../model');
const jwt = require('jsonwebtoken');

function jwtSignUser(user) {
    const ONE_WEEK = 60 * 60 * 24 * 7;
    return jwt.sign(user, config.getConfig().authentication.jwtSecret, {
        expiresIn: ONE_WEEK
    })
}

const TestUtil = {};

TestUtil.signIn = async function (email) {
    email = typeof email === "string" ? email : "u@sel.org";
    const user = await TestUtil.getUserByEmail(email)
    user.token = jwtSignUser(user.toJSON());
    return user;
};

TestUtil.getUserByEmail = function (email) {
    return Users.findOne({
        where: {
            email: email
        }
    });
}

TestUtil.getOfferByTitle = function (title) {
    return Offers.findOne({
        where: {
            title_fr: title
        }
    });
};

TestUtil.listTransactionsForUserId = function (userId) {
    return Transactions.findAll({
        include: [
            {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
            {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
            {model: Users, as: 'receiver', attributes: Users.getFewAttributes()}
        ],
        where: {
            $or: [
                {
                    GiverId: userId

                },
                {
                    ReceiverId: userId
                },
            ]
        },
        order: [['createdAt', 'DESC']]
    });
};

module.exports = TestUtil;
