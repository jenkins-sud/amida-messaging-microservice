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
        lastMessageSent: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    });
    return Thread;
};
