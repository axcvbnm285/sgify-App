const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const axios=require('axios')
const resumerSchema=require('../models/resumeAnalysis')
const crypto=require('crypto');
const ResumeSchema = require("../models/resumeAnalysis");


async function getResumeUploadPage(req,res){
  res.render('resume-upload',{suggestions:[]});
}


async function handleRoadMapAnalysis(req, res) {
  try {
    const filepath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();

    // ===== Read file buffer =====
    const fileBuffer = fs.readFileSync(filepath);

    // ===== Generate SHA256 hash =====
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // ===== Check if user already uploaded this resume =====
    let existingResume = await ResumeSchema.findOne({
      user: req.session.userId,
      fileHash: fileHash,
    });

    if (existingResume) {
      // ✅ Return stored suggestions
      return res.render("resume-upload", {
        suggestions: existingResume.recommendations || [],
        extractedText: existingResume.extractedText || "",
      });
    }

    // ===== Extract resume text =====
    let text = "";
    if (ext === ".pdf") {
      const data = await pdfParse(fileBuffer);
      text = data.text;
    } else if (ext === ".docx") {
      const data = await mammoth.extractRawText({ path: filepath });
      text = data.value;
    } else if (ext === ".txt") {
      text = fileBuffer.toString("utf8");
    } else {
      return res.status(400).send("Unsupported file type");
    }

    // ===== Gemini prompt =====
    const prompt = `
You are an expert career advisor.
Analyze the following resume text and provide exactly 5 concise, actionable recommendations.
⚠️ Output ONLY JSON, nothing else.
JSON structure must be:
{
  "recommendations": [
    "Point 1",
    "Point 2",
    "Point 3",
    "Point 4",
    "Point 5"
  ]
}
Resume text:
${text}
`;

    // ===== Call Gemini API =====
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      },
      {
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // ===== Parse Gemini output safely =====
    const analysis = response.data.candidates[0].content.parts[0].text;
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    let structuredOutput = { recommendations: ["Could not parse Gemini output"] };

    if (jsonMatch) {
      try {
        structuredOutput = JSON.parse(jsonMatch[0]);
      } catch (err) {
        console.error("❌ JSON parse error:", err);
      }
    }

    // ===== Save new resume to DB =====
    const resumeDoc = new ResumeSchema({
      user: req.session.userId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileHash: fileHash,
      extractedText: text,
      recommendations: structuredOutput.recommendations || [],
    });

    await resumeDoc.save();

    // ===== Render EJS with suggestions =====
    res.render("resume-upload", {
      suggestions: structuredOutput.recommendations || [],
      extractedText: text,
    });
  } catch (err) {
    console.error("❌ Error processing resume:", err.response?.data || err.message);
    res.status(500).send("Error processing resume");
  }
}

module.exports={handleRoadMapAnalysis,getResumeUploadPage}