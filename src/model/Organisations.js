module.exports = (sequelize, DataTypes) => {
    const Organisations = sequelize.define('Organisations', {
        name: DataTypes.STRING,
        url: DataTypes.STRING,
        customImage: DataTypes.JSONB,
        activeForTransactions: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    })
    return Organisations;
}
