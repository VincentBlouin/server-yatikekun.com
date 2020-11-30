module.exports = (sequelize, DataTypes) => {
    const Offers = sequelize.define('Offers', {
        title_fr: DataTypes.STRING,
        title_en: DataTypes.STRING,
        experience_fr: DataTypes.STRING,
        experience_en: DataTypes.STRING,
        additionalFees_fr: DataTypes.STRING,
        additionalFees_en: DataTypes.STRING,
        image: DataTypes.STRING,
        customImage: DataTypes.JSONB,
        isAvailable: DataTypes.BOOLEAN
    })
    Offers.defineAssociationsUsingModels = function (model, models) {
        model.belongsTo(models.Users)
    }
    return Offers
}
