const axios = require("axios");
const User = require("../models/userAuth");
const Advice = require("../models/carrer-advice"); // make sure path is correct
require("dotenv").config();

// === Utility: Parse Gemini Output ===
function extractPointsFromAI(text) {
  if (!text || !text.trim()) return [];

  // 1) Remove ```json / ``` wrappers if present
  text = text.replace(/```json|```/gi, "").trim();

  // 2) Try parsing as JSON
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.career_advice)) {
      return parsed.career_advice
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch (e) {
    // not valid JSON → continue to fallback
  }

  // 3) Split into lines (if plain text list)
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => l.replace(/^(\d+[\).\s-]+|•\s+|-{1,2}\s+)/, "").trim())
    .filter(Boolean);

  if (lines.length >= 1) return lines.slice(0, 5);

  // 4) Fallback: split into sentences
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  return sentences.slice(0, 5);
}

// === GET Route ===
exports.getCareerAdvice = async function (req, res) {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");

    const guidance = await Advice.findOne({ userId: user._id });

    if (!guidance || !Array.isArray(guidance.career_advice) || guidance.career_advice.length === 0) {
      return res.render("carrer-advice", { user, advice: [] });
    }

    res.render("carrer-advice", { user, advice: guidance.career_advice });
  } catch (err) {
    console.error("GET /career-advice error:", err);
    res.status(500).send("Server error");
  }
};

// === POST Route ===
exports.postCareerAdvice = async function (req, res) {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");

    // Prompt for Gemini
    const prompt = `
      You are a concise career advisor.
      Give exactly 5 short, actionable career recommendations for ${user.name}.
      Skills: ${user.skills && user.skills.length ? user.skills.join(", ") : "none"}.
      Respond ONLY in pure JSON format like this:
      {"career_advice": ["point1","point2","point3","point4","point5"]}
      Do not add any text, explanations, or commentary.
    `;

    // Gemini API call
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
      { contents: [{ role: "user", parts: [{ text: prompt }] }] },
      {
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log("AI rawText:", rawText); // debug

    const points = extractPointsFromAI(rawText);
    console.log("Parsed points:", points); // debug

    // Ensure we always have something
    const finalPoints = points.length > 0 ? points : ["No advice generated. Try again."];

    // Upsert into DB
    const guidance = await Advice.findOneAndUpdate(
      { userId: user._id },
      { career_advice: finalPoints },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Render updated advice
    res.render("carrer-advice", { user, advice: guidance.career_advice });
  } catch (err) {
    console.error("POST /career-advice error:", err.response?.data || err.message || err);
    res.status(500).send("Error generating career advice. Check server logs.");
  }
};
