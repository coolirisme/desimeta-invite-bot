#!/usr/bin/env node

const Snoowrap = require('snoowrap');
const Sqlite3 = require('sqlite3');

const inviteMessage = 'Namaskaram, \n\nYou might be aware of the rising Indophobia on international subreddits \
due to very low participation by Indian redditors. \
Popular subreddits like Chodi don\'t allow meta discussion posts while indiadiscussion is for \
discussion related to India-verse subreddits only.\n\n\
 We are requesting you to join /r/DesiMeta - A meta subreddit concentrating \
all posts/comments related to India and Hinduism throughout the platform, \
all under a single roof! Use this for bringing attention to any \
misinformation or hateful content against the Indian/Hindu community.\n\n\
Dhanyawaad!';

//Open database
let db = new Sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS user(username text default \'\', message_sent text default \'\')');
  });
});

//Utility function for UUID generation
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let client = new Snoowrap({
  userAgent: uuidv4(),
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET
});

const sendMessages = () => {
  client.getNewComments('chodi').then((comments) => {
    //Get list of users message has beem sent to already
    db.serialize(() => {
      let sql = `SELECT username FROM user`;
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error(err);
        }
        else {
          let sent_users = rows.map(x => x.username);

          //Remove users which have already been sent messages
          comments = comments.filter((x) => sent_users.indexOf(x.author.name) === -1);
          let sentUsers = comments.map((x) => x.author.name);
          sentUsers = [...new Set(sentUsers)]; //Remove duplicates

          //Send messages to filtered users
          sentUsers.map(userName => {
            client.composeMessage({
              to: userName,
              subject: "/r/DesiMeta invite",
              text: inviteMessage
            }).then((_) => {
              console.log('Sent message to ' + userName);
              let sql = "INSERT INTO user(username, message_sent) VALUES ('${userName}', 'Y')";
              db.run(sql, [], (err) => {
                if (err) {
                  return console.log(err.message);
                }
              });
            }).catch((_) => {
              console.log('Error sending message to ' + userName);
              let sql = "INSERT INTO user(username, message_sent) VALUES ('${userName}', 'N')";
              db.run(sql, [], (err) => {
                if (err) {
                  return console.log(err.message);
                }
              });
            });
          });
        }
      });
    });
  });
  setTimeout(() => sendMessages(), 60000);
}

sendMessages();
