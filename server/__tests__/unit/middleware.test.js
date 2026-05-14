const jwt = require("jsonwebtoken");
const { protect, checkPermission } = require("../../middleware/auth");
const User = require("../../models/User");

const JWT_SECRET = "test-jwt-secret-for-testing-only";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("protect middleware", () => {
  it("should return 401 if no token", async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 for invalid token", async () => {
    const req = { headers: { authorization: "Bearer invalid.token" } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("should call next with valid token and existing user", async () => {
    const user = await User.create({
      username: "mwtest",
      password: "hashed",
      firstName: "MW",
      lastName: "Test",
      email: "mwtest@test.com",
      role: "cashier",
      permissions: ["sales"],
      active: true,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.username).toBe("mwtest");
  });

  it("should return 401 for deactivated user token", async () => {
    const user = await User.create({
      username: "inactive_user",
      password: "hashed",
      firstName: "Inactive",
      lastName: "User",
      email: "inactive@test.com",
      role: "cashier",
      permissions: ["sales"],
      active: false,
    });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();

    await protect(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe("checkPermission middleware", () => {
  it("should call next if admin (bypass permission check)", () => {
    const req = {
      user: { role: "admin", permissions: [] },
    };
    const res = mockRes();
    const next = jest.fn();

    checkPermission("inventory")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should call next if user has required permission", () => {
    const req = {
      user: { role: "cashier", permissions: ["sales", "inventory"] },
    };
    const res = mockRes();
    const next = jest.fn();

    checkPermission("inventory")(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it("should return 403 if user lacks required permission", () => {
    const req = {
      user: { role: "cashier", permissions: ["sales"] },
    };
    const res = mockRes();
    const next = jest.fn();

    checkPermission("inventory")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
