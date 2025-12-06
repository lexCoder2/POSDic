const jwt = require("jsonwebtoken");

const generateToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET || "fallback_secret_key";
  const jwtExpire = process.env.JWT_EXPIRE || "7d";

  // Debug logging
  if (!process.env.JWT_SECRET) {
    console.warn("WARNING: JWT_SECRET not set in environment, using fallback");
  }
  if (!process.env.JWT_EXPIRE) {
    console.warn("WARNING: JWT_EXPIRE not set in environment, using default 7d");
  }

  console.log("Generating token with expiresIn:", jwtExpire);

  return jwt.sign({ id: userId }, jwtSecret, {
    expiresIn: jwtExpire,
  });
};

const verifyToken = (token) => {
  try {
    const jwtSecret = process.env.JWT_SECRET || "fallback_secret_key";
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
