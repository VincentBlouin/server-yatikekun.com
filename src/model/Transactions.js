module.exports = (sequelize, DataTypes) => {
    const Transactions = sequelize.define('Transactions', {
        amount: DataTypes.DOUBLE,
        details: DataTypes.TEXT,
        additionalFees: DataTypes.TEXT,
        comment: DataTypes.TEXT,
        balanceGiver: DataTypes.DOUBLE,
        balanceReceiver: DataTypes.DOUBLE,
        status: DataTypes.STRING
    }, {
        indexes: [{
            fields: ['GiverId', 'ReceiverId']
        }]
    })
    Transactions.defineAssociationsUsingModels = function (model, models) {
        model.belongsTo(models.Users, {
            as: 'initiator',
            foreignKey: {
                name: 'InitiatorId',
                allowNull: false
            }
        });
        model.belongsTo(models.Users, {
            as: 'giver',
            foreignKey: {
                name: 'GiverId',
                allowNull: false
            }
        });
        model.belongsTo(models.Users, {
            as: 'receiver',
            foreignKey: {
                name: 'ReceiverId',
                allowNull: false
            }
        });
        model.belongsTo(models.Offers);
    }

    return Transactions
}
