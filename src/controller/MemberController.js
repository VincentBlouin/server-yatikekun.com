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
                "locale",
                "subRegion"
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        }).then((offers) => {
            res.send(offers);
        })
    },
    async createMember(req, res) {
        let member = req.body
        member.status = "member";
        member.region = "BDC";
        member = await Users.create(
            member
        );
        res.send(member);
    }
}