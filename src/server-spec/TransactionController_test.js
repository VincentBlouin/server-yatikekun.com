const seeder = require("../seed/seeder");
const TestUtil = require("./TestUtil");
const chai = require('chai');
let app = require('../app');
const {Transactions} = require('../model');

describe('TransactionController', () => {
    beforeEach(() => {
        return seeder.run();
    });
    it("keeps track of balance", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")

        let u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        let u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u1Transactions[0].balanceGiver.should.equal(5);
        u2Transactions[0].balanceGiver.should.equal(5);
        let newTransactionId = await TestUtil.addTransaction(
            u1,
            1.25,
            u2.uuid,
            offer.id
        );
        let auth = await TestUtil.signIn(u2.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u1Transactions[0].balanceGiver.should.equal(6.25);
        u1Transactions[0].balanceReceiver.should.equal(3.75);
        u2Transactions[0].balanceReceiver.should.equal(3.75);
        u2Transactions[0].balanceGiver.should.equal(6.25);
    });
    it("keeps track of balance when pending transaction", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        let offer = await TestUtil.getOfferByTitle("Animation de groupe")

        let u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        let u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u1Transactions[0].balanceGiver.should.equal(5);
        u2Transactions[0].balanceGiver.should.equal(5);
        await TestUtil.addTransaction(
            u1,
            1.25,
            u2.uuid,
            offer.id
        );
        offer = await TestUtil.getOfferByTitle("Des bras, manutention, peinture etc.");
        let newTransactionId = await TestUtil.addTransaction(
            u2,
            1.5,
            u1.uuid,
            offer.id
        );
        let auth = await TestUtil.signIn(u1.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u1Transactions[0].balanceGiver.should.equal(6.5);
        u1Transactions[0].balanceReceiver.should.equal(3.5);
        u2Transactions[0].balanceReceiver.should.equal(3.5);
        u2Transactions[0].balanceGiver.should.equal(6.5);
    });
    it("can recalculate transaction balance", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        let offer = await TestUtil.getOfferByTitle("Animation de groupe")
        await TestUtil.addTransaction(
            u1,
            1.25,
            u2.uuid,
            offer.id
        );
        offer = await TestUtil.getOfferByTitle("Des bras, manutention, peinture etc.");
        let newTransactionId = await TestUtil.addTransaction(
            u2,
            1.5,
            u1.uuid,
            offer.id
        );
        let auth = await TestUtil.signIn(u1.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        let transactions = await TestUtil.listTransactionsForUserId(u1.id);
        await Promise.all(transactions.map((transaction) => {
            transaction.balanceReceiver = -1;
            transaction.balanceGiver = -1;
            return transaction.save();
        }));
        transactions = await TestUtil.listTransactionsForUserId(u1.id, "ASC");
        transactions[0].balanceGiver.should.equal(-1);
        transactions[0].balanceReceiver.should.equal(-1);
        transactions[2].balanceGiver.should.equal(-1);
        transactions[2].balanceReceiver.should.equal(-1);
        await chai.request(app).get('/api/transaction/recalculate');
        transactions = await TestUtil.listTransactionsForUserId(u1.id, "ASC");
        transactions[0].balanceGiver.should.equal(5);
        transactions[2].balanceGiver.should.equal(6.5);
        transactions[2].balanceReceiver.should.equal(3.5);
    });
});