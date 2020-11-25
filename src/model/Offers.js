module.exports = (sequelize, DataTypes) => {
    const Offers = sequelize.define('Offers', {
        title_fr: DataTypes.STRING,
        title_en: DataTypes.STRING,
        image: DataTypes.STRING,
        customImage: DataTypes.JSONB,
        isAvailable: DataTypes.BOOLEAN
    })
    Offers.defineAssociationsUsingModels = function (model, models) {
        model.belongsTo(models.Users)
    }
    return Offers
}
