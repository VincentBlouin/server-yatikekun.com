const config = require('../config');
config.setEnvironment('development');
const Promise = require('bluebird');

const {
    sequelize,
    Users
} = require('../model')

const users = require('./Users.json')

module.exports = {
    run: function () {
        return sequelize.sync({force: true})
            .then(() => {
                return Promise.all(
                    users.map(user => {
                        return Users.create(user)
                    })
                )
            }).catch(function (err) {
                console.log(err)
            })
    }
}
