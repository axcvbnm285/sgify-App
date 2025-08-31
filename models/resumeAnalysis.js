const mongoose = require('mongoose')

const userSchema=new mongoose.Schema({
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      fileHash: { type: String, required: true },
      recommendations: { type: [String], default: [] },
     uploadedAt: { type: Date, default: Date.now },
})

const ResumeSchema=mongoose.model('ResumeSchema',userSchema)

module.exports=ResumeSchema