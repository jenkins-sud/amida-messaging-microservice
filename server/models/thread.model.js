/**
 * Thread Schema
 */
module.exports = (sequelize, DataTypes) => {
    const Thread = sequelize.define('Thread', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        topic: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        lastMessageId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
        lastMessageSent: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        logUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },
    });
    return Thread;
};
