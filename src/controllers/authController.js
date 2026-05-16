const { validationResult } = require("express-validator");
const User = require("../models/User");
const { signToken } = require("../utils/token");

const sendAuthResponse = (res, statusCode, user) => {
  const token = signToken({ id: user._id.toString() });

  return res.status(statusCode).json({
    success: true,
    token,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
};

const signup = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { name, email, password } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = new User({ name, email });
    user.setPassword(password);
    await user.save();

    return sendAuthResponse(res, 201, user);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while creating account",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array(),
    });
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+passwordHash +passwordSalt"
    );

    if (!user || !user.comparePassword(password)) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while signing in",
      error: error.message,
    });
  }
};

const me = async (req, res) =>
  res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });

module.exports = { signup, login, me };
