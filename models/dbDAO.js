const db = require("./db");
const uuid = require('uuid');

const MARIA_USER_CONTROLLER = {
    getUserFromUsername: async function(username){
        try{
            let rows = await db.pool.query("SELECT user_name, password, locked FROM users WHERE user_name='"+username+"'");
            return  rows[0];
        }catch (err) {
            console.log(err);
        }
    },

    getEmail: async function(username){
        try{
            return await db.pool.query("SELECT email FROM users WHERE user_name=?", [username]);
        }catch (err) {
            console.log(err);
        }
    },

    userPassIsCorrect: function(userObj, username, password){
        return userObj.user_name === username && userObj.password === password
    },

    userIsOrganization: async function(username){
        try{
            let rows = await db.pool.query("SELECT organization FROM users WHERE user_name='"+ username + "'");
            return rows[0].organization;
        }catch (err) {
            console.log(err);
        }
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
            const loginsQuery = ("INSERT INTO logins (username, date, success) VALUES (?, ?, ?)");
            await db.pool.query(loginsQuery, [username, new Date().toJSON().slice(0, 10), 1]);
        } catch (err) {
            console.log(err);
        }
    },

    failedLogin: async function(username){
        try {
            const loginsQuery = ("INSERT INTO logins (username, date, success) VALUES (?, ?, ?)");
            let date = new Date().toJSON();
            await db.pool.query(loginsQuery, [username, date.slice(0, 10) + " " + date.slice(11,19), 0]);
            const res = await db.pool.query("SELECT COUNT(success) AS fl FROM logins  WHERE success=0  and username='" + username+ "'");
            if(parseInt(res[0].fl) > 2){
                await db.pool.query("UPDATE users SET locked = ? WHERE user_name = ?", [1, username]);
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
            let up = await db.pool.query("UPDATE users SET password = ?, locked=0 WHERE user_name = ?", [newPassword, username]);
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
            const insertQuery = "INSERT INTO users (user_name, email, password, first_name, country, city, post_code, phone, birth_date, learn_us_from, organization, dating, locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [nusername, nemail, npassword, nfirstName, ncountry, ncity, npostCode, nphone, nbirthDate, nlearnUsFrom, 1, 0, 1]);
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

    getLocation: async function(username) {
        try {
            return await db.pool.query("SELECT post_code, city, country FROM users WHERE user_name='"+username+"'");
        } catch (err) {
            console.log(err);
        }
    },

    getLastCommunications: async function(username){
        try {
            return await db.pool.query("SELECT messages.users, messages.sender, messages.text, messages.file FROM messages, " +
                "(SELECT users, max(JSON_VALUE(message, '$.timestamp')) AS timestamp FROM messages WHERE users LIKE '%" + username + "%' GROUP BY users ORDER BY TIMESTAMP DESC) last_message " +
                "WHERE messages.users=last_message.users " +
                "AND JSON_VALUE(messages.message, '$.timestamp')=last_message.timestamp;");
        }catch (err) {
            console.log(err);
        }
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

    getAddFriendCode: async function(username){
        let code = await db.pool.query("SELECT fr_code FROM addfrcode WHERE username='" + username + "' ");
        let date = new Date().toJSON();
        if(code){
            await db.pool.query("UPDATE addfrcode SET date='" + date.slice(0, 10) + " " + date.slice(11,19) + "' WHERE username='" + username + "' ")
        }
        else{
            let code = uuid.v4();
            const loginsQuery = ("INSERT INTO addfrcode (username, date, fr_code) VALUES (?, ?, ?)");
            await db.pool.query(loginsQuery, [username, date.slice(0, 10) + " " + date.slice(11,19), code]);
        }
        return code;
    },

    getFriendFromCode: async function(code){
        try{
            let friend = await db.pool.query("SELECT username FROM addfrcode WHERE fr_code='" + code + "' ");
            if(friend){
                return friend[0];
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
            let rows = await db.pool.query("SELECT sender, text, timestamp, file FROM messages WHERE users='" + JSON.stringify(usernames) + "';");
            if(rows.length === 0){
                return 0;
            }
            else{
                let messages = [];
                rows.forEach((item) => {
                    item.message = {
                        sender: item.sender,
                        message: item.text,
                        timestamp: Number(item.timestamp)
                    };
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

    saveMessage: async function(sender, recipient, message, timestamp, files, toxicity){
        try{
            let usernames = {"usernames": [sender, recipient].sort()};
            const insertQuery = "INSERT INTO messages (users, sender, text, timestamp, toxic, file) VALUES (?, ?, ?, ?, ?, ?)";
            if(files){
                await db.pool.query(insertQuery, [JSON.stringify(usernames), sender, message, timestamp, toxicity, files]);
            }
            else{
                await db.pool.query(insertQuery, [JSON.stringify(usernames), sender, message, timestamp, toxicity, null]);
            }
            if(toxicity){
                await db.pool.query("UPDATE users SET toxic=toxic+1 WHERE user_name='" + sender + "'");
            }
        }catch (err) {
            console.log(err);
        }
    },

    checkToxicity: async function(username){
        try{
            let count_toxic = await db.pool.query("SELECT email, toxic FROM users WHERE user_name='" + username + "'");
            return count_toxic[0];
        }catch (err) {
            console.log(err);
        }
    },

    addEvent: async function(orgname, eName, eTimestamp, eDescription, eLat, eLon){
        try{
            const insertQuery = "INSERT INTO events (org_name, name, timestamp, description, lat, lon) VALUES (?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [orgname, eName, eTimestamp, eDescription, eLat, eLon]);
        }catch (err) {
            console.log(err);
        }
    },

    updateEvent: async function(eId, eName, eTimestamp, eDescription, eLat, eLon){
        try{
            await db.pool.query("UPDATE events SET name='" + eName + "', timestamp='" + eTimestamp +
                "', description='" + eDescription + "', lat=" + eLat + ", lon=" + eLon +
                " WHERE id=" + eId + ";");
        }catch (err) {
            console.log(err);
        }
    },

    removeEvent: async function(organ, event_id){
        try{
            let users = await db.pool.query("SELECT userId FROM e_attendance WHERE eventId=?", [event_id]);
            let event = await db.pool.query("SELECT name, org_name, timestamp FROM events WHERE id=?;", [event_id]);
            await db.pool.query("DELETE FROM events WHERE id=? AND org_name=?", [event_id, organ]);
            await db.pool.query("DELETE FROM e_attendance WHERE eventId=?", [event_id]);
            return [users, event[0]];
        }catch (err) {
            console.log(err);
        }
    },

    getEvent: async function(id){
        try{
            return await db.pool.query("SELECT id, org_name, name, timestamp, description, lat, lon, creation_timestamp FROM events WHERE id=?;", [id]);
        }catch (err) {
            console.log(err);
        }
    },

    getEvents: async function(orgname=""){
        try{
            // Testing timezone
            // let testTS = await db.pool.query("SELECT CURRENT_TIMESTAMP;");
            // console.log(testTS);
            if(orgname === ""){
                return await db.pool.query("SELECT id, org_name, name, timestamp, description, lat, lon, creation_timestamp FROM events;");
            }
            else{
                return await db.pool.query("SELECT * FROM events WHERE org_name='"+ orgname +"';");
            }
        }catch (err) {
            console.log(err);
        }
    },

    searchEvents: async function(searchText){
        try{
            searchText = searchText.trim();
            searchText = searchText.replaceAll(" ", "* ") + "*";
            return await db.pool.query("SELECT id FROM events WHERE MATCH(org_name, name) AGAINST(? IN BOOLEAN MODE)", [searchText]);
        }catch (err) {
            console.log(err);
        }
    },

    updateAttendEvent: async function(username, event_id){
        try {
            let row = await db.pool.query("SELECT * FROM e_attendance WHERE userId='" + username + "' AND eventId=" + event_id + ";");
            if(row[0]){
                await db.pool.query("DELETE FROM e_attendance WHERE userId='" + username + "' AND eventId=" + event_id + ";");
                await db.pool.query("UPDATE events SET people_count = people_count - 1 WHERE id=" + event_id + ";");
                return 204;
            }
            else{
                const insertQuery = "INSERT INTO e_attendance (userId, eventId) VALUES (?, ?)";
                await db.pool.query(insertQuery, [username, event_id]);
                await db.pool.query("UPDATE events SET people_count = people_count + 1 WHERE id=" + event_id + ";");
                return 201;
            }
        }catch (err) {
            console.log(err);
        }
    },

    deleteUser: async function(username){
        try {
            await db.pool.query("DELETE FROM users WHERE user_name='" + username + "'");
            await db.pool.query("DELETE FROM sessions WHERE user_name='" + username + "'");
            await db.pool.query("DELETE FROM logins WHERE username='" + username + "'");
            await db.pool.query("DELETE FROM messages WHERE users LIKE'%" + username + "%'");
            await db.pool.query("DELETE FROM friends WHERE user1='" + username + "'");
            await db.pool.query("DELETE FROM friends WHERE user2='" + username + "'");
            await db.pool.query("DELETE FROM addfrcode WHERE username='" + username + "'");
            await db.pool.query("DELETE FROM events WHERE org_name='" + username + "'");
        }catch (err) {
            console.log(err);
        }
    }
};

module.exports = {MARIA_USER_CONTROLLER};