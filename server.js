import express from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();
const app = express();

app.get("/health", (req, res) => res.status(200).send("OK"));

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];
    const body = req.body;
    const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");

    console.log("📬 Webhook received:", JSON.parse(body.toString()).event);
    console.log("🔒 Signature received:", signature);
    console.log("🧮 Signature computed:", expected);

    if (signature === expected) {
      console.log("✅ Webhook verified successfully");
      return res.status(200).json({ status: "ok" });
    } else {
      console.error("❌ Signature mismatch");
      return res.status(400).json({ error: "invalid signature" });
    }
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

app.use(express.json());

app.post("/create-order", async (req, res) => {
  try {
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const { amount, currency, receipt } = req.body;
    const order = await rzp.orders.create({
      amount,
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({ order });
  } catch (err) {
    console.error("create-order failed:", err);
    res.status(500).json({ error: "create-order failed" });
  }
});

app.get("/", (req, res) => res.send("Razorpay backend is running."));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
