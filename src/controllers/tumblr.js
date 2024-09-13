import axios from "axios";
const crypto = require("crypto");
import FormData from "form-data";
import Tumblr from '../models/tumblrSchedule';
import OAuth from 'oauth';
require("dotenv").config();

const oauth = new OAuth.OAuth(
  'https://www.tumblr.com/oauth/request_token',
  'https://www.tumblr.com/oauth/access_token',
  process.env.TUMBLR_CONSUMER_KEY,
  process.env.TUMBLR_CONSUMER_SECRET,
  '1.0A',
  process.env.TUMBLR_CALLBACK_URL,
  'HMAC-SHA1'
);

export const listAllTumblrs = async (req, res) => {
  try {
      const tumblrs = await Tumblr.find().sort({ createdAt: -1 }); 
      res.status(200).json(tumblrs);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const getTumblrById = async (req, res) => {
  try {
      const tumblr = await Tumblr.findById(req.params.id);
      if (!tumblr) return res.status(404).json({ message: "Tumblr not found" });
      res.status(200).json(tumblr);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const deleteTumblr = async (req, res) => {
  try {
      const tumblr = await Tumblr.findByIdAndDelete(req.params.id);
      if (!tumblr) return res.status(404).json({ message: "Tumblr not found" });
      res.status(200).json({ message: "Tumblr deleted successfully" });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const updateTumblr = async (req, res) => {
  try {
      const tumblr = await Tumblr.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!tumblr) return res.status(404).json({ message: "Tumblr not found" });
      res.status(200).json(tumblr);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
};

export const requestToken = async (req, res) => {
  const callbackUrl = process.env.TUMBLR_CALLBACK_URL;
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const authUrl = `https://www.tumblr.com/oauth2/authorize?response_type=code&client_id=${
      process.env.TUMBLR_CONSUMER_KEY
  }&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=write offline_access&state=${state}`;
  res.redirect(authUrl);
};

export const getToken = async (req, res) => {
  const { code, state } = req.query;

  if (!state || state !== req.session.oauthState) {
      return res.status(403).send("State mismatch or missing state");
  }

  req.session.oauthState = null;

  try {
      const tokenResponse = await axios.post(
          "https://api.tumblr.com/v2/oauth2/token",
          new URLSearchParams({
              grant_type: "authorization_code",
              code: code,
              client_id: process.env.TUMBLR_CONSUMER_KEY,
              client_secret: process.env.TUMBLR_CONSUMER_SECRET,
              redirect_uri: process.env.TUMBLR_CALLBACK_URL,
          }),
          {
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
              }
          }
      );

      const { access_token, refresh_token, expires_in } = tokenResponse.data;

      req.session.access_token = access_token;
      req.session.refresh_token = refresh_token;

      res.redirect(`${process.env.FRONTEND_URL}/auth/tumblr/callback?tumblr_token=${access_token}&refresh_token=${refresh_token}&expires_in=${expires_in}`);
  } catch (error) {
      console.error("Error obtaining access token:", error.response ? error.response.data : error.message);

      if (!res.headersSent) {
          res.status(500).send("Authentication failed.");
      }
  }
};

export const refreshToken = async (req, res) => {
  const { refresh_token } = req.session;

  if (!refresh_token) {
      return res.status(400).json({ message: "No refresh token available" });
  }

  try {
      const tokenResponse = await axios.post(
          "https://api.tumblr.com/v2/oauth2/token",
          new URLSearchParams({
              grant_type: "refresh_token",
              refresh_token: refresh_token,
              client_id: process.env.TUMBLR_CONSUMER_KEY,
              client_secret: process.env.TUMBLR_CONSUMER_SECRET
          }),
          {
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded'
              }
          }
      );

      const { access_token, refresh_token: new_refresh_token, expires_in } = tokenResponse.data;

      req.session.access_token = access_token;
      req.session.refresh_token = new_refresh_token;

      res.status(200).json({ accessToken: access_token, refreshToken: new_refresh_token, expiresIn: expires_in });
  } catch (error) {
      console.error("Error refreshing access token:", error.response ? error.response.data : error.message);

      if (!res.headersSent) {
          res.status(500).send("Failed to refresh access token.");
      }
  }
};

export const schedulePostTumblr = async (req, res) => {
  const { accessToken, media, type, tags, username, title, body, scheduledTime, refreshToken } = req.body;
  
  const scheduledDate = new Date(scheduledTime);

  try {
    const newSchedule = new Tumblr({
      accessToken,
      type,
      scheduledTime: scheduledDate,
      media,
      tags, 
      username,
      title,
      body,
      refreshToken
    });

    await newSchedule.save();

    res.status(201).send({ message: 'Tumblr scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling Tumblr:', error);
    res.status(500).send({ message: 'Error scheduling Tumblr', error: error.message });
  }
}


export const checkAndPostScheduledTumblr = async () => {
  const now = new Date();
  const postsToPublish = await Tumblr.find({ scheduledTime: { $lte: now }, posted: false });

  for (const post of postsToPublish) {
    const { username, type, media, accessToken, refreshToken, title, body, tags } = post;
    const url = `https://api.tumblr.com/v2/blog/${username}/post`;``
    let headers = { Authorization: `Bearer ${accessToken}` };

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("caption", body || "Posting to Tumblr!");
      formData.append("tags", tags || "tumblr");

      switch (type) {
        case "photo":
          await handlePhotoPost({ body: { media, tags } }, formData);
          break;
        case "video":
          await handleVideoPost({ body: { media } }, formData);
          break;
        case "text":
          handleTextPost({ body: { title, body } }, formData);
          break;
        default:
          throw new Error("Invalid post type. It must be either photo, video, or text.");
      }

      const response = await axios.post(url, formData, { headers: { ...headers, ...formData.getHeaders() } });
      post.posted = true;
      await post.save();
      console.log(`Successfully posted a ${type} to Tumblr.`, response.data);

    } catch (error) {
      if (error.response && error.response.status === 401 && error.response.statusText === 'Unauthorized') {
        try {
          const newTokenData = await refreshAccessToken(refreshToken);
          headers.Authorization = `Bearer ${newTokenData.access_token}`;
          post.accessToken = newTokenData.access_token;
          post.refreshToken = newTokenData.refresh_token || refreshToken;
          await post.save();

          const retryResponse = await axios.post(url, formData, { headers: { ...headers, ...formData.getHeaders() } });
          post.posted = true;
          await post.save();
          console.log(`Successfully posted a ${type} to Tumblr after refreshing token.`, retryResponse.data);
        } catch (refreshError) {
          console.error("Failed to refresh access token and post to Tumblr:", refreshError.message);
          // console.log(refreshError)
        }
      } else {
        console.error("Failed to post to Tumblr:", error.message);
        // console.log(error)
      }
    }
  }
};

const handlePhotoPost = async (req, formData) => {
  const mediaSources = Array.isArray(req.body.media) ? req.body.media : [req.body.media];
  formData.append("tags", req.body.tags || "photo, tumblr");
  for (let index = 0; index < mediaSources.length; index++) {
    const imageUrl = mediaSources[index];
    const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
    formData.append(`data[${index}]`, Buffer.from(imageResponse.data), { filename: `image${index}.jpg` });
  }
};

const handleVideoPost = async (req, formData) => {
  const mediaSources = Array.isArray(req.body.media) ? req.body.media : [req.body.media];
  for (let index = 0; index < mediaSources.length; index++) {
    const videoUrl = mediaSources[index];
    const videoResponse = await axios.get(videoUrl, { responseType: "arraybuffer" });
    formData.append(`data[${index}]`, Buffer.from(videoResponse.data), { filename: `video${index}.mp4` });
  }
};

const handleTextPost = (req, formData) => {
  formData.append("title", req.body.title || "Title Tumblr");
  formData.append("body", req.body.body || "Body Tumblr");
};