const models = require('../model')
const crypto = require('crypto')
const EmailClient = require('../EmailClient')
const sprintf = require('sprintf-js').sprintf
const config = require('../config')
const Promise = require("bluebird");

const confirmTransactionFr = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'partageheure.com, confirmer une transaction',
    content: 'Vous reçevez ce courriel, parce que %s veut que vous confirmiez la transaction suivante:<br><br>' +
        '%s<br><br>' +
        'En cliquant le lien plus bas, vous allez confirmer la transaction.<br><br>' +
        '<a href="%s/confirm-transaction/%s" target="_blank">%s/confirm-transaction/%s</a><br><br>' +
        'Si vous n\'êtes pas daccord avec cette transaction, vous pouvez toujours ignorer celle-ci et en proposer une autre.<br>'
}

const confirmTransactionEn = {
    from: 'horizonsgaspesiens@gmail.com',
    subject: 'partageheure.com, confirmer une transaction',
    content: 'Vous reçevez ce courriel, parce que %s veut que vous confirmiez la transaction suivante:<br><br>' +
        '%s<br><br>' +
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
    async addTransaction(req, res) {
        if (req.user.id !== req.body.InitiatorId) {
            return res.sendStatus(401);
        }
        const receiver = await Users.findOne({
            where: {
                uuid: req.body.ReceiverUuid
            }
        });
        const otherUserId = req.body.InitiatorId === receiver.id ? req.body.GiverId : receiver.id;
        if (req.user.id === otherUserId) {
            return res.sendStatus(401);
        }
        const newTransaction = await Transactions.create({
            amount: req.body.amount,
            details: req.body.details,
            InitiatorId: req.body.InitiatorId,
            GiverId: req.body.GiverId,
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
        const giverPreviousBalance = await TransactionController._getBalanceForUserId(transaction.GiverId);
        const receiverPreviousBalance = await TransactionController._getBalanceForUserId(transaction.ReceiverId);
        transaction.balanceGiver = giverPreviousBalance + transaction.amount;
        transaction.balanceReceiver = receiverPreviousBalance - transaction.amount;
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
    async _getBalanceForUserId(userId) {
        const transactions = await Transactions.findAll({
            limit: 1,
            order: [['confirmDate', 'DESC']],
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
        });
        const latestConfirmedTransaction = transactions[0];
        return latestConfirmedTransaction.GiverId === userId ?
            latestConfirmedTransaction.balanceGiver : latestConfirmedTransaction.balanceReceiver;

    },
    async _getPendingTransactionForUserId(userId, offerId) {
        return Transactions.findAll({
            include: [
                {model: Users, as: 'initiator', attributes: Users.getFewAttributes()},
                {model: Users, as: 'giver', attributes: Users.getFewAttributes()},
                {model: Users, as: 'receiver', attributes: Users.getFewAttributes()}
            ],
            where: {
                OfferId: offerId,
                status: "PENDING",
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
        const emailText = true ? confirmTransactionFr : confirmTransactionEn
        const emailContent = {
            from: EmailClient.buildFrom(emailText.from),
            to: email,
            subject: emailText.subject,
            html: sprintf(
                emailText.content,
                otherUserFullname,
                transaction.details,
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
module.exports = TransactionController;