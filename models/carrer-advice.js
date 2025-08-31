const mongoose=require('mongoose')
const advice = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  career_advice: [String],
  
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("advice", advice);