const models = require('../model')
const {
    Users,
    Transactions
} = models
const TransactionController = {
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