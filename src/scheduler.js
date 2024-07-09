// src/scheduler.js

const cron = require('node-cron');
const { postScheduledTweets } = require('./controllers/twitter');
const { checkAndPostScheduledTumblr } = require('./controllers/tumblr');

// Run every minute  * * * * *
cron.schedule('*/10 * * * * *', async () => {
  console.log('Scheduler running: Checking to post...');
  await postScheduledTweets(); 
  await checkAndPostScheduledTumblr()
});
