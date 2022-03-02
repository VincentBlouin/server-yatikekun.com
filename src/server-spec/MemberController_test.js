const seeder = require("../seed/seeder");
const TestUtil = require("./TestUtil");
const chai = require('chai');
let app = require('../app');
const {Transactions} = require('../model');

describe('MemberController', () => {
    beforeEach(() => {
        return seeder.run();
    });
    it("gives bonus to org for subscripting member", async () => {
        const adminUser = await TestUtil.getUserByEmail("a@sel.org");
        let auth = await TestUtil.signIn(adminUser.email);
        let response = await chai.request(app)
            .get("/api/transaction/org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        let org1Transactions = response.body;
        org1Transactions.length.should.equal(0);
        await chai.request(app)
            .post('/api/member/')
            .set('Authorization', 'Bearer ' + auth.token)
            .send({
                email: "newuser@partageheure.com",
                orgIdGotBonusForSubscription: 1
            });
        response = await chai.request(app)
            .get("/api/transaction/org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        org1Transactions = response.body;
        org1Transactions.length.should.equal(1);
        let transaction = org1Transactions[0];
        transaction.status.should.equal("CONFIRMED");
    });

    it("giving bonus to org does not charge the subscripting member", async () => {
        const adminUser = await TestUtil.getUserByEmail("a@sel.org");
        let auth = await TestUtil.signIn(adminUser.email);
        let response = await chai.request(app)
            .post('/api/member/')
            .set('Authorization', 'Bearer ' + auth.token)
            .send({
                email: "newuser@partageheure.com",
                status: "member",
                orgIdGotBonusForSubscription: 1
            });
        auth = await TestUtil.signIn("newuser@partageheure.com");
        const newMemberId = response.body.memberId;
        response = await chai.request(app)
            .get("/api/transaction/user/" + newMemberId)
            .set('Authorization', 'Bearer ' + auth.token);
        let newMemberTransactions = response.body;
        newMemberTransactions.length.should.equal(2);
        let transaction = newMemberTransactions[1];
        transaction.balanceReceiver.should.equal(5);
    });

    it("gives bonus to org for updating member", async () => {
        const adminUser = await TestUtil.getUserByEmail("a@sel.org");
        const user = await TestUtil.getUserByEmail("u@sel.org")
        let auth = await TestUtil.signIn(adminUser.email);
        let response = await chai.request(app)
            .get("/api/transaction/org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        let org1Transactions = response.body;
        org1Transactions.length.should.equal(0);
        user.orgIdGotBonusForSubscription = 1;
        await chai.request(app)
            .put('/api/member/' + user.uuid)
            .set('Authorization', 'Bearer ' + auth.token)
            .send(user);
        response = await chai.request(app)
            .get("/api/transaction/org/1")
            .set('Authorization', 'Bearer ' + auth.token);
        org1Transactions = response.body;
        org1Transactions.length.should.equal(1);
        let transaction = org1Transactions[0];
        transaction.status.should.equal("CONFIRMED");
    });
    it("lists members of hg not members of partageheure", async () => {
        const adminUser = await TestUtil.getUserByEmail("a@sel.org");
        let auth = await TestUtil.signIn(adminUser.email);
        let response = await chai.request(app)
            .get("/api/member/members-of-hg-not-of-partageheure")
            .set('Authorization', 'Bearer ' + auth.token);
        console.log(response.body);
        response.status.should.equal(200);
    });
});
