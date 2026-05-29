const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/auth', authRoutes);
app.use('/properties', propertyRoutes);

module.exports = app;
