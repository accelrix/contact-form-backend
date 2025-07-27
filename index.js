const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS: Allow frontend domain
app.use(
  cors({
    origin: "https://accelrix-buildbeyond.web.app",
    methods: ["GET", "POST"],
    credentials: true,
  })
);

app.use(bodyParser.json()); // For req.body

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ✅ Mongoose schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  subject: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});
const Contact = mongoose.model("Contact", contactSchema);

// ✅ Health route
app.get("/", (req, res) => {
  res.send("Accelrix contact API is running 🚀");
});

// ✅ POST /api/contact
app.post("/api/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !subject || !message) {
    return res
      .status(400)
      .json({ success: false, message: "Missing required fields" });
  }

  try {
    // ✅ Save to DB
    const newMessage = new Contact({ name, email, phone, subject, message });
    await newMessage.save();

    // ✅ Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // ✅ Admin Mail
    const adminMailOptions = {
      from: `"${name}" <${email}>`,
      to: process.env.EMAIL_TO,
      subject: `📬 ${subject}`,
      html: `
        <h3>New Contact Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ""}
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    // ✅ Auto-reply Mail to User
    const autoReplyOptions = {
      from: `"Accelrix Team" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "📬 We've received your message – Accelrix",
      html: `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px;">
      <!-- Banner Image -->
      <div style="text-align: center; background-color: #ffffff; border-radius: 8px 8px 0 0; overflow: hidden;">
        <img src="cid:accelrixbanner" alt="Accelrix Banner" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;" />
      </div>

      <!-- Content Box -->
      <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">

        <h2 style="color: #007FFF;">Hi ${name},</h2>

        <p style="font-size: 16px; line-height: 1.6;">
          Thank you for reaching out to <strong>Accelrix</strong>! 🎉<br />
          We’ve received your message and our team will get back to you as soon as possible. You can typically expect a response within 24–48 hours.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          In the meantime, feel free to explore more about what we offer on our website.
        </p>

        <a href="https://accelrix-buildbeyond.web.app" target="_blank" style="display: inline-block; margin-top: 20px; background-color: #007FFF; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Visit Accelrix Website
        </a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />

        <p style="font-size: 14px; color: #777;">
          This is an automated response confirming that we've received your message. Our support team will reach out shortly.
        </p>

        <p style="font-size: 14px; color: #999; margin-top: 40px;">
          — The Accelrix Team<br />
          <a href="mailto:team@accelrix.in" style="color: #007FFF;">team@accelrix.in</a>
        </p>
      </div>
    </div>
  `,
      attachments: [
        {
          filename: "banner.png", // Your banner image
          path: "./assets/banner.png", // Adjust path as needed
          cid: "accelrixbanner", // Must match cid in <img src="cid:...">
        },
      ],
    };

    // ✅ Send both mails
    await transporter.sendMail(adminMailOptions);
    await transporter.sendMail(autoReplyOptions);

    res.status(200).json({ success: true, message: "Message sent and saved!" });
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
