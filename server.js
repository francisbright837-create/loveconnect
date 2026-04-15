const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const authRoutes = require("./routes/auth");
const matchRoutes = require("./routes/match");
const profileRoutes = require("./routes/profile");
const messageRoutes = require("./routes/message");

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1:27017/loveconnect")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err.message));

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, "SECRET_KEY");
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

app.use("/api/auth", authRoutes);
app.use("/api/profile", authMiddleware, profileRoutes);
app.use("/api/match", authMiddleware, matchRoutes);
app.use("/api/messages", authMiddleware, messageRoutes);

app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ message: err.message || 'Server error' });
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://10.62.171.199:${PORT}`);
  console.log(`💻 Local: http://localhost:${PORT}`);
});