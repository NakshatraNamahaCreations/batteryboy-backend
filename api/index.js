// Vercel serverless entry point. Vercel calls this exported handler per
// request instead of running `app.listen()` — the DB connection is cached
// across warm invocations so it isn't re-opened on every request.
require('dotenv').config();
const app = require('../src/app');
const { connectDB } = require('../src/config/db');

let connectPromise = null;

module.exports = async (req, res) => {
  if (!connectPromise) connectPromise = connectDB();
  await connectPromise;
  return app(req, res);
};
