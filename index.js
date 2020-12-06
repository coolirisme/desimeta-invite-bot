#!/usr/bin/env node

const Snoowrap = require('snoowrap');
const Sqlite3 = require('sqlite3');

//Open database
let db = new Sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  db.serialize(() => {
    db.run('CREATE TABLE IF NOT EXISTS user(username text default \'\')');
  });
});

//Utility function for UUID generation
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
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
            console.log(userName);
            /*
            client.composeMessage({
              to: userName,
              subject: "Hi, how's it going?",
              text: 'Long time no see'
            });
            */
          });

          //Insert users to database
          let placeholders = sentUsers.map((user) => '(?)').join(',');
          let sql = 'INSERT INTO user(username) VALUES ' + placeholders;
          if (sentUsers.length > 0) {
            db.run(sql, sentUsers, (err) => {
              if (err) {
                return console.log(err.message);
              } else {
                return console.log('message sent to ' + sentUsers.length + ' user(s)');
              }
            });
          }
        }
      });
    });
  });
  setTimeout(() => sendMessages(), 30000);
}

sendMessages();
