import axios from "axios";
const crypto = require("crypto");
import FormData from "form-data";
import Tumblr from '../models/tumblrSchedule';
require("dotenv").config();

export const requestToken = async (req, res) => {
  const callbackUrl = process.env.TUMBLR_CALLBACK_URL;
  const state = crypto.randomBytes(16).toString("hex");
  req.session.oauthState = state;

  const authUrl = `https://www.tumblr.com/oauth2/authorize?response_type=code&client_id=${
    process.env.TUMBLR_CONSUMER_KEY
  }&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=write&state=${state}`;
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
        client_id: process.env.TUMBLR_CONSUMER_KEY,
        client_secret: process.env.TUMBLR_CONSUMER_SECRET,
        redirect_uri: process.env.TUMBLR_CALLBACK_URL,
        code: code,
        grant_type: "authorization_code",
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    const { access_token } = tokenResponse.data;
    req.session.access_token = access_token; 
    console.log("access_token", access_token);

    res.json({
      message: "Authentication successful! Token obtained.",
      access_token: access_token,
    });
    res.send("Authentication successful! Token obtained.");
  } catch (error) {
    console.error("Error obtaining access token:", error.response ? error.response.data : error.message);

    if (!res.headersSent) {
      res.status(500).send("Authentication failed.");
    }
  }
};

const refreshAccessToken = async (refreshToken) => {
  const url = 'https://api.tumblr.com/v2/oauth2/token';
  const params = new URLSearchParams();
  params.append('grant_type', 'refresh_token');
  params.append('client_id', process.env.TUMBLR_CONSUMER_KEY);
  params.append('client_secret', process.env.TUMBLR_CONSUMER_SECRET);
  params.append('refresh_token', refreshToken);

  try {
    const response = await axios.post(url, params);
    return response.data;
  } catch (error) {
    console.error('Failed to refresh access token:', error.message);
    throw error;
  }
};

export const schedulePostTumblr = async (req, res) => {
  const { accessToken, media, type, tags, username, title, body, scheduledTime } = req.body;
  
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
    const url = `https://api.tumblr.com/v2/blog/${username}/post`;
    let headers = { Authorization: `Bearer ${accessToken}` };

    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("caption", body || "Posting to Tumblr!");

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
      if (error.response && error.response.status === 401 && error.response.data.error === 'invalid_token') {
        try {
          const newTokenData = await refreshAccessToken(refreshToken);
          headers.Authorization = `Bearer ${newTokenData.access_token}`;
          post.accessToken = newTokenData.access_token;
          post.refreshToken = newTokenData.refresh_token || refreshToken;
          await post.save();

          // Retry the post request with the new access token
          const retryResponse = await axios.post(url, formData, { headers: { ...headers, ...formData.getHeaders() } });
          post.posted = true;
          await post.save();
          console.log(`Successfully posted a ${type} to Tumblr after refreshing token.`, retryResponse.data);
        } catch (refreshError) {
          console.error("Failed to refresh access token and post to Tumblr:", refreshError.message);
        }
      } else {
        console.error("Failed to post to Tumblr:", error.message);
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
  if (typeof req.body.media === 'string') {
    const videoResponse = await axios.get(req.body.media, { responseType: "arraybuffer" });
    formData.append("data", Buffer.from(videoResponse.data), { filename: "video.mp4" });
  } else {
    throw new Error("Video URL is not provided or invalid.");
  }
};

const handleTextPost = (req, formData) => {
  formData.append("title", req.body.title || "Title Tumblr");
  formData.append("body", req.body.body || "Body Tumblr");
};