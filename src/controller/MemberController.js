const { Users, Transactions } = require('../model')
const uuid = require('uuid')
const MemberController = {
    async list(req, res) {
        let attributes = [
            "uuid",
            "firstname",
            "lastname"
        ];
        if (req.user.status === 'admin') {
            attributes = attributes.concat([
                "email",
                "status",
                "locale",
                "subRegion"
            ])
        }
        let offers = await Users.findAll({
            attributes: attributes,
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.send(offers);
    },
    async createMember(req, res) {
        let member = req.body
        member.uuid = uuid();
        member.status = "member";
        member.region = "BDC";
        member = await Users.create(
            member
        );
        await MemberController._createInitialTransactionForMemberId(member.id);
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
    async _createInitialTransactionForMemberId(memberId) {
        await Transactions.create({
            amount: 5,
            details: "initial",
            ReceiverId: memberId,
            confirmDate: new Date().getTime(),
            status: "CONFIRMED",
            balanceReceiver: 5
        });
    }
};
module.exports = MemberController;