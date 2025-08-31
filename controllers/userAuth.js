const User = require("../models/userAuth");

// Register User
const handleRegister = async (req, res) => {
  const { name, email, password, age, gender, phonenumber ,profession, skills, goals,education } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.send("Email already registered!");

    const user = new User({
      name,
      email,
      password, // plain text → will be hashed automatically by pre("save")
      age,
      gender,
      phonenumber,
      profession,
      skills: skills ? skills.split(",").map(s => s.trim()) : [],
      goals,
      education,
      progress: 0,
      recommendations: ["Explore AI", "Build Portfolio", "Upskill in Cloud"],
    });
    console.log(user)

    await user.save();
    res.redirect("/login");
  } catch (err) {
    res.send("Error registering user: " + err.message);
  }
};

// Login User
const handleLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.render("login-failed");

    const isMatch = await user.comparePassword(password); // use model method
    if (!isMatch) return res.render("login-failed");

    // Store session
    req.session.userId = user._id;
    res.redirect("/dashboard");
  } catch (err) {
    res.send("Error logging in: " + err.message);
  }
};

// Logout User
const handleLogout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
};

// Protect Middleware
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
};

module.exports = { handleRegister, handleLogin, handleLogout, requireLogin };
