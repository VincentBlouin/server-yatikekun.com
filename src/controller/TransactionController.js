const models = require('../model')
const {
    Users,
    Transactions
} = models
const TransactionController = {
    async list(req, res) {
        const userId = parseInt(req.params.userId);
        const transactions = await Transactions.findAll({
            include: [
                { model: Users, as: 'initiator', attributes: Users.getFewAttributes() },
                { model: Users, as: 'giver', attributes: Users.getFewAttributes() },
                { model: Users, as: 'receiver', attributes: Users.getFewAttributes() }
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
        });
        res.send(transactions);
    },
    async addTransaction(req, res) {
        const receiver = await Users.findOne({
            where: {
                uuid: req.body.ReceiverUuid
            }
        });
        await Transactions.create({
            amount: req.body.amount,
            details: req.body.details,
            InitiatorId: req.body.InitiatorId,
            GiverId: req.body.GiverId,
            ReceiverId: receiver.id,
            OfferId: req.body.OfferId,
            status: "PENDING"
        });
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
        if (transaction.status !== "PENDING") {
            return res.sendStatus(400);
        }
        if (transaction.InitiatorId === userId) {
            return res.sendStatus(400);
        }
        const giverPreviousBalance = await TransactionController._getBalanceForUserId(transaction.GiverId);
        const receiverPreviousBalance = await TransactionController._getBalanceForUserId(transaction.ReceiverId);
        transaction.balanceGiver = giverPreviousBalance + transaction.amount;
        transaction.balanceReceiver = receiverPreviousBalance - transaction.amount;
        transaction.confirmDate = new Date().getTime();
        transaction.status = "CONFIRMED";
        transaction.save();
        res.sendStatus(200);
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
                { model: Users, as: 'initiator', attributes: Users.getFewAttributes() },
                { model: Users, as: 'giver', attributes: Users.getFewAttributes() },
                { model: Users, as: 'receiver', attributes: Users.getFewAttributes() }
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
    }
}
module.exports = TransactionController;