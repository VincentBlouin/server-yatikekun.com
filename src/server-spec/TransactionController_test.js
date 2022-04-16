const seeder = require("../seed/seeder");
const TestUtil = require("./TestUtil");
const chai = require('chai');
let app = require('../app');
const TEN_MINUTES_IN_HOURS = 0.166666667;
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
    it("calculates correct balance after remove all transactions expect the first one", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
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
        auth = await TestUtil.signIn("a@sel.org");
        await chai.request(app)
            .delete('/api/transaction/' + newTransactionId)
            .set('Authorization', 'Bearer ' + auth.token);
        let u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        let u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u1Transactions[0].balanceGiver.should.equal(5);
        u2Transactions[0].balanceGiver.should.equal(5);
        newTransactionId = await TestUtil.addTransaction(
            u1,
            1.25,
            u2.uuid,
            offer.id
        );
        auth = await TestUtil.signIn(u2.email);
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
    it("creates bonus transaction for org", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
        let newTransactionId = await TestUtil.addTransaction(
            u1,
            1,
            u2.uuid,
            offer.id,
            2
        );
        let auth = await TestUtil.signIn(u2.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/receiver-org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        let u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        const orgTransaction = u2Transactions[0];
        orgTransaction.GiverOrgId.should.equal(1);
        orgTransaction.amount.should.equal(0.166666667);
        orgTransaction.parentTransactionId.should.equal(newTransactionId);
        let u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        const u1OrgTransaction = u1Transactions[0];
        u1OrgTransaction.GiverOrgId.should.equal(2);
    });

    it("excludes bonus transactions from balance amount", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
        let newTransactionId = await TestUtil.addTransaction(
            u1,
            1,
            u2.uuid,
            offer.id,
            2
        );
        let auth = await TestUtil.signIn(u2.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/receiver-org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);

        let u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        u1Transactions[0].balanceReceiver.should.equal(6);
        u1Transactions[0].balanceGiver.should.equal(0.166666667);
        let u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u2Transactions[0].balanceReceiver.should.equal(4);
        u2Transactions[0].balanceGiver.should.equal(0.166666667);
        await chai.request(app).get('/api/transaction/recalculate');
        u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        u1Transactions[0].balanceReceiver.should.equal(6);
        u1Transactions[0].balanceGiver.should.equal(0.166666667);
        u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u2Transactions[0].balanceReceiver.should.equal(4);
        u2Transactions[0].balanceGiver.should.equal(0.166666667);
    });
    it("has correct bonus amount when both entities choose the same org", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
        let newTransactionId = await TestUtil.addTransaction(
            u1,
            1,
            u2.uuid,
            offer.id,
            2
        );
        let auth = await TestUtil.signIn(u1.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/giver-org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        auth = await TestUtil.signIn(u2.email);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/receiver-org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        auth = await TestUtil.signIn("a@sel.org");
        let response = await chai.request(app)
            .get("/api/transaction/org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        let org1Transactions = response.body;
        org1Transactions.length.should.equal(2);
        org1Transactions[0].balanceGiver.should.equal(0.166666667);
        org1Transactions[1].balanceGiver.should.equal(0.333333334);
    });
    it("recalculates balance of bonus transactions correctly", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
        const firstTransactionId = await TestUtil.addTransaction(
            u1,
            1,
            u2.uuid,
            offer.id,
            2
        );
        let auth = await TestUtil.signIn(u2.email);
        await chai.request(app)
            .post('/api/transaction/' + firstTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        let newTransactionId = await TestUtil.addTransaction(
            u1,
            1,
            u2.uuid,
            offer.id,
            2
        );
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/receiver-org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        await chai.request(app)
            .post('/api/transaction/' + newTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        let response = await chai.request(app)
            .get("/api/transaction/user/" + u2.id)
            .set('Authorization', 'Bearer ' + auth.token);
        let transactions = response.body;
        transactions.length.should.equal(4);
        transactions[0].balanceGiver.should.equal(5);
        transactions[1].balanceReceiver.should.equal(4);
        transactions[2].balanceReceiver.should.equal(3);
        transactions[3].balanceReceiver.should.equal(3);
        auth = await TestUtil.signIn("a@sel.org");
        await chai.request(app)
            .delete('/api/transaction/' + firstTransactionId)
            .set('Authorization', 'Bearer ' + auth.token);
        auth = await TestUtil.signIn("u2@sel.org");
        response = await chai.request(app)
            .get("/api/transaction/user/" + u2.id)
            .set('Authorization', 'Bearer ' + auth.token);
        transactions = response.body;
        transactions.length.should.equal(3);
        transactions[0].balanceGiver.should.equal(5);
        transactions[1].balanceReceiver.should.equal(4);
        transactions[2].balanceReceiver.should.equal(4);
    });
    it("can claim org donation after transaction is confirmed", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
        const firstTransactionId = await TestUtil.addTransaction(
            u1,
            1,
            u2.uuid,
            offer.id,
            null
        );
        let auth = await TestUtil.signIn(u2.email);
        await chai.request(app)
            .post('/api/transaction/' + firstTransactionId + "/confirm")
            .set('Authorization', 'Bearer ' + auth.token);
        auth = await TestUtil.signIn(u1.email);
        let response = await chai.request(app)
            .get("/api/transaction/user/" + u1.id)
            .set('Authorization', 'Bearer ' + auth.token);
        let transactions = response.body;
        transactions.length.should.equal(2);
        transactions[1].balanceGiver.should.equal(6)
        console.log(transactions)
        await chai.request(app)
            .post('/api/transaction/' + firstTransactionId + "/giver-org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        response = await chai.request(app)
            .get("/api/transaction/user/" + u1.id)
            .set('Authorization', 'Bearer ' + auth.token);
        transactions = response.body;
        transactions.length.should.equal(3);
        transactions[2].balanceReceiver.should.equal(6)

    });
});
