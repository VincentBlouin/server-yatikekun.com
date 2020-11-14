module.exports = (sequelize, DataTypes) => {
    const Offers = sequelize.define('Offers', {
        title_fr: DataTypes.STRING,
        title_en: DataTypes.STRING,
        image: DataTypes.STRING,
        imageCustom: DataTypes.JSONB
    })
    Offers.defineAssociationsUsingModels = function (model, models) {
        model.belongsTo(models.Users)
    }
    return Offers
}
