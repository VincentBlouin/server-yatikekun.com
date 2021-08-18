module.exports = (sequelize, DataTypes) => {
    const Organisations = sequelize.define('Organisations', {
        name: DataTypes.STRING,
        url: DataTypes.STRING,
        customImage: DataTypes.JSONB
    })
    return Organisations;
}
