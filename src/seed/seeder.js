const config = require('../config');
config.setEnvironment('development');
const Promise = require('bluebird');

const {
    sequelize,
    Users,
    Offers
} = require('../model')

const users = require('./Users.json')
const offers = require('./Offers.json')
const MemberController = require("../controller/MemberController")

module.exports = {
    run: function () {
        return sequelize.sync({force: true})
            .then(() => {
                return Promise.all(
                    users.map(user => {
                        return Users.create(user).then((newUser) => {
                            return MemberController._createInitialTransactionForMemberId(newUser.id)
                        });
                    })
                )
            })
            .then(() => {
                return Promise.all(
                    offers.map(offer => {
                        offer.isAvailable = true;
                        return Offers.create(offer)
                    })
                )
            })
            .catch(function (err) {
                console.log(err)
            })
    }
}
