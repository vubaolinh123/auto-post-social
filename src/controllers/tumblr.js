import axios from "axios";
const crypto = require("crypto");
import FormData from "form-data";
require("dotenv").config();

export const requestToken = async (req, res) => {
  const callbackUrl = `http://localhost:8080/api/auth/tumblr/callback`;
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
        redirect_uri: "http://localhost:8080/api/auth/tumblr/callback",
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


export const schedulePostTumblr = async (req, res) => {
  if (res.headersSent) return; 

  const url = `https://api.tumblr.com/v2/blog/${req.body.username}/post`;
  const { type: postType, media: mediaSources, accessToken } = req.body; 

  const headers = { Authorization: `Bearer ${accessToken}` };

  try {
    const formData = new FormData();
    formData.append("type", postType);
    formData.append("caption", req.body.caption || "Posting to Tumblr!");

    switch (postType) {
      case "photo":
        await handlePhotoPost(req, formData);
        break;
      case "video":
        await handleVideoPost(req, formData);
        break;
      case "text":
        handleTextPost(req, formData);
        break;
      default:
        throw new Error("Invalid post type. It must be either photo, video, or text.");
    }

    const response = await axios.post(url, formData, { headers: { ...headers, ...formData.getHeaders() } });
    res.json({ message: `Successfully posted a ${postType} to Tumblr.`, response: response.data });

  } catch (error) {
    const errorMessage = error.response ? JSON.stringify(error.response.data, null, 2) : error.message;
    console.error("Failed to post to Tumblr:", errorMessage);
    if (!res.headersSent) {
      res.status(500).send(`Failed to post to Tumblr: ${errorMessage}`);
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