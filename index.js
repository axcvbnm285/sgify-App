require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bodyParser = require("body-parser");
const userRoutes = require("./routes/userAuth");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");

app.use(session({
  secret: "mysecretkey",
  resave: false,
  saveUninitialized: true,
}));

mongoose.connect("mongodb://127.0.0.1:27017/smartGuide")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log(err));

app.use("/", userRoutes);

app.get('/',(req,res)=>{
    res.render('home')
})

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on http://0.0.0.0:3000");
});