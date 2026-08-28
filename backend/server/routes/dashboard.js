const express = require('express');
const router = express.Router();
const { Member, Attendance, Payment } = require('../models');
const auth = require('../middleware/auth');
const sequelize = require('../config/db');

router.get('/stats', auth, async (req, res) => {
  try {
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { status: 'active' } });
    
    // Attendance today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const attendanceToday = await Attendance.count({
      where: {
        checkIn: { [require('sequelize').Op.gte]: startOfDay }
      }
    });

    // Total revenue
    const revenue = await Payment.sum('amount', { where: { status: 'paid' } });

    res.json({
      totalMembers,
      activeMembers,
      attendanceToday,
      revenue: revenue || 0
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
