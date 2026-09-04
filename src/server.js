import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import { sendEmail, verifyEmailConnection } from "./utils/email.js";

const PORT = process.env.PORT || 5000;

await connectDB();

app.listen(PORT, "0.0.0.0", async () => {
  verifyEmailConnection();
  console.log(`Server is running on port ${PORT}, http://localhost:${PORT}`);
});
