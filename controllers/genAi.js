const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getCareerRecommendations(user) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // ✅ Ensure arrays
    const skills = Array.isArray(user.skills)
      ? user.skills
      : user.skills
      ? [user.skills]
      : [];

    const goals = Array.isArray(user.goals)
      ? user.goals
      : user.goals
      ? [user.goals]
      : [];

    const prompt = `
    User profile:
    - Skills: ${skills.length ? skills.join(", ") : "Not provided"}
    - Goals: ${goals.length ? goals.join(", ") : "Not provided"}

    Please return ONLY valid JSON in this format:
    {
      "careers": ["career role 1", "career role 2"],
      "courses": [
        {"title": "Course name", "platform": "Platform", "url": "link"}
      ],
      "links": ["useful link 1", "useful link 2"]
    }
    `;

    const result = await model.generateContent(prompt);

    let text = result.response.text();
    console.log("Raw Gemini Output:", text);

    text = text.replace(/```json|```/g, "").trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in Gemini output");
    }

    return JSON.parse(jsonMatch[0]);

  } catch (err) {
    console.error("Gemini Error:", err.message);
    return {
      careers: [],
      courses: [],
      links: [],
      error: "Failed to generate recommendations. Please try again."
    };
  }
}

module.exports = getCareerRecommendations;
