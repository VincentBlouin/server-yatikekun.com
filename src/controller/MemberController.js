const {Users} = require('../model')

module.exports = {
    list(req, res) {
        return Users.findAll({
            attributes: [
                "id",
                "firstname",
                "lastname",
                "email",
                "status",
                "locale"
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        }).then((offers) => {
            res.send(offers);
        })
    },
}