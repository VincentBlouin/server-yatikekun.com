const models = require('../model')
const crypto = require('crypto')
const EmailClient = require('../EmailClient')
const sprintf = require('sprintf-js').sprintf
const config = require('../config')
const Promise = require("bluebird");
const Sequelize = require('sequelize');
const Op = Sequelize.Op;
const TEN_MINUTES_IN_HOURS = 0.166666667;

const confirmTransactionFr = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'partageheure.com, confirmer une transaction',
    content: 'Vous reçevez ce courriel, parce que %s veut que vous confirmiez la transaction suivante pour un service que vous avez <b>%s</b>:<br><br>' +
        '%s<br><br>' +
        'Un montant de %s sera %s à votre compte.<br><br>' +
        'En cliquant le lien plus bas, vous allez confirmer la transaction.<br><br>' +
        '<a href="%s/transaction/%s/confirm/%s" target="_blank">%s/transaction/%s/confirm/%s</a><br><br>' +
        'Pour consulter la transaction cliquez sur le lien ci-bas<br><br>' +
        '<a href="%s/transaction/%s" target="_blank">%s/transaction/%s</a><br><br>'
}

const confirmTransactionEn = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'partageheure.com, confirmer une transaction',
    content: 'Vous reçevez ce courriel, parce que %s veut que vous confirmiez la transaction suivante pour un service que vous avez <b>%s</b>:<br><br>' +
        '%s<br><br>' +
        'Un montant de %s sera %s à votre compte.<br><br>' +
        'En cliquant le lien plus bas, vous allez confirmer la transaction.<br><br>' +
        '<a href="%s/transaction/%s/confirm/%s" target="_blank">%s/transaction/%s/confirm/%s</a><br><br>' +
        'Pour consulter la transaction cliquez sur le lien ci-bas<br><br>' +
        '<a href="%s/transaction/%s" target="_blank">%s/transaction/%s</a><br><br>'
}

