const jwt = require("jsonwebtoken");
const User = require("../../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-for-testing-only";

async function createUser(overrides = {}) {
  const defaults = {
    username: "testuser",
    password: "password123",
    firstName: "Test",
    lastName: "User",
    email: "testuser@test.com",
    role: "cashier",
    permissions: ["sales"],
    active: true,
  };
  const userData = { ...defaults, ...overrides };
  if (overrides.username && !overrides.email) {
    userData.email = overrides.username + "@test.com";
  }
  const user = await User.create(userData);
  return user;
}

async function createAdminUser(overrides = {}) {
  return createUser({
    username: "admin",
    firstName: "Admin",
    lastName: "User",
    email: "admin@test.com",
    role: "admin",
    permissions: [
      "sales",
      "refunds",
      "discounts",
      "reports",
      "inventory",
      "users",
      "settings",
    ],
    ...overrides,
  });
}

async function createManagerUser(overrides = {}) {
  return createUser({
    username: "manager",
    firstName: "Manager",
    lastName: "User",
    email: "manager@test.com",
    role: "manager",
    permissions: ["sales", "refunds", "discounts", "reports", "inventory"],
    ...overrides,
  });
}

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

function authHeader(user) {
  const token = generateToken(user);
  return { Authorization: "Bearer " + token };
}

module.exports = {
  createUser,
  createAdminUser,
  createManagerUser,
  generateToken,
  authHeader,
};
