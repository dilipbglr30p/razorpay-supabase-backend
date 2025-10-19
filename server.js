// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();
const app = express();

// ✅ Apply CORS BEFORE routes
app.use(cors({
  origin: "https://razorpay-frontend-static.vercel.app",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());

app.use(express.json());

// ✅ Health Check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// ✅ Main create-order route
app.post("/create-order", async (req, res) => {
  try {
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const options = {
      amount: 50000, // 500 INR in paise
      currency: "INR",
      receipt: "receipt#1",
    };

    const order = await instance.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Webhook endpoint
app.post("/webhook", (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const shasum = crypto.createHmac("sha256", secret);
  shasum.update(JSON.stringify(req.body));
  const digest = shasum.digest("hex");

  if (digest === req.headers["x-razorpay-signature"]) {
    console.log("✅ Webhook verified successfully");
    res.status(200).json({ status: "ok" });
  } else {
    console.log("❌ Invalid signature");
    res.status(400).json({ status: "invalid signature" });
  }
});

// ✅ Default root route (for testing)
app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
