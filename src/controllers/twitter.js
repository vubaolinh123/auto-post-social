require('dotenv').config();
import { download } from "./utilities";
import path from "path";
import Twitter from '../models/twitterSchedule'; 
import {authApiTwitterClient} from "../config/twitterClient";

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

export const scheduleTwitter = async (req, res) => {
    const { accessToken, accessSecret, tweetContent, scheduledTime, urls } = req.body;
  
    const scheduledDate = new Date(scheduledTime);
  
    try {
      const newSchedule = new Twitter({
        accessToken,
        accessSecret,
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

export const postScheduledTweets = async (req, res) => {
    const now = new Date();
  
    try {
      const tweetsToPost = await Twitter.find({
        scheduledTime: { $lte: now },
        posted: false
      });
  

      for (const tweet of tweetsToPost) {
        const twitterClient = await authApiTwitterClient(tweet.accessToken,tweet.accessSecret)
      
        try{
            const filename = "C:Image";
            let mediaIds = [];

            if (tweet.imageUrls.length > 1) {
                for (let i = 0; i < tweet.imageUrls.length; i++) {
                  download(tweet.imageUrls[i].url, filename, async function () {
                      const mediaId = await twitterClient.v1.uploadMedia(
                        path.join(filename, path.basename(tweet.imageUrls[i].url))
                      );
                      mediaIds.push(mediaId);
                      if (mediaIds.length === tweet.imageUrls.length) {
                        await twitterClient.v2
                          .tweet({
                            text: tweet.tweetContent,
                            media: {
                              media_ids: mediaIds,
                            },
                          })
                          .then(() => {
                            console.log(`Đăng bài multiple media thành công Tweet ID: ${tweet._id}`);
                          });
                      }
                  });
                }
              } else {
                download(tweet.imageUrls[0].url, filename, async function () {
                    const mediaId = await twitterClient.v1.uploadMedia(
                      path.join(filename, path.basename(tweet.imageUrls[0].url))
                    );
                    mediaIds.push(mediaId);
                    console.log("Upload Media thành công")
                    if (mediaIds.length === tweet.imageUrls.length) {
                        console.log("Bắt đầu đăng bài")
                      await twitterClient.v2
                        .tweet({
                          text: tweet.tweetContent,
                          media: {
                            media_ids: mediaIds,
                          },
                        }).then(() => {
                          console.log(`Đăng bài single media thành công Tweet ID: ${tweet._id}`);
                        });
                    }
                });
              }
            
          
          await Twitter.findByIdAndUpdate(tweet._id, { posted: true });
          console.log(`Tweet ID: ${tweet._id} has been posted.`);
        } catch (error) {
          console.error(`Failed to post Tweet ID: ${tweet._id}`, error);
        }
    }
    } catch (error) {
      console.error('Error in postScheduledTweets:', error);
      res.status(400).json({ message: `Error in postScheduledTweets` });
    }
};


export const TokenTwitter = async (req, res)=>{
    const { token, verifier } = req.body;

    const consumerKey = process.env.API_KEY;
    const consumerSecret = process.env.API_KEY_SECRET;

    // Twitter endpoint for exchanging the token and verifier for an access token
    const tokenExchangeUrl = 'https://api.twitter.com/oauth/access_token';

    try {
        const response = await fetch(tokenExchangeUrl, {
            method: 'POST',
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                oauth_token: token,
                oauth_verifier: verifier,
            }),
        });

        const data = await response.text(); 

        res.json({ message: 'Token exchanged successfully', data });
    } catch (error) {
        console.error('Error exchanging token:', error);
        res.status(500).json({ message: 'Failed to exchange token' });
    }
}

