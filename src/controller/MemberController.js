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
    async updateMember(req, res) {
        let member = req.body;
        if (member.id !== req.user.id && req.user.status !== 'admin') {
            return res.send(403);
        }
        member = await Users.update({
            firstname: member.firstname,
            lastname: member.lastname,
            email: member.email,
            facebookId: member.facebookId,
            subRegion: member.subRegion,
            phone1: member.phone1,
            phone2: member.phone2,
            gender: member.gender,
            address: member.address
        }, {
            where: {
                id: member.id,
                uuid: req.params.uuid
            }
        });
        res.send(member);
    },
}