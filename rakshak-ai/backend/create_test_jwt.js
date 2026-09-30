const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/.env" });
const { User } = require("./models");
const { generateToken } = require("./config/jwt");
const { hash } = require("bcryptjs");

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/rakshak-ai";
  const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_jwt_key_change_this_in_production";
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = JWT_SECRET;
  if (!process.env.JWT_EXPIRES_IN) process.env.JWT_EXPIRES_IN = "7d";
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("MongoDB connected.");

  const email = "test-rag@rakshak.ai";
  let u = await User.findOne({ email });
  if (!u) {
    const hashed = await hash("Test@12345", 10);
    u = new User({
      name: "RAG Test User",
      email,
      password: hashed,
      role: "investigator",
      badgeNumber: "RAG-TEST-001",
      department: "AI Crime Intelligence Unit",
      isActive: true,
    });
    await u.save();
    console.log("Created new test user:", u._id, email);
  } else {
    console.log("Found existing test user:", u._id, email);
    if (!u.isActive) { u.isActive = true; await u.save(); console.log("Activated user"); }
  }
  const token = "Bearer " + generateToken({ id: u._id.toString(), email: u.email, role: u.role });
  console.log("--------------------- HTTP 8001 TEST JWT ---------------------");
  console.log(token);
  console.log("---------------------------------------------------------------");
  await mongoose.disconnect();
}
main().catch(err => { console.error(err); process.exit(1); });
