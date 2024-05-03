// src/scheduler.js

const cron = require('node-cron');
const { postScheduledTweets } = require('./controllers/twitter');

// Run every minute
cron.schedule('* * * * *', async () => {
  console.log('Scheduler running: Checking for tweets to post...');
  await postScheduledTweets(); 
});
