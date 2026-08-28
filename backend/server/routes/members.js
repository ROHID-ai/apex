const express = require('express');
const router = express.Router();
const { Member, Plan } = require('../models');
const auth = require('../middleware/auth');
const { Op } = require('sequelize');

// Get all members with search and pagination
router.get('/', auth, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const { count, rows } = await Member.findAndCountAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ]
      },
      include: [Plan],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      members: rows,
      total: count,
      pages: Math.ceil(count / limit)
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create member
router.post('/', auth, async (req, res) => {
  try {
    const { name, email, phone, PlanId, expiryDate } = req.body;
    const member = await Member.create({ name, email, phone, PlanId, expiryDate });
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update member
router.put('/:id', auth, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await member.update(req.body);
    res.json(member);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete member (soft delete could be implemented by updating status)
router.delete('/:id', auth, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    await member.destroy();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
