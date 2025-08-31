const User = require('../models/userAuth');
const axios = require("axios");
const SkillMap = require('../models/skillmap');
require("dotenv").config();

module.exports = async function (req, res) {
  try {
    // 1️⃣ Fetch logged-in user
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");

    // 2️⃣ Check if skill gap analysis already exists
    let skillgap = await SkillMap.findOne({ userId: user._id });

    if (!skillgap || !skillgap.analysis) {
      // 3️⃣ Structured HTML prompt for Gemini
      const prompt = `
      Perform a detailed skill gap analysis for the following user:
      - Name: ${user.name}
      - Current Skills: ${user.skills.join(", ")}
      - Career Goal: ${user.goals}

      👉 Return ONLY valid HTML using this structure:
      <div class="section-box">
        <h5>Missing Skills</h5>
        <ul>
          <li>Skill 1</li>
          <li>Skill 2</li>
        </ul>
      </div>

      <div class="section-box">
        <h5>Learning Resources</h5>
        <ul>
          <li><a href="https://...">Resource 1</a></li>
          <li><a href="https://...">Resource 2</a></li>
        </ul>
      </div>

      <div class="section-box">
        <h5>Next Steps</h5>
        <p>Step-by-step plan for the user’s growth.</p>
      </div>

      ⚠️ Important: 
      - Do NOT return markdown or explanations, ONLY HTML inside these boxes.
      `;

      // 4️⃣ Call Gemini API
      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        },
        {
          headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      const analysis =
        response.data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No analysis generated.";

      // 5️⃣ Save to DB (create or update)
      if (!skillgap) {
        skillgap = new SkillMap({
          userId: user._id,
          analysis
        });
      } else {
        skillgap.analysis = analysis;
      }

      await skillgap.save();
    }

    // 6️⃣ Render the EJS with structured analysis
    res.render("skill-gap", { user, analysis: skillgap.analysis });

  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send("Error generating skill gap analysis: " + err.message);
  }
};
