const express = require('express');
const router = express.Router();
const { Member, Payment, Attendance } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../config/db');

router.get('/analytics', auth, async (req, res) => {
  try {
    // Member growth (last 6 months)
    const memberGrowth = await Member.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      group: ['month'],
      order: [['month', 'ASC']],
      limit: 6
    });

    // Revenue trend
    const revenueTrend = await Payment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('paymentDate')), 'month'],
        [sequelize.fn('sum', sequelize.col('amount')), 'total']
      ],
      where: { status: 'paid' },
      group: ['month'],
      order: [['month', 'ASC']],
      limit: 6
    });

    res.json({
      memberGrowth,
      revenueTrend
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
