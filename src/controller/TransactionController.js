const models = require('../model')
const crypto = require('crypto')
const EmailClient = require('../EmailClient')
const sprintf = require('sprintf-js').sprintf
const config = require('../config')
const Promise = require("bluebird");

const confirmTransactionFr = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'partageheure.com, confirmer une transaction',
    content: 'Vous reçevez ce courriel, parce que %s veut que vous confirmiez la transaction suivante pour un service que vous avez <b>%s</b>:<br><br>' +
        '%s<br><br>' +
        'Un montant de %s sera %s à votre compte.<br><br>' +
        'En cliquant le lien plus bas, vous allez confirmer la transaction.<br><br>' +
        '<a href="%s/confirm-transaction/%s" target="_blank">%s/confirm-transaction/%s</a><br><br>' +
        'Si vous n\'êtes pas daccord avec cette transaction, vous pouvez toujours ignorer celle-ci et en proposer une autre.<br>'
}

const confirmTransactionEn = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'partageheure.com, confirmer une transaction',
    content: 'Vous reçevez ce courriel, parce que %s veut que vous confirmiez la transaction suivante pour un service que vous avez <b>%s</b>:<br><br>' +
        '%s<br><br>' +
        'Un montant de %s sera %s à votre compte.<br><br>' +
        'En cliquant le lien plus bas, vous allez confirmer la transaction.<br><br>' +
        '<a href="%s/confirm-transaction/%s" target="_blank">%s/confirm-transaction/%s</a><br><br>' +
        'Si vous n\'êtes pas daccord avec cette transaction, vous pouvez toujours ignorer celle-ci et en proposer une autre.<br>'
}

const {
    Users,
    Transactions
} = models
const TransactionController = {
    async list(req, res) {
        const userId = parseInt(req.params.userId);
        const transactions = await TransactionController._listForUserId(userId);
        res.send(transactions);
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
                {model: Users, as: 'receiver', attributes: Users.getFewAttributes()}
            ]
        })
        res.send(transaction);
    },
    async addTransaction(req, res) {
        const initiatorId = parseInt(req.body.InitiatorId);
        const userId = parseInt(req.user.id);
        if (userId !== initiatorId) {
            return res.sendStatus(401);
        }
        const giver = await Users.findOne({
            where: {
                uuid: req.body.GiverUuid
            },
            attributes: ['id']
        });
        const receiver = await Users.findOne({
            where: {
                uuid: req.body.ReceiverUuid
            },
            attributes: ['id']
        });
        const otherUserId = initiatorId === receiver.id ? giver.id : receiver.id;
        if (userId === otherUserId) {
            return res.sendStatus(401);
        }
        const newTransaction = await Transactions.create({
            amount: req.body.amount,
            serviceDuration: req.body.serviceDuration,
            nbParticipants: req.body.nbParticipants,
            details: req.body.details,
            InitiatorId: initiatorId,
            GiverId: giver.id,
            ReceiverId: receiver.id,
            OfferId: req.body.OfferId,
            status: "PENDING"
        });
        TransactionController._sendConfirmEmailToUserIdInTransaction(otherUserId, newTransaction);
        res.send({
            transactionId: newTransaction.id
        })
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
    async _confirmTransaction(transaction) {
        const giverPreviousBalance = await TransactionController._getBalanceForUserId(parseInt(transaction.GiverId));
        const receiverPreviousBalance = await TransactionController._getBalanceForUserId(parseInt(transaction.ReceiverId));
        // console.log(giverPreviousBalance + " " + receiverPreviousBalance);
        transaction.balanceGiver = parseFloat(giverPreviousBalance) + parseFloat(transaction.amount);
        transaction.balanceReceiver = parseFloat(receiverPreviousBalance) - parseFloat(transaction.amount);
        transaction.confirmDate = new Date();
        transaction.status = "CONFIRMED";
        await transaction.save();
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
    async _getBalanceForUserId(userId) {
        const transactions = await Transactions.findAll({
            limit: 1,
            order: [['confirmDate', 'DESC']],
            where: {
                status: "CONFIRMED",
                $or: [
                    {
                        GiverId: userId

                    },
                    {
                        ReceiverId: userId
                    },
                ]
            }
        });
        const latestConfirmedTransaction = transactions[0];
        // console.log(latestConfirmedTransaction.balanceGiver + " " + latestConfirmedTransaction.balanceReceiver)
        return latestConfirmedTransaction.GiverId === userId ?
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
        const emailText = true ? confirmTransactionFr : confirmTransactionEn;
        const giveReceiveText = transaction.GiverId === userId ? "rendu" : "reçu";
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
                token,
                config.getConfig().baseUrl,
                token
            )
        }
        EmailClient.addEmailNumber(emailContent, "fr", '068b6faa')
        await EmailClient.send(emailContent);
    }
}
TransactionController.recalculate = async function (req, res) {
    console.log("recalculate all balance")
    const users = await Users.findAll();
    await Promise.all(users.map((user) => {
        return TransactionController._recalculateForUserId(user.id);
    }));
    console.log("end recalculate all balance")
    res.sendStatus(200);
};

TransactionController.removeTransaction = async function (req, res) {
    const transactionId = parseInt(req.params.transactionId);
    const transaction = await Transactions.findOne({
        where: {
            id: transactionId
        }
    });
    const initiatorId = transaction.InitiatorId;
    const giverId = transaction.GiverId;
    await transaction.destroy();
    await TransactionController._recalculateForUserId(initiatorId);
    await TransactionController._recalculateForUserId(giverId);
    res.sendStatus(200);
};

TransactionController._recalculateForUserId = async function (userId) {
    const transactions = await TransactionController._listForUserId(userId, true);
    let balance = 0;
    return Promise.mapSeries(transactions, (transaction) => {
        if (transaction.status !== "CONFIRMED") {
            return Promise.resolve();
        }
        let balanceProperty;
        if (transaction.GiverId === userId) {
            balance += transaction.amount;
            balanceProperty = "balanceGiver";
        } else {
            balance -= transaction.amount;
            balanceProperty = "balanceReceiver";
        }
        if (transaction[balanceProperty] === balance) {
            return Promise.resolve();
        }
        transaction[balanceProperty] = balance;
        return transaction.save();
    });
}

TransactionController._listForUserId = async function (userId, order) {
    const options = {
        include: [
            {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
            {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
            {model: Users, as: 'receiver', attributes: Users.getFewAttributes()}
        ],
        where: {
            $or: [
                {
                    GiverId: userId

                },
                {
                    ReceiverId: userId
                },
            ]
        }
    };
    if (order) {
        options.order = [['createdAt', 'ASC']];
    }
    return Transactions.findAll(options);
};
TransactionController._quantityToFormatted = function (quantity) {
    const hours = Math.floor(quantity);
    let minutes = Math.round((quantity - hours) * 60);
    const isZeroMinutes = minutes === 0;
    if (isZeroMinutes) {
        minutes = "00";
    }
    if (hours === 0 && !isZeroMinutes) {
        return minutes + "m"
    } else {
        return hours + "h" + minutes;
    }
};
module.exports = TransactionController;
