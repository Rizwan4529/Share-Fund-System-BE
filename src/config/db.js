import mongoose from "mongoose";

const DEFAULT_DB_NAME = "sharefundsystem";

const databaseNameFromUri = (uri) => {
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, "").trim();
    return pathname || null;
  } catch {
    return null;
  }
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error("MONGO_URI is required");
    }

    const dbName =
      process.env.MONGO_DB_NAME ||
      databaseNameFromUri(uri) ||
      DEFAULT_DB_NAME;

    const conn = await mongoose.connect(uri, { dbName });
    console.log(
      `MongoDB connected: ${conn.connection.host} / database "${conn.connection.name}"`,
    );
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
