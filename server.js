import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Missing Razorpay credentials!");
  process.exit(1);
}

const app = express();

// Dynamic CORS origins from environment variable
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || ["https://razorpay-frontend-static.vercel.app"];

// CORS FIRST
app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.options("*", cors());

// JSON parser
app.use(express.json());

// Health
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Root
app.get("/", (_req, res) => {
  res.send("🚀 Railway backend active and CORS configured!");
});

// Create order
app.post("/create-order", async (_req, res) => {
  try {
    console.log("🧾 Creating order...");
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await rzp.orders.create({
      amount: 50000, // ₹500 in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    console.log("✅ Order created:", order.id);
    res.status(200).json(order);
  } catch (err) {
    console.error("❌ Create order error:", err);
    res.status(500).json({ error: "Failed to create order", details: String(err?.message || err) });
  }
});

// Webhook
app.post("/webhook", (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("⚠️ Webhook secret not set, skipping verification");
      return res.status(200).json({ status: "ok" });
    }
    const h = crypto.createHmac("sha256", secret);
    h.update(JSON.stringify(req.body));
    const digest = h.digest("hex");
    if (digest === req.headers["x-razorpay-signature"]) {
      console.log("✅ Webhook verified:", req.body.event);
      if (req.body.event === "payment.captured") {
        console.log("💰 Payment captured:", req.body?.payload?.payment?.entity?.id);
      }
      return res.status(200).json({ status: "ok" });
    }
    console.log("❌ Invalid webhook signature");
    res.status(400).json({ status: "invalid signature" });
  } catch (err) {
    console.error("❌ Webhook error:", err);
    res.status(500).json({ error: "Webhook failed" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
});
