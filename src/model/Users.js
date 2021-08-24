const Promise = require('bluebird')
const bcrypt = Promise.promisifyAll(require('bcrypt-nodejs'))

function hashPassword(user, options) {
    const SALT_FACTOR = 8
    if (!user.changed('password')) {
        return
    }
    return bcrypt
        .genSaltAsync(SALT_FACTOR)
        .then(salt => bcrypt.hashAsync(user.password, salt, null))
        .then(hash => {
            user.setDataValue('password', hash)
        })
}

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('Users', {
        firstname: DataTypes.STRING,
        lastname: DataTypes.STRING,
        uuid: {
            type: DataTypes.STRING,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            unique: true
        },
        region: DataTypes.STRING,
        subRegion: DataTypes.STRING,
        phone1: DataTypes.STRING,
        phone2: DataTypes.STRING,
        gender: DataTypes.STRING,
        pronoun: DataTypes.STRING,
        address: DataTypes.STRING,
        password: DataTypes.STRING,
        resetPasswordToken: DataTypes.STRING,
        resetPasswordExpires: DataTypes.DATE,
        status: DataTypes.STRING,
        locale: DataTypes.STRING,
        facebookId: DataTypes.STRING,
        preferredCommunication: DataTypes.JSONB,
        contactByEmail: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        contactByMessenger: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        },
        contactByPhone: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    }, {
        hooks: {
            beforeCreate: hashPassword,
            beforeUpdate: hashPassword
        },
        indexes: [{
            unique: true,
            fields: ['uuid', 'resetPasswordToken', 'email']
        }]
    })
    User.prototype.comparePassword = function (password) {
        return bcrypt.compareAsync(password, this.password)
    }
    User.getSafeAttributes = function () {
        return ["email", "id", "uuid", "locale", "firstname", "lastname", "status", "region", "subRegion", "subRegion", "phone1", "phone2", "gender", "address", "createdAt", "facebookId", "OrganisationId", "contactByEmail", "contactByMessenger", "contactByPhone", "pronoun", "preferredCommunication"]
    };
    User.getFewAttributes = function () {
        return ["uuid", "locale", "firstname", "lastname", "status", "gender"]
    };
    User.defineAssociationsUsingModels = function (model, models) {
        model.belongsTo(models.Users, {foreignKey: 'AdminUserId'});
        model.belongsTo(models.Organisations)
    };
    return User
}
