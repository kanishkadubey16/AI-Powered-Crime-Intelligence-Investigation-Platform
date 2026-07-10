const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Database name comes ONLY from the URI in .env — no dbName override here.
    // Having dbName here AND in the URI creates two sources of truth and caused
    // rakshak_ai (underscore) to be created whenever they disagreed.
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("✅ MongoDB Connected");
    console.log("Host    :", conn.connection.host);
    console.log("Database:", conn.connection.db.databaseName);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;