// src/models/Twitter.js
import mongoose, { Schema } from "mongoose";

const scheduleTwitter = new Schema({
  tweetContent: {
    type: String,
    required: true,
  },
  imageUrls: [{}],
  scheduledTime: {
    type: Date, 
    required: true,
  },
  accessToken: {
    type: String,
    required: true,
  },
  refreshToken: {
    type: String,
    required: true,
  },
  accessSecret: {
    type: String,
  },
  posted: { type: Boolean, default: false }
}, { timestamps: true });

const Twitter = mongoose.model('scheduleTwitter', scheduleTwitter);

export default Twitter;
