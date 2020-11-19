const {Users} = require('../model')
const uuid = require('uuid')
module.exports = {
    list(req, res) {
        return Users.findAll({
            attributes: [
                "uuid",
                "firstname",
                "lastname",
                "email",
                "status",
                "locale",
                "subRegion",
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
        member.uuid = uuid();
        member.status = "member";
        member.region = "BDC";
        member = await Users.create(
            member
        );
        res.send(member);
    },
    async get(req, res) {
        const memberId = req.params['memberId']
        const member = await Users.findOne({
            attributes: Users.getSafeAttributes(),
            where: {
                uuid: memberId
            }
        });
        res.send(member);
    },
}