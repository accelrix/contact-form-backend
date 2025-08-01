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

const internshipUserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  fullName: String,
  gender: String,
  mobileNumber: String,
  internshipTrack: String,
  highestAcademicQualification: String,
  collegeName: String,
  passingYear: Number,
  country: String,
  joinedLinkedIn: String, // or Boolean if preferred
  questions: String,
  internId: { type: String, unique: true, required: true },
  startDate: Date,
  endDate: Date,
  issueDate: Date,
  offerLetterSentStatus: String, // or Boolean
  internshipCompleted: String, // or Boolean
  certificateSentStatus: String, // or Boolean
  createdAt: { type: Date, default: Date.now },
});

const InternshipUser = mongoose.model(
  "InternshipUser",
  internshipUserSchema,
  "internship-users-2025"
);

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
      html: `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333333; background-color: #f9f9f9; padding: 10px 15px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>
          <td style="padding: 0; text-align: center; border-radius: 8px 8px 0 0; overflow: visible;">
            <img src="cid:accelrixbanner" alt="Accelrix Banner" width="100%" style="display: block; max-width: 600px; height: auto; border-radius: 8px 8px 0 0;" />
          </td>
        </tr>
        <tr>
          <td style="padding: 25px 30px;">
            <h2 style="margin: 0 0 15px 0; color: #007FFF; font-size: 24px; line-height: 1.2;">Hi ${name},</h2>
            <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.5;">
              Thank you for reaching out to <strong>Accelrix</strong>! 🎉<br />
              We’ve received your message and our team will get back to you as soon as possible. You can typically expect a response within 24–48 hours.
            </p>
            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.5;">
              In the meantime, feel free to explore more about what we offer on our website.
            </p>
            <a href="https://accelrix-buildbeyond.web.app" target="_blank" style="display: inline-block; background-color: #007FFF; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 16px;">
              Visit Accelrix Website
            </a>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eeeeee;" />
            <p style="font-size: 14px; color: #777777; margin: 0;">
              This is an automated response confirming that we've received your message. Our support team will reach out shortly.
            </p>
            <p style="font-size: 14px; color: #999999; margin-top: 40px; line-height: 1.4;">
              — The Accelrix Team<br />
         
            </p>
          </td>
        </tr>
      </table>
    </div>`,
      attachments: [
        {
          filename: "banner.png",
          path: "./assets/banner.png",
          cid: "accelrixbanner",
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

// ✅ POST /api/interns/bulk-insert
// POST /api/interns/bulk-insert
app.post("/api/interns/bulk-insert", async (req, res) => {
  let docs = req.body.documents;

  if (!Array.isArray(docs) || docs.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No documents provided" });
  }

  docs = docs.map((doc) => ({
    ...doc,
    startDate: doc.startDate ? new Date(doc.startDate) : undefined,
    endDate: doc.endDate ? new Date(doc.endDate) : undefined,
    issueDate: doc.issueDate ? new Date(doc.issueDate) : undefined,
  }));

  try {
    const result = await InternshipUser.insertMany(docs, { ordered: false });
    res.status(200).json({ success: true, insertedCount: result.length });
  } catch (error) {
    console.error("Bulk insert error:", error);
    res
      .status(500)
      .json({ success: false, message: "Insert failed", error: error.message });
  }
});

// GET /api/interns/verify?id=your_internId
app.get("/api/interns/verify", async (req, res) => {
  const internId = req.query.id;

  if (!internId) {
    return res
      .status(400)
      .json({ success: false, message: "Missing intern ID" });
  }

  try {
    const intern = await InternshipUser.findOne({ internId }).lean();

    if (!intern) {
      return res
        .status(404)
        .json({ success: false, message: "Intern not found" });
    }

    res.status(200).json({ success: true, intern });
  } catch (error) {
    console.error("Verify intern error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
