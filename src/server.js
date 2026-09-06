import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { verifyEmailConnection } from "./utils/email.js";

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

await connectDB();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);
  void verifyEmailConnection();
});
