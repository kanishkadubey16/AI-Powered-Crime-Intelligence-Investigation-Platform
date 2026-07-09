const { User } = require("../models");
const { generateToken } = require("../config/jwt");

const tokenResponse = (user, statusCode, res) => {
  const token = generateToken({ id: user._id, role: user.role });
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      badgeNumber: user.badgeNumber,
      department: user.department,
      createdAt: user.createdAt,
    },
  });
};

// POST /api/auth/register
const register = async (req, res) => {
  const { name, email, password, role, badgeNumber, department } = req.body;

  const existingUser = await User.findOne({ $or: [{ email }, { badgeNumber: badgeNumber?.toUpperCase() }] });
  if (existingUser) {
    const field = existingUser.email === email.toLowerCase() ? "Email" : "Badge number";
    return res.status(409).json({ success: false, message: `${field} already registered.` });
  }

  const user = await User.create({ name, email, password, role, badgeNumber, department });
  tokenResponse(user, 201, res);
};

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, message: "Account deactivated. Contact admin." });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid email or password." });
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  tokenResponse(user, 200, res);
};

// GET /api/auth/me
const getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate("assignedCases", "caseNumber title status");
  res.status(200).json({ success: true, user });
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  const allowed = ["name", "department"];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  res.status(200).json({ success: true, user });
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: "Both passwords are required." });
  }

  const user = await User.findById(req.user._id).select("+password");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Current password is incorrect." });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ success: true, message: "Password updated successfully." });
};

module.exports = { register, login, getMe, updateProfile, changePassword };
