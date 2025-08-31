const mongoose = require("mongoose");
const bcrypt=require('bcrypt')
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },

  // Extra profile fields
  age: { type: Number },
  gender: { type: String, enum: ["Male", "Female", "Other"] },
  profession: { type: String },
  skills: { type: [String], default: [] },
  goals: { type: [String],default:[] },
  phonenumber:{type:String},
  education:{type:String},

  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },

  // Dashboard-related fields
  progress: { type: Number, default: 0 },
  recommendations: { type: [String], default: [] },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // only hash if modified
  this.password = await bcrypt.hash(this.password, 12);
  next();
})

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
