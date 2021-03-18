const seeder = require("../seed/seeder");
const TransactionController = require("../controller/TransactionController");
const chai = require('chai');
require('chai').should();
chai.should();
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
chai.use(require('chai-string'));
const TestUtil = require("./TestUtil");
require('chai-http');
let app = require('../app');
describe('TransactionController', () => {
    beforeEach(() => {
        return seeder.run();
    });
    it("keeps track of balance", async () => {
        const u1 = await TestUtil.getUserByEmail("u@sel.org");
        const u2 = await TestUtil.getUserByEmail("u2@sel.org");
        const offer = await TestUtil.getOfferByTitle("Animation de groupe")
        let auth = await TestUtil.signIn(u1.email);
        let u1Transactions = await TestUtil.listTransactionsForUserId(u1.id);
        let u2Transactions = await TestUtil.listTransactionsForUserId(u2.id);
        u1Transactions[0].balanceGiver.should.equal(5);
        u2Transactions[0].balanceGiver.should.equal(5);
        let res = await chai.request(app)
            .post('/api/transaction')
            .set('Authorization', 'Bearer ' + auth.token)
            .send({
                amount: 1.25,
                InitiatorId: u1.id,
                GiverId: u1.id,
                ReceiverUuid: u2.uuid,
                OfferId: offer.id,
            });
        const newTransactionId = res.body.transactionId;
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
        res.should.have.status(200);
    });
});