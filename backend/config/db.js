// config/db.js
// This file handles the MongoDB connection using Mongoose

const mongoose = require('mongoose'); // Mongoose lets us talk to MongoDB

const connectDB = async () => {
  try {
    // mongoose.connect() takes the MongoDB URL from your .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // If connection works, print a success message
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If it fails, print the error and exit the program
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1); // 1 means "exited with an error"
  }
};

module.exports = connectDB; // Export so server.js can use it