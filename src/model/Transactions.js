module.exports = (sequelize, DataTypes) => {
    const Transactions = sequelize.define('Transactions', {
        amount: DataTypes.DOUBLE,
        details: DataTypes.TEXT,
        additionalFees: DataTypes.TEXT,
        comment: DataTypes.TEXT,
        balanceGiver: DataTypes.DOUBLE,
        balanceReceiver: DataTypes.DOUBLE,
        status: DataTypes.STRING,
        confirmDate: DataTypes.DATE,
        confirmToken: DataTypes.STRING
    }, {
        indexes: [{
            fields: ['GiverId', 'ReceiverId', 'confirmDate', 'confirmToken']
        }]
    })
    Transactions.defineAssociationsUsingModels = function (model, models) {
        model.belongsTo(models.Users, {
            as: 'initiator',
            foreignKey: {
                name: 'InitiatorId'
            }
        });
        model.belongsTo(models.Users, {
            as: 'giver',
            foreignKey: {
                name: 'GiverId'
            }
        });
        model.belongsTo(models.Users, {
            as: 'receiver',
            foreignKey: {
                name: 'ReceiverId'
            }
        });
        model.belongsTo(models.Offers);
    }

    return Transactions
}
