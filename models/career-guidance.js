const mongoose=require('mongoose')
const recommendationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  careers: [String],
  courses: [
    {
      title: String,
      platform: String,
      url: String
    }
  ],
  links: [String],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Recommendation", recommendationSchema);