const express = require("express");
const User=require('../models/userAuth')
const Recommendation = require("../models/career-guidance");
const { handleRegister, handleLogin, handleLogout, requireLogin } = require("../controllers/userAuth");
const skillgaphandler=require('../controllers/skillGap')
const getCareerRecommendations=require('../controllers/genAi')
const carreradvice=require('../controllers/genAi');
const { generateRoadMap,updateProgress } = require("../controllers/genrateRoadMap");
const {getForgotPassword,
  postForgotPassword,
  getResetPassword,
  postResetPassword}=require('../controllers/forget-password')
const multer=require('multer');
const path = require("path");
const  {handleRoadMapAnalysis,getResumeUploadPage}= require("../controllers/resumeAnalsyis");
const careerCtrl =require('../controllers/carreradvice')
const CareerGuidance=require('../models/carrer-advice')

const router = express.Router();

router.get("/register", (req, res) => res.render("register"));
router.post("/register", handleRegister);

router.get("/login", (req, res) => res.render("login"));
router.post("/login", handleLogin);

router.get("/dashboard", requireLogin, async (req, res) => {
  try {
    // 1️⃣ Fetch logged-in user
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");

    // 2️⃣ Check if recommendations already exist
    let recs = await Recommendation.findOne({ userId: user._id });

    // 3️⃣ If not, fetch from Gemini and save
    if (!recs) {
      const data = await getCareerRecommendations(user);

      recs = new Recommendation({
        userId: user._id,
        careers: data.careers,
        courses: data.courses,
        links: data.links
      });

      await recs.save();
    }

   
    res.render("dashboard", {
      user: {
        ...user.toObject(),
        recommendations: recs.careers,
        courses: recs.courses,
        links: recs.links
      }
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).send("Something went wrong");
  }
});
router.get("/logout", handleLogout);

router.get("/career-advice", requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    // Find advice for this user
    const guidance = await CareerGuidance.findOne({ userId: user._id });

    res.render("carrer-advice", { 
      user, 
      advice: guidance ? guidance.career_advice : []  // ✅ always defined
    });
  } catch (err) {
    console.error("Error fetching career advice:", err.message);
    res.status(500).send("Error loading career advice page");
  }
});
router.post("/career-advice", requireLogin, careerCtrl.postCareerAdvice);



router.get('/skill-gap',skillgaphandler);

router.get('/generate-roadmap',generateRoadMap)

router.post('/roadmap/update', updateProgress);

router.get('/forgot-password', getForgotPassword);

// 2️⃣ Handle Forgot Password Form (send reset email)
router.post('/forgot-password', postForgotPassword);

// 3️⃣ Render Reset Password Page (from link in email)
router.get('/reset-password/:token', getResetPassword);

// 4️⃣ Handle Reset Password Form (update password)
router.post('/reset-password/:token', postResetPassword);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // ✅ always absolute
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// === Routes ===
router.get("/resume-upload", getResumeUploadPage);
router.post("/resume-upload", upload.single("resume"), handleRoadMapAnalysis);

module.exports = router;

