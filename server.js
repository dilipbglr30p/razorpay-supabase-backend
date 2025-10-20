import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";

dotenv.config();

// ✅ Log environment status for Railway
console.log("🔧 Loaded Env:", {
  RAZORPAY_KEY_ID: !!process.env.RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: !!process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: !!process.env.RAZORPAY_WEBHOOK_SECRET,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "default",
});

// ✅ Validate required credentials
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("❌ Missing Razorpay credentials!");
  process.exit(1);
}

const app = express();

// ✅ Dynamic CORS setup
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "https://razorpay-frontend-static.vercel.app",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());

// ✅ Health route for Railway monitoring
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: {
      hasRazorpayKey: !!process.env.RAZORPAY_KEY_ID,
      hasWebhookSecret: !!process.env.RAZORPAY_WEBHOOK_SECRET,
      allowedOrigins,
    },
  });
});

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🚀 Razorpay backend live on Railway!");
});

// ✅ Create Razorpay order
app.post("/create-order", async (req, res) => {
  try {
    console.log("🧾 Creating Razorpay order...");
    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
    const order = await instance.orders.create({
      amount: 50000, // ₹500 in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    console.log("✅ Order created:", order.id);
    res.status(200).json(order);
  } catch (error) {
    console.error("❌ Order error:", error.message);
    res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
});

// ✅ Razorpay Webhook verification
app.post("/webhook", (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.warn("⚠️ Webhook secret not configured");
      return res.status(200).json({ status: "ok" });
    }

    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest === req.headers["x-razorpay-signature"]) {
      console.log("✅ Webhook verified:", req.body.event);
      if (req.body.event === "payment.captured") {
        const paymentId = req.body.payload?.payment?.entity?.id;
        console.log("💰 Payment captured:", paymentId);
      }
      return res.status(200).json({ status: "ok" });
    }

    console.log("❌ Invalid webhook signature");
    res.status(400).json({ status: "invalid signature" });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);
    res.status(500).json({ error: "Webhook failed" });
  }
});

// ✅ Start Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/health`);
  console.log(`🔗 CORS allowed origins: ${allowedOrigins.join(", ")}`);
});
