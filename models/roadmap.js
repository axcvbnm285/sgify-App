const mongoose = require("mongoose");

const StepSchema = new mongoose.Schema({
  title: { type: String, required: true },   // e.g. "Step 1: Learn HTML"
  tasks: [{ type: String }],                 // multiple bullet points under the step
  completed: { type: Boolean, default: false }
});

const RoadMapSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  steps: [StepSchema],
  projects: [{ type: String }] ,
                // AI-suggested projects
}, { timestamps: true });

module.exports = mongoose.model("RoadMap", RoadMapSchema);
