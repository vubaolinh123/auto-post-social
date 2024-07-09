import express from "express";
import cors from "cors";
import morgan from "morgan";
import mongoose from "mongoose";
import passport from "passport";
import session from "express-session";
import twitterRouter from "./routers/twitter.js";
import tumblrRouter from "./routers/tumblr.js";
import facebookRouter from "./routers/facebook.js"

require('./config/passport');
require("./scheduler");
require("dotenv").config();

const PORT = process.env.PORT || 8080;

const app = express();

app.use(express.json());


app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(morgan("tiny"));
app.use(express.urlencoded());

// Router
app.use("/api", twitterRouter);
app.use("/api", tumblrRouter);
app.use("/api", facebookRouter);

// connect db
mongoose
  .connect("mongodb://localhost:27017")
  .then(() => {
    console.log("Kết nối DB thành công");
  })
  .catch((err) => console.log(err));

const dbConnection = mongoose.connection;
dbConnection.on("error", (err) => console.log(`Kết nối thất bại ${err}`));
dbConnection.once("open", () => console.log("Kết nối thành công đến DB!"));

app.listen(PORT, () => {
  console.log("Server của bạn đang chạy ở cổng ", PORT);
});
