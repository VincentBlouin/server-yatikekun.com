const {Users, Transactions} = require('../model')
const uuid = require('uuid');
const AuthenticationController = require('./AuthenticationController')
const TransactionController = require('./TransactionController')
const config = require("../config")
const {google} = require('googleapis');
const GOOGLE_CREDENTIALS_FILE_PATH = config.getConfig().googleCredentialsFilePath;
const GOOGLE_API_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const EMAIL_ROW_INDEX = 4;
const DOES_NOT_WANT_MEMBERSHIP_INDEX = 19;

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
                "subRegion",
                "id"
            ])
        }
        let members = await Users.findAll({
            attributes: attributes,
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.send(members);
    },
    async createMember(req, res) {
        if (req.user.status !== 'admin') {
            return res.send(401);
        }
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
        if (member.orgIdGotBonusForSubscription !== null) {
            await MemberController._applyOrgBonusTransaction(
                member.id,
                member.orgIdGotBonusForSubscription
            );
        }
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
        let attributes = Users.getSafeAttributes();
        if (req.user.status === 'admin') {
            attributes = attributes.concat([
                "AdminUserId"
            ]);
        }
        const member = await Users.findOne({
            attributes: attributes,
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
        const updateInfo = {
            firstname: member.firstname,
            lastname: member.lastname,
            email: member.email,
            facebookId: member.facebookId,
            subRegion: member.subRegion,
            phone1: member.phone1,
            phone2: member.phone2,
            pronoun: member.pronoun,
            address: member.address,
            contactByEmail: member.contactByEmail,
            contactByMessenger: member.contactByMessenger,
            contactByPhone: member.contactByPhone,
            preferredCommunication: member.preferredCommunication,
            language: member.language,
            orgIdGotBonusForSubscription: member.orgIdGotBonusForSubscription
        };
        if (req.user.status === 'admin') {
            updateInfo.status = member.status;
            updateInfo.OrganisationId = member.OrganisationId;
            updateInfo.AdminUserId = member.AdminUserId;
            if (updateInfo.orgIdGotBonusForSubscription !== null && updateInfo.orgIdGotBonusForSubscription !== undefined) {
                member = await Users.find({
                    attributes: ['id', 'orgIdGotBonusForSubscription'],
                    where: {
                        id: member.id,
                        uuid: req.params.uuid
                    }
                });
                if (member.orgIdGotBonusForSubscription !== parseInt(updateInfo.orgIdGotBonusForSubscription)) {
                    await MemberController._applyOrgBonusTransaction(
                        member.id, updateInfo.orgIdGotBonusForSubscription
                    );
                }
            }
        }
        await Users.update(
            updateInfo,
            {
                where: {
                    id: member.id,
                    uuid: req.params.uuid
                }
            });
        res.sendStatus(200);
    },
    async getNbMembers(req, res) {
        const nbMembers = await Users.count();
        //remove one member who is the facebook user test
        res.send({
            'nbMembers': nbMembers - 1
        });
    },
    async membersOfHgNotOfPartageHeure(req, res) {
        const usersOfPartageHeure = await Users.findAll({
            attributes: ['email']
        });
        const sheets = MemberController._buildSheetsApi();
        const membersNotInPartageheure = await new Promise((resolve) => {
            sheets.spreadsheets.values.get({
                spreadsheetId: config.getConfig().spreadSheetId,
                range: 'A2:T',
            }, (err, sheetsRes) => {
                if (err) return console.log('The API returned an error: ' + err);
                const rows = sheetsRes.data.values;
                const membersNotInPartageheure = rows.filter((row) => {
                    let email = row[EMAIL_ROW_INDEX];
                    email = email.trim().toLowerCase();
                    const wantsToBeMember = row[DOES_NOT_WANT_MEMBERSHIP_INDEX] === undefined || row[DOES_NOT_WANT_MEMBERSHIP_INDEX].trim() !== "oui";
                    return wantsToBeMember && usersOfPartageHeure.every((user) => {
                        return user.email !== email;
                    })
                }).map((row) => {
                    let email = row[EMAIL_ROW_INDEX];
                    email = email.trim().toLowerCase();
                    return {
                        firstname: row[1],
                        lastname: row[2],
                        email: email
                    }
                });
                resolve(membersNotInPartageheure);
            });
        });
        res.send(membersNotInPartageheure);
    },
    _buildSheetsApi: function () {
        const auth = new google.auth.GoogleAuth({
            keyFile: GOOGLE_CREDENTIALS_FILE_PATH,
            scopes: GOOGLE_API_SCOPES,
        });
        return google.sheets({version: 'v4', auth});
    },
    async _applyOrgBonusTransaction(memberId, orgId) {
        const newTransaction = await Transactions.create({
            amount: 1,
            details: "Inscription d'un nouveau membre",
            status: "PENDING",
            InitiatorOrgId: orgId,
            GiverOrgId: orgId,
            ReceiverId: memberId,
            GiverId: null
        });
        console.log("giver org id " + newTransaction.GiverOrgId);
        await TransactionController._confirmTransaction(newTransaction);
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
