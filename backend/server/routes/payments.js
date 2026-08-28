const express = require('express');
const router = express.Router();
const { Payment, Member } = require('../models');
const auth = require('../middleware/auth');

// Get all payments
router.get('/', auth, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [Member],
      order: [['paymentDate', 'DESC']]
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create payment
router.post('/', auth, async (req, res) => {
  try {
    const { MemberId, amount, method, status } = req.body;
    const payment = await Payment.create({ MemberId, amount, method, status });
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
