/**
 * UserThread Schema
 */
module.exports = (sequelize, DataTypes) => {
    const UserThread = sequelize.define('UserThread', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        lastMessageRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false,
        }
    });
    // Class methods

    return UserThread;
};
