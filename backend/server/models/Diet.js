const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Diet = sequelize.define('Diet', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  details: {
    type: DataTypes.JSONB, // Meal plan details
  }
});

module.exports = Diet;
