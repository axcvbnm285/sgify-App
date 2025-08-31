const User = require("../models/userAuth");
const RoadMap = require("../models/roadmap");
const skillGap = require("../models/skillmap");
require("dotenv").config();
const axios = require("axios");

// ---- helper: safely extract/parse JSON from AI text ----
function safeParseJSON(text) {
  if (!text || typeof text !== "string") return null;
  let t = text.trim();

  // If fenced code block, take the inside
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();

  // Slice to first { … last }
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) t = t.slice(first, last + 1);

  // Normalize smart quotes & remove trailing commas
  t = t
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(t);
  } catch (e) {
    console.error("safeParseJSON failed:", e.message, "\nRaw:", text);
    return null;
  }
}

// 📌 Generate Roadmap (JSON-based, robust to fences)
async function generateRoadMap(req, res) {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) return res.redirect("/login");

    let roadmap = await RoadMap.findOne({ userId: user._id });

    if (!roadmap) {
      const skillmap = await skillGap.findOne({ userId: user._id });
      if (!skillmap) {
        return res.render("error", {
          message: "Generate skill gap analysis first to create a roadmap.",
        });
      }

      const prompt = `
You are a career roadmap assistant.
Given the user's goal: "${user.goals}"
and skill gap analysis: "${skillmap.analysis}",
return ONLY a valid JSON object (no markdown, no code fences, no explanations, no extra keys) in exactly this shape:

{
  "steps": [
    { "title": "Step 1: …", "tasks": ["Task A", "Task B"] }
  ],
  "projects": ["Idea 1", "Idea 2"]
}
`.trim();

      const response = await axios.post(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
        {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          // If your API supports it, this strongly enforces raw JSON:
          // generationConfig: { response_mime_type: "application/json" }
        },
        {
          headers: {
            "x-goog-api-key": process.env.GEMINI_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      const aiText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      const parsed = safeParseJSON(aiText);
      if (!parsed || !Array.isArray(parsed.steps)) {
        console.error("AI returned invalid JSON:", aiText);
        return res.render("error", {
          message: "AI returned invalid JSON roadmap. Please try again.",
        });
      }

      const steps = parsed.steps.map((s) => ({
        title: String(s.title || "").trim() || "Untitled Step",
        tasks: Array.isArray(s.tasks) ? s.tasks.map((t) => String(t)) : [],
        completed: false,
      }));

      roadmap = new RoadMap({
        userId: user._id,
        steps,
        projects: Array.isArray(parsed.projects)
          ? parsed.projects.map((p) => String(p))
          : [],
      });

      await roadmap.save();
    }

    res.render("roadmap", {
      user,
      steps: roadmap.steps,
      projects: roadmap.projects || [],
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res
      .status(500)
      .render("error", { message: "Error generating roadmap: " + err.message });
  }
}

// 📌 Update Progress (treat body indexes as numbers)
async function updateProgress(req, res) {
  try {
    const userId = req.session.userId;
    const completedStepsRaw = Array.isArray(req.body.completedSteps)
      ? req.body.completedSteps
      : [];

    const completedIdx = completedStepsRaw
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n));

    const roadmap = await RoadMap.findOne({ userId });
    if (!roadmap) return res.render("error", { message: "No roadmap found." });

    roadmap.steps.forEach((step, index) => {
      step.completed = completedIdx.includes(index);
    });

    await roadmap.save();
    // Return 204 so your fetch() doesn’t try to follow redirects
    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).render("error", { message: "Error updating progress." });
  }
}

module.exports = { generateRoadMap, updateProgress };
