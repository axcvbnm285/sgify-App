const mongoose=require('mongoose')

const skillmap = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  analysis: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("skillmap", skillmap);