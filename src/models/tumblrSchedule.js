// src/models/Tumblr.js
import mongoose, { Schema } from "mongoose";

const scheduleTumblr = new Schema({
    media: [],
    type: {
        type: String,
    },
    tags:{
        type: String
    },
    username:{
        type: String,
        required: true, 
    },
    title: {
        type: String,
    },
    body:{
        type: String,
        required: true, 
    },
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
    posted: { type: Boolean, default: false }
}, { timestamps: true });

const Tumblr = mongoose.model('scheduleTumblr', scheduleTumblr);

export default Tumblr;
