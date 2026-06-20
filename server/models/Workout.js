const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Workout = sequelize.define('Workout', {
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
    type: DataTypes.STRING, // e.g., Weight Loss, Muscle Gain
  },
  exercises: {
    type: DataTypes.JSONB, // Array of exercises with reps/sets
  }
});

module.exports = Workout;
