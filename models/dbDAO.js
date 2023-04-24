const db = require("./db");

const MARIA_USER_CONTROLLER = {
    getUserFromUsername: async function(username){
        try{
            let rows = await db.pool.query("SELECT user_name, password FROM users WHERE user_name='"+username+"'");
            return  rows[0];
        }catch (err) {
            console.log(err);
        }
    },

    userPassIsCorrect: function(userObj, username, password){
        return userObj.user_name === username && userObj.password === password
    },

    userEmailIsCorrect: async function(userEmail){
        try{
            let rows = await db.pool.query("SELECT user_name FROM users WHERE email='"+userEmail+"'");
            if(rows.length === 0){
                return 0;
            }
            else{
                return rows[0].user_name;
            }
        }catch (err) {
            console.log(err);
        }
    },

    login: async function(username, sessionId){
        try {
            let rows = await db.pool.query("SELECT * FROM sessions WHERE user_name='"+username+"'");
            if(rows.length === 0){
                const insertQuery = "INSERT INTO sessions (user_name, session_id) VALUES (?, ?)";
                await db.pool.query(insertQuery, [username, sessionId]);
            }
            else{
                await db.pool.query("UPDATE sessions SET session_id = ? WHERE user_name = ?", [sessionId, username]);
            }
        } catch (err) {
            console.log(err);
        }
    },

    logout: async function(username){
        try {
            await db.pool.query("DELETE FROM sessions WHERE user_name = ?", [username]);
        } catch (err) {
            console.log(err);
        }
    },

    validSessionId: async function (username, sessionId) {
        try {
            let rows = await db.pool.query("SELECT * FROM sessions WHERE user_name = ?", [username]);
            if(rows.length === 0){
                return false;
            }
            else{
                return rows[0].session_id === sessionId;
            }
        }catch (err) {
            console.log(err);
        }
    },

    changeSessionId: async function(username, sessionId){
        try{
            let res = await db.pool.query("UPDATE sessions SET session_id = ? WHERE user_name = ?", [sessionId, username]);
            if(res.affectedRows === 0){
                const insertQuery = "INSERT INTO sessions (user_name, session_id) VALUES (?, ?)";
                await db.pool.query(insertQuery, [username, sessionId]);
            }
        }catch (err) {
            console.log(err);
        }
    },

    updatePassword: async function(username, newPassword){
        try{
            let up = await db.pool.query("UPDATE users SET password = ? WHERE user_name = ?", [newPassword, username]);
            // console.log(up);
        }catch (err) {
            console.log(err);
        }
    },

    addUser: async function (nfirstName, nsurName, npronouns, nemail, ncountry, ncity, npostCode, nphone, nbirthDate, nusername, npassword, nlearnUsFrom) {
        try {
            const insertQuery = "INSERT INTO users (user_name, email, password, first_name, last_name, pronouns, country, city, post_code, phone, birth_date, learn_us_from, organization, dating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [nusername, nemail, npassword, nfirstName, nsurName, npronouns, ncountry, ncity, npostCode, nphone, nbirthDate, nlearnUsFrom, 0, 0]);
        } catch (err) {
            console.log(err);
        }
    },

    addOrganization: async function (nfirstName, nemail, ncountry, ncity, npostCode, nphone, nbirthDate, nusername, npassword, nlearnUsFrom) {
        try {
            const insertQuery = "INSERT INTO users (user_name, email, password, first_name, country, city, post_code, phone, birth_date, learn_us_from, organization, dating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [nusername, nemail, npassword, nfirstName, ncountry, ncity, npostCode, nphone, nbirthDate, nlearnUsFrom, 1, 0]);
        } catch (err) {
            console.log(err);
        }
    },

    getProfilePicture: async function(username){
        try{
            let prof_pic = await db.pool.query("SELECT profile_picture FROM users WHERE user_name='" + username + "';");
            return prof_pic[0]
        }catch (err) {
            console.log(err);
        }
    },

    getLastCommunications: async function(username){
        let messages = await db.pool.query("SELECT messages.* FROM messages, "+
        "(SELECT users, max(JSON_VALUE(message, '$.timestamp')) AS timestamp FROM messages WHERE users LIKE '%"+ username +"%' GROUP BY users ORDER BY TIMESTAMP DESC) last_message " +
        "WHERE messages.users=last_message.users " +
        "AND JSON_VALUE(messages.message, '$.timestamp')=last_message.timestamp;");
        return messages
    },

    getFriends: async function(username){
        try{
            let user_names = await db.pool.query("SELECT user2 FROM friends WHERE user1='"+username+"'");
            if(user_names.length === 0){
                return 0;
            }
            else{
                let friendsList = [];
                let friends = {};
                user_names.forEach((item) => {
                    friendsList.push(item.user2)
                });
                const query = "SELECT pronouns, profile_picture FROM users WHERE user_name=?";
                for(let friend of friendsList){
                    let res = await db.pool.query(query, [friend]);
                    friends[friend] = res[0];
                }
                return friends;
            }
        }catch (err) {
            console.log(err);
        }
    },

    addFriend: async function(username, friend){
        try{
            let rows = await db.pool.query("SELECT * FROM friends WHERE user1='"+ username +"' AND user2='" + friend + "';");
            if(rows.length === 0){
                const insertQuery = "INSERT INTO friends (user1, user2) VALUES (?, ?)";
                await db.pool.query(insertQuery, [username, friend]);
                await db.pool.query(insertQuery, [friend, username]);
            }
            else{
                return 0;
            }
        }catch (err) {
            console.log(err);
        }
    },

    removeFriend: async function(username, friend){
        try{
            await db.pool.query("DELETE FROM friends WHERE user1='"+ username +"' AND user2='" + friend + "';");
            await db.pool.query("DELETE FROM friends WHERE user1='"+ friend +"' AND user2='" + username + "';");
        }catch (err) {
            console.log(err);
        }
    },

    getMessages: async function(username1, username2){
        try{
            let usernames = {"usernames": [username1, username2].sort()};
            let rows = await db.pool.query("SELECT message, file FROM messages WHERE users='" + JSON.stringify(usernames) + "';");
            if(rows.length === 0){
                return 0;
            }
            else{
                let messages = [];
                rows.forEach((item) => {
                    if(item.file){
                        item.message.file = JSON.parse(item.file);
                    }
                    messages.push(item.message)
                })
                return messages;
            }
        }catch (err) {
            console.log(err);
        }
    },

    saveMessage: async function(sender, recipient, message, timestamp, files){
        let newMessage = {sender: sender, message: message, timestamp: timestamp};
        try{
            let usernames = {"usernames": [sender, recipient].sort()};
            const insertQuery = "INSERT INTO messages (users, message, file) VALUES (?, ?, ?)";
            if(files){
                await db.pool.query(insertQuery, [JSON.stringify(usernames), newMessage, files]);
            }
            else{
                await db.pool.query(insertQuery, [JSON.stringify(usernames), newMessage, null]);
            }
        }catch (err) {
            console.log(err);
        }
    }
};

module.exports = {MARIA_USER_CONTROLLER};