const {
    Users,
    Transactions,
    Organisations
} = models
const TransactionController = {
    async list(req, res) {
        const userId = parseInt(req.params.userId);
        const transactions = await TransactionController._listForEntityId(userId);
        res.send(transactions);
    },
    async listForOrg(req, res) {
        const orgId = parseInt(req.params.orgId);
        const transactions = await TransactionController._listForEntityId(orgId, true);
        res.send(transactions);
    },
    async listAll(req, res) {
        const transactions = await Transactions.findAll({
            where: {
                GiverOrgId: {
                    [Op.eq]: null
                },
                ReceiverOrgId: {
                    [Op.eq]: null
                },
            },
            include: [
                {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
                {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
                {model: Users, as: 'receiver', attributes: Users.getFewAttributes()},
                {
                    model: Organisations,
                    as: 'giverOrg',
                    attributes: Organisations.getLightWeightAttributes()
                },
                {
                    model: Organisations,
                    as: 'receiverOrg',
                    attributes: Organisations.getLightWeightAttributes()
                }
            ],
        });
        res.send(transactions);
    },
    async getNbTransactionsBetweenMembers(req, res) {
        const nbTransactions = await Transactions.count({
            where: {
                GiverId: {
                    [Op.ne]: null
                },
                ReceiverId: {
                    [Op.ne]: null
                },
            }
        });
        res.send({
            'nbTransactions': nbTransactions
        });
    },
    async getNbMembersInvolvedInTransactions(req, res) {
        const transactions = await Transactions.findAll({
            attributes: ['GiverId', 'ReceiverId'],
            where: {
                GiverId: {
                    [Op.ne]: null
                },
                ReceiverId: {
                    [Op.ne]: null
                },
            }
        });
        const membersInvolved = new Set();
        transactions.forEach((transaction) => {
            membersInvolved.add(transaction.ReceiverId);
            membersInvolved.add(transaction.GiverId);
        });
        res.send({
            'nbMembersInvolvedInTransactions': membersInvolved.size
        });
    },
    async getOne(req, res) {
        const transactionId = parseInt(req.params.transactionId);
        const transaction = await Transactions.findOne({
            where: {
                id: transactionId
            },
            include: [
                {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
                {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
                {model: Users, as: 'receiver', attributes: Users.getFewAttributes()},
                {model: Organisations, as: 'giverOrg', attributes: Organisations.getLightWeightAttributes()},
                {model: Organisations, as: 'receiverOrg', attributes: Organisations.getLightWeightAttributes()}
            ]
        })
        res.send(transaction);
    },
    async addTransaction(req, res) {
        const initiatorId = req.body.InitiatorId ? parseInt(req.body.InitiatorId) : null;
        const initiatorOrgId = req.body.InitiatorOrgId ? parseInt(req.body.InitiatorOrgId) : null;
        const userId = parseInt(req.user.id);
        const giverOrgId = req.body.GiverOrgId ? parseInt(req.body.GiverOrgId) : null;
        const receiverOrgId = req.body.ReceiverOrgId ? parseInt(req.body.ReceiverOrgId) : null;
        const involvesOrg = giverOrgId !== null || receiverOrgId !== null;
        if (!involvesOrg && userId !== initiatorId) {
            return res.sendStatus(401);
        }
        let giver;
        let receiver;
        if (req.body.GiverUuid) {
            giver = await Users.findOne({
                where: {
                    uuid: req.body.GiverUuid
                },
                attributes: ['id']
            });
        }
        if (req.body.ReceiverUuid) {
            receiver = await Users.findOne({
                where: {
                    uuid: req.body.ReceiverUuid
                },
                attributes: ['id']
            });
        }
        if (involvesOrg) {
            if (giverOrgId === receiverOrgId) {
                return res.sendStatus(401);
            }
            if (giverOrgId !== null && receiverOrgId !== null) {
                return res.sendStatus(401);
            }
        } else {
            if (giver.id === receiver.id) {
                return res.sendStatus(401);
            }
        }
        const transaction = {
            amount: req.body.amount,
            serviceDuration: req.body.serviceDuration,
            nbParticipants: req.body.nbParticipants,
            details: req.body.details,
            InitiatorId: initiatorId,
            InitiatorOrgId: initiatorOrgId,
            GiverId: giver ? giver.id : null,
            GiverOrgId: giverOrgId,
            ReceiverId: receiver ? receiver.id : null,
            ReceiverOrgId: receiverOrgId,
            OfferId: req.body.OfferId,
            status: "PENDING"
        };
        if (!involvesOrg && req.body.organisationId) {
            if (initiatorId === receiver.id) {
                transaction.receiverDonationOrgId = req.body.organisationId;
            } else {
                transaction.giverDonationOrgId = req.body.organisationId;
            }
        }
        const newTransaction = await Transactions.create(transaction);
        if (involvesOrg) {
            await TransactionController._confirmTransaction(newTransaction);
        }
        if (!involvesOrg) {
            const otherUserId = initiatorId === receiver.id ? giver.id : receiver.id;
            TransactionController._sendConfirmEmailToUserIdInTransaction(otherUserId, newTransaction);
        }
        res.send({
            transactionId: newTransaction.id
        });
    },
    async setGiverOrg(req, res) {
        await TransactionController._setOrgId(
            req,
            res,
            'GiverId',
            'giverDonationOrgId'
        )
    },
    async setReceiverOrg(req, res) {
        await TransactionController._setOrgId(
            req,
            res,
            'ReceiverId',
            'receiverDonationOrgId'
        )
    },
    async _setOrgId(req, res, userIdProp, donationIdProp) {
        const transaction = await Transactions.findOne({
            where: {
                id: req.params['transactionId']
            }
        });
        if (!transaction) {
            return res.sendStatus(404);
        }
        const userId = parseInt(req.user.id);
        if (transaction[userIdProp] !== userId) {
            return res.sendStatus(401);
        }
        if (transaction.status !== "PENDING") {
            return res.sendStatus(400);
        }
        transaction[donationIdProp] = req.params['orgId'];
        await transaction.save();
        res.sendStatus(200);
    },
    async confirm(req, res) {
        const userId = parseInt(req.user.id);
        const transaction = await Transactions.findOne({
            where: {
                id: req.params['transactionId']
            }
        });
        if (!transaction) {
            return res.sendStatus(404);
        }
        if (transaction.GiverId !== userId && transaction.ReceiverId !== userId) {
            return res.sendStatus(401);
        }
        if (transaction.status === "CONFIRMED") {
            return res.sendStatus(200);
        }
        if (transaction.status !== "PENDING") {
            return res.sendStatus(400);
        }
        if (transaction.InitiatorId === userId) {
            return res.sendStatus(400);
        }
        await TransactionController._confirmTransaction(transaction);
        res.sendStatus(200);
    },
    async confirmWithToken(req, res) {
        const token = req.body.token;
        if (token === null) {
            return res.sendStatus(401);
        }
        if (token.trim() === "") {
            return res.sendStatus(401);
        }
        const transaction = await Transactions.findOne({
            where: {
                confirmToken: token
            }
        });
        if (!transaction) {
            return res.sendStatus(400);
        }
        if (transaction.status === "CONFIRMED") {
            return res.sendStatus(200);
        }
        if (transaction.status !== "PENDING") {
            return res.sendStatus(400);
        }
        await TransactionController._confirmTransaction(transaction);
        res.sendStatus(200);
    },
    async refuse(req, res) {
        const userId = parseInt(req.user.id);
        const transaction = await Transactions.findOne({
            where: {
                id: req.params['transactionId']
            }
        });
        if (!transaction) {
            return res.sendStatus(404);
        }
        if (transaction.GiverId !== userId && transaction.ReceiverId !== userId) {
            return res.sendStatus(401);
        }
        if (transaction.status === "REFUSED") {
            return res.sendStatus(200);
        }
        if (transaction.status !== "PENDING") {
            return res.sendStatus(400);
        }
        transaction.status = "REFUSED";
        await transaction.save();
        res.sendStatus(200);
    },
    async _confirmTransaction(transaction) {
        const isGiverAnOrg = transaction.GiverId === null;
        const giverPreviousBalance = await TransactionController._getBalanceForEntityId(
            parseInt(isGiverAnOrg ? transaction.GiverOrgId : transaction.GiverId),
            isGiverAnOrg
        );
        const isReceiverAnOrg = transaction.ReceiverId === null;
        const receiverPreviousBalance = await TransactionController._getBalanceForEntityId(
            parseInt(isReceiverAnOrg ? transaction.ReceiverOrgId : transaction.ReceiverId),
            isReceiverAnOrg
        );
        // console.log(giverPreviousBalance + " " + receiverPreviousBalance);
        transaction.balanceGiver = parseFloat(giverPreviousBalance) + parseFloat(transaction.amount);
        transaction.balanceReceiver = parseFloat(receiverPreviousBalance) - parseFloat(transaction.amount);
        transaction.confirmDate = new Date();
        transaction.status = "CONFIRMED";
        const newTransaction = await transaction.save();
        const bonusAmount = transaction.amount * TEN_MINUTES_IN_HOURS;
        if (transaction.giverDonationOrgId) {
            await TransactionController._createBonusTransactionWithUserAndOrg(
                transaction.GiverId,
                transaction.giverDonationOrgId,
                bonusAmount,
                newTransaction.id,
                transaction.balanceGiver
            )
        }
        if (transaction.receiverDonationOrgId) {
            await TransactionController._createBonusTransactionWithUserAndOrg(
                transaction.ReceiverId,
                transaction.receiverDonationOrgId,
                bonusAmount,
                newTransaction.id,
                transaction.balanceReceiver
            )
        }
    },
    async _createBonusTransactionWithUserAndOrg(userId, orgId, bonusAmount, parentTransactionId, userBalance) {
        const orgPreviousBalance = await TransactionController._getBalanceForEntityId(
            parseInt(orgId),
            true
        );
        let orgBalance = parseFloat(orgPreviousBalance) + parseFloat(bonusAmount);
        const transaction = {
            amount: bonusAmount,
            serviceDuration: bonusAmount,
            nbParticipants: 1,
            details: "Bonus",
            InitiatorId: userId,
            GiverOrgId: orgId,
            balanceGiver: orgBalance,
            ReceiverId: userId,
            balanceReceiver: userBalance,
            status: "CONFIRMED",
            confirmDate: new Date(),
            parentTransactionId: parentTransactionId,
            isBonusForOrg: true
        };
        await Transactions.create(transaction);
    },
    async pendingTransactionOfOffer(req, res) {
        const userId = parseInt(req.params['userId']);
        if (userId !== req.user.id) {
            return res.send(403);
        }
        const offerId = req.params['offerId'];
        const pendingTransaction = await TransactionController._getPendingTransactionForUserId(
            userId,
            offerId
        );
        res.send(pendingTransaction);
    },
    async getAllPendingOffersOfUser(req, res) {
        const userId = parseInt(req.params['userId']);
        if (userId !== req.user.id) {
            return res.send(403);
        }
        const pendingTransactions = await TransactionController._getPendingTransactionForUserId(
            userId
        );
        res.send(pendingTransactions);
    },
    async _getBalanceForEntityId(entityId, isOrg) {
        isOrg = isOrg || false;
        const transactions = await Transactions.findAll({
            limit: 1,
            order: [['confirmDate', 'DESC']],
            where: {
                status: "CONFIRMED",
                $or: TransactionController._ORClause(entityId, isOrg)
            }
        });
        if (!transactions.length) {
            return 0;
        }
        const latestConfirmedTransaction = transactions[0];
        // console.log(latestConfirmedTransaction.balanceGiver + " " + latestConfirmedTransaction.balanceReceiver)
        const giverId = isOrg ? latestConfirmedTransaction.GiverOrgId : latestConfirmedTransaction.GiverId;
        return giverId === entityId ?
            parseFloat(latestConfirmedTransaction.balanceGiver) : parseFloat(latestConfirmedTransaction.balanceReceiver);

    },
    async _getPendingTransactionForUserId(userId, offerId) {
        const whereClause = {
            status: "PENDING",
            $or: [
                {
                    GiverId: userId

                },
                {
                    ReceiverId: userId
                },
            ]
        };
        if (offerId !== undefined) {
            whereClause.OfferId = offerId;
        }
        return Transactions.findAll({
            include: [
                {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
                {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
                {model: Users, as: 'receiver', attributes: Users.getFewAttributes()}
            ],
            where: whereClause
        });
    },
    async _sendConfirmEmailToUserIdInTransaction(userId, transaction) {
        const user = await Users.findOne({
            where: {
                id: userId
            },
            attributes: ['email']
        });
        const otherUserId = transaction.GiverId === userId ? transaction.ReceiverId : transaction.GiverId;
        const otherUser = await Users.findOne({
            where: {
                id: otherUserId
            },
            attributes: ['firstname', 'lastname']
        });
        const otherUserFullname = otherUser.firstname + " " + otherUser.lastname;
        const email = user.email;
        const token = crypto.randomBytes(32).toString('hex')
        transaction.confirmToken = token;
        await transaction.save();
        const giveReceiveText = transaction.GiverId === userId ? "rendu" : "reçu";
        const emailText = true ? confirmTransactionFr : confirmTransactionEn;
        const creditDebitText = transaction.GiverId === userId ? "débité" : "crédité";
        const emailContent = {
            from: EmailClient.buildFrom(emailText.from),
            to: email,
            subject: emailText.subject,
            html: sprintf(
                emailText.content,
                otherUserFullname,
                giveReceiveText,
                transaction.details,
                TransactionController._quantityToFormatted(transaction.amount),
                creditDebitText,
                config.getConfig().baseUrl,
                transaction.id,
                token,
                config.getConfig().baseUrl,
                transaction.id,
                token,
                config.getConfig().baseUrl,
                transaction.id,
                config.getConfig().baseUrl,
                transaction.id
            )
        }
        EmailClient.addEmailNumber(emailContent, "fr", '068b6faa')
        await EmailClient.send(emailContent);
    }
}
TransactionController.recalculate = async function (req, res) {
    console.log("recalculate all balance for users")
    const users = await Users.findAll();
    await Promise.all(users.map((user) => {
        return TransactionController._recalculateForEntityId(user.id);
    }));
    console.log("recalculate all balance for orgs")
    const organisations = await Organisations.findAll();
    await Promise.all(organisations.map((organisation) => {
        return TransactionController._recalculateForEntityId(organisation.id, true);
    }));
    console.log("end recalculate all balance")
    res.sendStatus(200);
};

TransactionController.removeTransaction = async function (req, res) {
    const transactionId = parseInt(req.params.transactionId);
    const bonusTransactions = await Transactions.findAll({
        limit: 2,
        where: {
            parentTransactionId: transactionId
        }
    });
    await bonusTransactions.map(async (transaction) => {
        const orgId = transaction.GiverOrgId;
        await transaction.destroy();
        await TransactionController._recalculateForEntityId(orgId, true);
    });
    const transaction = await Transactions.findOne({
        where: {
            id: transactionId
        }
    });
    const receiverId = transaction.ReceiverId;
    const giverId = transaction.GiverId;
    await transaction.destroy();
    await TransactionController._recalculateForEntityId(receiverId);
    await TransactionController._recalculateForEntityId(giverId);
    res.sendStatus(200);
};

TransactionController._recalculateForEntityId = async function (entityId, isOrg) {
    isOrg = isOrg || false;
    const transactions = await TransactionController._listForEntityId(entityId, isOrg, true);
    let balance = 0;
    const giverPropertyName = isOrg ? "GiverOrgId" : "GiverId";
    return Promise.mapSeries(transactions, (transaction) => {
        if (transaction.status !== "CONFIRMED") {
            return Promise.resolve();
        }
        const isGiver = transaction[giverPropertyName] === entityId;
        const isBonusTransactionForMember = transaction.GiverOrgId !== null && !isOrg;
        let balanceProperty;
        if (isGiver) {
            if (!isBonusTransactionForMember) {
                balance += transaction.amount;
            }
            balanceProperty = "balanceGiver";
        } else {
            if (!isBonusTransactionForMember) {
                balance -= transaction.amount;
            }
            balanceProperty = "balanceReceiver";
        }
        if (transaction[balanceProperty] === balance) {
            return Promise.resolve();
        }
        transaction[balanceProperty] = balance;
        return transaction.save();
    });
}

TransactionController._listForEntityId = async function (entityId, isOrg, order) {
    isOrg = isOrg || false;
    const options = {
        include: [
            {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
            {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
            {model: Users, as: 'receiver', attributes: Users.getFewAttributes()},
            {model: Organisations, as: 'giverOrg', attributes: Organisations.getLightWeightAttributes()},
            {model: Organisations, as: 'receiverOrg', attributes: Organisations.getLightWeightAttributes()}
        ],
        where: {
            $or: TransactionController._ORClause(entityId, isOrg)
        }
    };
    if (order) {
        options.order = [['createdAt', 'ASC']];
    }
    return Transactions.findAll(options);
};
TransactionController._ORClause = function (entityId, isOrg) {
    const ORClause = [];
    if (isOrg) {
        ORClause.push({
            GiverOrgId: entityId
        });
        ORClause.push({
            ReceiverOrgId: entityId
        });
    } else {
        ORClause.push({
            GiverId: entityId
        });
        ORClause.push({
            ReceiverId: entityId
        });
    }
    return ORClause;
};
TransactionController._quantityToFormatted = function (quantity) {
    const hours = Math.floor(quantity);
    let minutes = Math.round((quantity - hours) * 60);
    const isZeroMinutes = minutes === 0;
    if (hours === 0 && !isZeroMinutes) {
        return minutes + "m"
    } else {
        if (minutes < 10) {
            minutes = "0" + minutes;
        }
        return hours + "h" + minutes;
    }
};
module.exports = TransactionController;
