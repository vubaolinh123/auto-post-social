require("dotenv").config();
import { TwitterApi } from "twitter-api-v2";

export const authApiTwitterClient = async (accessToken, accessSecret) => {
  const userClient = new TwitterApi({
    appKey: process.env.API_KEY,
    appSecret: process.env.API_KEY_SECRET,
    accessToken: accessToken,
    accessSecret: accessSecret,
  });

//   const bearer = new TwitterApi(process.env.BEARER_TOKEN);

  return userClient.readWrite;
//   const twitterBearer = bearer.readOnly;
};
