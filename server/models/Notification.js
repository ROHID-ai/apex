const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
  },
  type: {
    type: DataTypes.ENUM('email', 'sms', 'app'),
    defaultValue: 'app',
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed', 'pending'),
    defaultValue: 'pending',
  }
});

module.exports = Notification;
