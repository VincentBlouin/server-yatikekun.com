const models = require('../model')
const {
    Users,
    Transactions
} = models
module.exports = {
    async addTransaction(req, res) {
        const receiver = await Users.findOne({
            where: {
                uuid: req.body.ReceiverUuid
            }
        });
        await Transactions.create({
            amount: req.body.quantity,
            details: req.body.details,
            InitiatorId: req.body.InitiatorId,
            GiverId: req.body.GiverId,
            ReceiverId: receiver.id,
            OfferId: req.body.OfferId
        });
        res.sendStatus(200);
    }
}