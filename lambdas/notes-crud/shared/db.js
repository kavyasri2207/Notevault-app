const mongoose = require("mongoose");

let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb && mongoose.connection.readyState === 1) {
    return cachedDb;
  }

  // DocumentDB requires authMechanism=SCRAM-SHA-1 for standard users
  const uri = `mongodb://${process.env.DOCDB_USERNAME}:${process.env.DOCDB_PASSWORD}@${process.env.DOCDB_ENDPOINT}:27017/notesapp?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false&authMechanism=SCRAM-SHA-1`;

  const options = {
    serverSelectionTimeoutMS: 5000,
    // If TLS was enabled, you'd add:
    // tls: true,
    // tlsCAFile: 'global-bundle.pem'
  };

  try {
    cachedDb = await mongoose.connect(uri, options);
    console.log("Connected to DocumentDB");
    return cachedDb;
  } catch (error) {
    console.error("DocumentDB connection error:", error);
    throw error;
  }
};

module.exports = { connectToDatabase };
