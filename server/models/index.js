const sequelize = require('../config/db');
const User = require('./User');
const Member = require('./Member');
const Plan = require('./Plan');
const Attendance = require('./Attendance');
const Payment = require('./Payment');
const Notification = require('./Notification');
const Workout = require('./Workout');
const Diet = require('./Diet');

// Associations
Member.belongsTo(Plan);
Plan.hasMany(Member);

Attendance.belongsTo(Member);
Member.hasMany(Attendance);

Payment.belongsTo(Member);
Member.hasMany(Payment);

Notification.belongsTo(Member);
Member.hasMany(Notification);

Member.belongsTo(Workout);
Member.belongsTo(Diet);

module.exports = {
  sequelize,
  User,
  Member,
  Plan,
  Attendance,
  Payment,
  Notification,
  Workout,
  Diet
};
