import axios from "axios";
import qs from "qs";
const crypto = require("crypto");
import FormData from "form-data";
import fs from "fs";
import https from "https";
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

// const postData = {
//   type: "text",
//   title: "Hello World",
//   body: 'Welcome to my world'
// };

export const schedulePostTumblr = async (req, res) => {
  const url = `https://api.tumblr.com/v2/blog/${req.body.username}/post`;

  const postType = req.body.type;
  const mediaSources = req.body.media;

  const headers = {
    Authorization: `Bearer ${req.body.accessToken}`,
  };

  const downloadVideo = async (videoUrl) => {
    const response = await axios.get(videoUrl, { responseType: "arraybuffer" });
    return Buffer.from(response.data);
  };

  const formData = new FormData();
  formData.append("type", req.body.type); 
  formData.append("caption", req.body.caption || "Posting to Tumblr!");

  if (postType === "photo") {
    formData.append("tags", req.body.tags || "photo, tumblr");
    for (const [index, imageUrl] of mediaSources.entries()) {
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
      });
      formData.append(`data[${index}]`, Buffer.from(imageResponse.data), {
        filename: `image${index}.jpg`,
      });
    }
  } else if (postType === "video") {
    try {
      const videoBuffer = await downloadVideo(req.body.media);
      formData.append("data", videoBuffer, { filename: "video.mp4" });

      const response = await axios.post(url, formData, {
        headers: { ...headers, ...formData.getHeaders() },
      });

      res.json({
        message: "Successfully posted a video to Tumblr.",
        response: response.data,
      });
    } catch (error) {
      console.error(
        "Failed to post to Tumblr:",
        error.response ? error.response.data : error.message
      );
      res
        .status(500)
        .send(
          "Failed to post to Tumblr: " +
            (error.response ? error.response.data : error.message)
        );
    }
  }else if(postType === "text"){
    try {
      formData.append("title", req.body.title || "Title Tumblr");
      formData.append("body", req.body.body || "Body Tumblr");

      const response = await axios.post(url, formData, {
        headers: { ...headers, ...formData.getHeaders() },
      });

      res.json({
        message: "Successfully posted a text to Tumblr.",
        response: response.data,
      });
    } catch (error) {
      console.error(
        "Failed to post to Tumblr:",
        error.response ? error.response.data : error.message
      );
      res
        .status(500)
        .send(
          "Failed to post to Tumblr: " +
            (error.response ? error.response.data : error.message)
        );
    }
  } else {
    return res
      .status(400)
      .send("Invalid post type. It must be either photo or video.");
  }

  try {
    const response = await axios.post(url, formData, {
      headers: { ...headers, ...formData.getHeaders() },
    });

    res.json({
      message: `Successfully posted a ${postType} to Tumblr.`,
      response: response.data,
    });
  } catch (error) {
    console.error(
      "Failed to post to Tumblr:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .send(
        "Failed to post to Tumblr: " +
          (error.response ? error.response.data : error.message)
      );
  }
};

