require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { startDispatchSweeper } = require('./services/dispatch');

const PORT = process.env.PORT || 4000;

async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Battery Boy API listening on http://localhost:${PORT}`);
  });
  startDispatchSweeper();
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
