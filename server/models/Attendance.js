const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  checkIn: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  checkOut: {
    type: DataTypes.DATE,
  },
  duration: {
    type: DataTypes.INTEGER, // in minutes
  }
});

module.exports = Attendance;
