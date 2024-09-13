require('dotenv').config();
import mime from 'mime-types';
import Twitter from '../models/twitterSchedule'; 
import axios from "axios";
import { TwitterApi } from "twitter-api-v2";

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URL;


export const listDataScheduleTwitter = async (req, res) => {
  try {
    const blog = await Twitter.find().sort({ createdAt: -1 });
    res.json(blog);
  } catch (error) {
    res.status(400).json({ message: "Không tìm được bài đăng nào" });
  }
}

export const deleteDataScheduleTwitter = async (req, res) => {
  const { id } = req.params;
  try {
    await Twitter.findByIdAndDelete(id);
    res.json({ message: 'Tweet deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}

export const updateDataScheduleTwitter = async (req, res) => {
  const { id } = req.params; 
  const { tweetContent, imageUrls, scheduledTime } = req.body; 

  try {
    const updatedTweet = await Twitter.findByIdAndUpdate(id, {
      tweetContent,
      imageUrls, 
      scheduledTime,
    }, { new: true }); 

    if (!updatedTweet) {
      return res.status(404).send({ message: "Tweet not found." });
    }

    res.status(200).json(updatedTweet);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: error.message });
  }
};

export const getOneDataScheduleTwitter = async (req, res) => {
  const { id } = req.params;

  try {
    const tweet = await Twitter.findById(id);
    if (tweet) {
      res.json(tweet);
    } else {
      res.status(404).json({ message: 'Tweet not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}


const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post('https://api.twitter.com/oauth2/token', new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const newTokenData = response.data;

    if (!newTokenData.access_token) {
      throw new Error('Failed to refresh access token');
    }

    await Twitter.updateOne({ refreshToken }, { 
      accessToken: newTokenData.access_token,
      refreshToken: newTokenData.refresh_token || refreshToken,
    });

    return newTokenData;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Could not refresh access token');
  }
};


export const scheduleTwitter = async (req, res) => {
    const { accessToken, accessSecret, tweetContent, scheduledTime, urls, refreshToken } = req.body;
  
    const scheduledDate = new Date(scheduledTime);
  
    try {
      const newSchedule = new Twitter({
        accessToken,
        accessSecret,
        refreshToken,
        tweetContent,
        scheduledTime: scheduledDate,
        imageUrls: urls, 
      });
  
      await newSchedule.save();
  
      res.status(201).send({ message: 'Tweet scheduled successfully' });
    } catch (error) {
      console.error('Error scheduling tweet:', error);
      res.status(500).send({ message: 'Error scheduling tweet', error: error.message });
    }
};


const postTweet = async (tweet, twitterClient) => {
  let mediaIds = [];

  if (tweet.imageUrls && tweet.imageUrls.length > 0) {
    for (let image of tweet.imageUrls) {
      try {
        const response = await axios.get(image.url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data, 'binary');
        const mimeType = mime.lookup(image.url); 

        if (!mimeType) {
          throw new Error(`Could not determine MIME type for URL ${image.url}`);
        }

        const mediaId = await twitterClient.v1.uploadMedia(buffer, { mimeType });
        console.log(mediaId);
        mediaIds.push(mediaId);
      } catch (error) {
        console.error(`Failed to upload media from URL ${image.url}:`, error);
      }
    }
  }

  try {
    const tweetData = {
      text: tweet.tweetContent,
    };

    if (mediaIds.length > 0) {
      tweetData.media = { media_ids: mediaIds };
    }

    await twitterClient.v2.tweet(tweetData);
    await Twitter.findByIdAndUpdate(tweet._id, { posted: true });
    console.log(`Tweet ID: ${tweet._id} has been posted.`);
  } catch (error) {
    console.error('Failed to post tweet:', error);
  }
};

export const postScheduledTweets = async (req, res) => {
  const now = new Date();

  try {
    const tweetsToPost = await Twitter.find({
      scheduledTime: { $lte: now },
      posted: false, 
    });

    for (const tweet of tweetsToPost) {
      let twitterClient = new TwitterApi({
        appKey: process.env.API_KEY,
        appSecret: process.env.API_KEY_SECRET,
        accessToken: tweet.accessToken,
        accessSecret: tweet.refreshToken,
      });
        

      try {
        await postTweet(tweet, twitterClient);
      } catch (error) {
        if (error.response && error.response.status === 401 && error.response.data.errors.some(e => e.code === 89)) {
          try {
            const newTokenData = await refreshAccessToken(tweet.refreshToken);
            tweet.accessToken = newTokenData.access_token;
            tweet.refreshToken = newTokenData.refresh_token || tweet.refreshToken;
            await tweet.save();

            twitterClient = new TwitterApi({
              appKey: process.env.API_KEY,
              appSecret: process.env.API_KEY_SECRET,
              accessToken: tweet.accessToken,
              accessSecret: tweet.refreshToken,
            });

            await postTweet(tweet, twitterClient);
            console.log(`Successfully posted to Twitter after refreshing token.`);
          } catch (refreshError) {
            console.error("Failed to refresh access token and post to Twitter:", refreshError.message);
          }
        } else {
          console.error(`Failed to post Tweet ID: ${tweet._id}`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error in scheduled job:', error);
  }
};

export const TokenTwitter = async (req, res) => {
  const { oauth_token, oauth_verifier } = req.body;

  try {
    const twitterClient = new TwitterApi({
      appKey: process.env.API_KEY,
      appSecret: process.env.API_KEY_SECRET,
      accessToken: oauth_token,
      accessSecret: oauth_verifier
    });

    // Lấy access token từ Twitter
    const { client: loggedClient, accessToken, accessSecret } = await twitterClient.login(oauth_verifier);

    res.json({ accessToken, refreshToken: accessSecret });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Twitter' });
  }
};

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});