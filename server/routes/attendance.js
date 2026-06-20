const express = require('express');
const router = express.Router();
const { Attendance, Member } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// Log check-in
router.post('/checkin', auth, async (req, res) => {
  try {
    const { membershipId } = req.body;
    const member = await Member.findOne({ where: { membershipId } });
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const attendance = await Attendance.create({ MemberId: member.id });
    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Log check-out
router.post('/checkout', auth, async (req, res) => {
  try {
    const { attendanceId } = req.body;
    const attendance = await Attendance.findByPk(attendanceId);
    if (!attendance) return res.status(404).json({ message: 'Attendance record not found' });

    const checkOut = new Date();
    const diff = Math.round((checkOut - attendance.checkIn) / 60000); // minutes
    await attendance.update({ checkOut, duration: diff });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get attendance logs
router.get('/', auth, async (req, res) => {
  try {
    const logs = await Attendance.findAll({
      include: [Member],
      order: [['checkIn', 'DESC']],
      limit: 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
