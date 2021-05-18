const passport = require('passport')
const {Users} = require('../model')
module.exports = function (req, res, next) {
    passport.authenticate('jwt', async function (err, user) {
        if (err || !user) {
            res.status(401).send({
                error: 'you do not have access to this resource'
            })
        }
        const userForStatus = await Users.findOne({
            attributes: ['status'],
            where: {
                uuid: user.uuid
            }
        });
        if (userForStatus.status === 'disabled') {
            res.status(401).send({
                error: 'you do not have access to this resource'
            })
        } else {
            req.user = user
            next()
        }
    })(req, res, next)
}
