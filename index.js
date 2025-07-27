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
      subject: "🤝 Thanks for contacting Accelrix!",
      html: `
    <div style="font-family: Arial, sans-serif;">
      <!-- Banner Image -->
      <div style="text-align: center;">
        <img src="cid:accelrixbanner" alt="Accelrix Banner" style="width: 100%; max-width: 600px; display: block; margin: 0 auto;" />
      </div>

      <!-- Content -->
      <div style="padding: 20px; text-align: center;">
        <h2 style="margin-bottom: 10px;">Hi ${name},</h2>
        <p style="font-size: 16px;">Thank you for contacting <strong>Accelrix</strong>.</p>
        <p style="font-size: 16px;">We’ve received your message and will get back to you soon.</p>

        <p style="margin-top: 20px;">
          Visit us: <a href="https://accelrix-buildbeyond.web.app" style="color: #007bff;">accelrix-buildbeyond.web.app</a>
        </p>

        <p style="color: gray; margin-top: 30px;">– Accelrix Team</p>
      </div>
    </div>
  `,
      attachments: [
        {
          filename: "banner.png", // 🖼️ your banner image
          path: "./assets/banner.png", // ✅ adjust path
          cid: "accelrixbanner", // 👈 used in the HTML img src
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
