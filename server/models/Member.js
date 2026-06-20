const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'blocked'),
    defaultValue: 'active',
  },
  joinDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  expiryDate: {
    type: DataTypes.DATE,
  },
  membershipId: {
    type: DataTypes.STRING,
    unique: true,
    defaultValue: () => `FIT-${Math.floor(1000 + Math.random() * 9000)}`
  }
});

module.exports = Member;
