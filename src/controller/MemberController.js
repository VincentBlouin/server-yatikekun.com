const {Users, Transactions} = require('../model')
const uuid = require('uuid');
const AuthenticationController = require('./AuthenticationController')
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
        let member = req.body;
        member.email = member.email.toLowerCase();
        delete member.password;
        let user = await Users.findOne({
            where: {
                email: member.email
            }
        });
        if (user) {
            return res.status(403).send({
                error: 'Register information is incorrect'
            })
        }
        member.uuid = uuid();
        member.region = "BDC";
        member = await Users.create(
            member
        );
        await MemberController._createInitialTransactionForMemberId(member.id);
        const passwordToken = await AuthenticationController._resetPassword(member.email);
        res.send({
            passwordToken: passwordToken
        });
    },
    async get(req, res) {
        const memberUuid = req.params['memberId']
        if (req.user.status !== 'admin' && req.user.uuid !== memberUuid) {
            return res.send(401);
        }
        const member = await Users.findOne({
            attributes: Users.getSafeAttributes(),
            where: {
                uuid: memberUuid
            }
        });
        res.send(member);
    },
    async updateMember(req, res) {
        let member = req.body;
        if (member.id !== req.user.id && req.user.status !== 'admin') {
            return res.send(403);
        }
        if (req.user.status !== 'admin') {
            member.status = "member"
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
            address: member.address,
            status: member.status
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
            GiverId: memberId,
            confirmDate: new Date(),
            status: "CONFIRMED",
            balanceGiver: 5
        });
    }
};
module.exports = MemberController;