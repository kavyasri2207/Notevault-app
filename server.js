require("dotenv").config();

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start the server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    console.log(`📋 Notes API: http://localhost:${PORT}/api/notes`);
    console.log(`❤️  Health:    http://localhost:${PORT}/health`);
  });
};

startServer();