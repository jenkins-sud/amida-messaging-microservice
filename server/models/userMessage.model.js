/**
 * UserMessage Schema
 */
module.exports = (sequelize, DataTypes) => {
    const UserMessage = sequelize.define('UserMessage', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        isArchived: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        },
        readAt: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    });
    // Class methods

    return UserMessage;
};
