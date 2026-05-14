// Placeholder - actual DB setup is handled per-test-file in setup.js
module.exports = async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-jwt-secret-for-testing-only";
};
