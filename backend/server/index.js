const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelize, User, Plan } = require('./models');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/members', require('./routes/members'));
app.use('/api/plans', require('./routes/plans'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));

const PORT = process.env.PORT || 5000;

sequelize.sync({ alter: true }).then(async () => {
  console.log('Database synced');
  
  // Seed admin user if not exists
  const adminExists = await User.findOne({ where: { email: 'admin@gmail.com' } });
  if (!adminExists) {
    await User.create({
      email: 'admin@gmail.com',
      password: '123',
      name: 'Super Admin',
      role: 'admin',
    });
    console.log('Seed: Admin user created (admin@gmail.com / 123)');
  }

  const plansCount = await Plan.count();
  if (plansCount === 0) {
    await Plan.bulkCreate([
      { name: 'Basic', price: 29.99, durationMonths: 1, category: 'General' },
      { name: 'Standard', price: 79.99, durationMonths: 3, category: 'General' },
      { name: 'Premium', price: 149.99, durationMonths: 6, category: 'General' },
    ]);
    console.log('Seed: Default plans created');
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database sync failed:', err);
});
