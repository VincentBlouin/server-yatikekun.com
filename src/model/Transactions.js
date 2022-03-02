module.exports = (sequelize, DataTypes) => {
    const Transactions = sequelize.define('Transactions', {
        amount: DataTypes.DOUBLE,
        serviceDuration: DataTypes.DOUBLE,
        nbParticipants: DataTypes.INTEGER,
        details: DataTypes.TEXT,
        additionalFees: DataTypes.TEXT,
        comment: DataTypes.TEXT,
        balanceGiver: DataTypes.DOUBLE,
        balanceReceiver: DataTypes.DOUBLE,
        status: DataTypes.STRING,
        confirmDate: DataTypes.DATE,
        confirmToken: DataTypes.STRING,
        isBonusForOrg: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
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

        model.belongsTo(models.Organisations, {
            as: 'initiatorOrg',
            foreignKey: {
                name: 'InitiatorOrgId'
            }
        })

        model.belongsTo(models.Organisations, {
            as: 'giverOrg',
            foreignKey: {
                name: 'GiverOrgId'
            }
        })

        model.belongsTo(models.Organisations, {
            as: 'receiverOrg',
            foreignKey: {
                name: 'ReceiverOrgId'
            }
        })

        model.belongsTo(models.Organisations, {
            as: 'giverDonationOrg',
            foreignKey: {
                name: 'giverDonationOrgId'
            }
        })

        model.belongsTo(models.Organisations, {
            as: 'receiverDonationOrg',
            foreignKey: {
                name: 'receiverDonationOrgId'
            }
        })

        model.belongsTo(models.Transactions, {
            as: "parentTransaction",
            foreignKey: {
                name: 'parentTransactionId'
            }
        })
    }

    return Transactions
}
