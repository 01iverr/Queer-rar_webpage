const db = require("./db");
const uuid = require('uuid');

function checkInputs(inputs){
    for(let input of inputs){
        if(typeof input !== "string"){
            throw new Error(String(input) + 'is not a string!');
        }
    }
}

function padTo2Digits(num) {
    return num.toString().padStart(2, '0');
}

function formatDate(date) {
    return (
        [
            date.getUTCFullYear(),
            padTo2Digits(date.getUTCMonth() + 1),
            padTo2Digits(date.getUTCDate()),
        ].join('-') +
        ' ' +
        [
            padTo2Digits(date.getUTCHours()),
            padTo2Digits(date.getUTCMinutes()),
            padTo2Digits(date.getUTCSeconds()),
        ].join(':')
    );
}

const MARIA_USER_CONTROLLER = {
    userIsLocked: async function(username){
        try{
            checkInputs([username]);
            let rows = await db.pool.query("SELECT locked FROM users WHERE user_name = ? ;", [username]);
            return  rows[0].locked === 1;
        }catch (err) {
            console.log(err);
        }
    },

    userNameAvailable: async function (username) {
        try {
            checkInputs([username]);
            let row = await db.pool.query("SELECT user_name FROM users WHERE user_name = ? ;", [username]);
            return typeof row[0] === 'undefined';
        } catch (err) {
            console.log(err);
        }
    },

    getEmail: async function(username){
        try{
            checkInputs([username]);
            return await db.pool.query("SELECT email FROM users WHERE user_name = ? ;", [username]);
        }catch (err) {
            console.log(err);
        }
    },

    getSalt: async function(username){
        try{
            checkInputs([username]);
            let res = await db.pool.query("SELECT salt FROM users WHERE user_name = ? ;", [username]);
            return res[0].salt;
        }catch (err) {
            console.log(err);
        }
    },

    saltAvailable: async function(newSalt){
        try{
            let res = await db.pool.query("SELECT salt FROM users;");
            for(let salt of res){
                if(salt.salt === newSalt){
                    return false;
                }
            }
            return true;
        }catch (err) {
            console.log(err);
        }
    },

    userPassIsCorrect: async function(username, password){
        try {
            checkInputs([username, password]);
            let row = await db.pool.query("SELECT user_name, password FROM users WHERE user_name = ? ;", [username]);
            return row[0].user_name === username && row[0].password === password
        }catch (err) {
            console.log(err);
        }
    },

    userIsOrganization: async function(username){
        try{
            checkInputs([username]);
            let rows = await db.pool.query("SELECT organization FROM users WHERE user_name = ? ;", [username]);
            return rows[0].organization;
        }catch (err) {
            console.log(err);
        }
    },

    userEmailIsCorrect: async function(userEmail){
        try{
            checkInputs([userEmail]);
            let rows = await db.pool.query("SELECT user_name FROM users WHERE email = ? ", [userEmail]);
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
            let rows = await db.pool.query("SELECT * FROM sessions WHERE user_name = ? ;", [username]);
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
            const res = await db.pool.query("SELECT COUNT(success) AS fl FROM logins  WHERE success=0  and username = ? ;", [username]);
            if(parseInt(res[0].fl) > 2){
                await db.pool.query("UPDATE users SET locked = ? WHERE user_name = ?", [1, username]);
            }
        } catch (err) {
            console.log(err);
        }
    },

    logout: async function(username){
        try {
            checkInputs([username]);
            await db.pool.query("DELETE FROM sessions WHERE user_name = ?", [username]);
        } catch (err) {
            console.log(err);
        }
    },

    validSessionId: async function (username, sessionId) {
        try {
            checkInputs([username, sessionId]);
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

    updatePassword: async function(username, newPassword, newSalt){
        try{
            await db.pool.query("UPDATE users SET password = ?, salt = ?, locked=0 WHERE user_name = ?", [newPassword, newSalt, username]);
        }catch (err) {
            console.log(err);
        }
    },

    addUser: async function (nfirstName, nsurName, npronouns, nemail, ncountry, ncity, npostCode, nphone, nbirthDate, nusername, npassword, nsalt, nlearnUsFrom) {
        try {
            checkInputs([nfirstName, nsurName, npronouns, nemail, ncountry, ncity, npostCode, nphone, nbirthDate, nusername, npassword, nsalt, nlearnUsFrom]);
            const insertQuery = "INSERT INTO users (user_name, email, password, salt, first_name, last_name, pronouns, country, city, post_code, phone, birth_date, learn_us_from, organization) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [nusername, nemail, npassword, nsalt, nfirstName, nsurName, npronouns, ncountry, ncity, npostCode, nphone, nbirthDate, nlearnUsFrom, 0]);
        } catch (err) {
            console.log(err);
        }
    },

    addOrganization: async function (nfirstName, nemail, ncountry, ncity, npostCode, nphone, nbirthDate, nusername, npassword, nsalt, nlearnUsFrom) {
        try {
            checkInputs([nfirstName, nemail, ncountry, ncity, npostCode, nphone, nbirthDate, nusername, npassword, nsalt, nlearnUsFrom]);
            const insertQuery = "INSERT INTO users (user_name, email, password, salt, first_name, country, city, post_code, phone, birth_date, learn_us_from, organization, locked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [nusername, nemail, npassword, nsalt, nfirstName, ncountry, ncity, npostCode, nphone, nbirthDate, nlearnUsFrom, 1, 1]);
        } catch (err) {
            console.log(err);
        }
    },

    getProfile: async function(username){
        try{
            checkInputs([username]);
            let info = await db.pool.query("SELECT email, first_name, last_name, pronouns, country, city, post_code, phone, profile_picture FROM users WHERE user_name = ? ;", [username]);
            return info[0]
        }catch (err) {
            console.log(err);
        }
    },

    updateProfile: async function(username, nfirstName, nlastName, npronouns, nemail, nprofilePicture, ncountry, ncity, npostcode, nphone){
        try{
            checkInputs([username, nfirstName, nlastName, npronouns, nemail, ncountry, ncity, npostcode, nphone]);
            let updQuery = "UPDATE users SET email = ?, first_name = ?, last_name = ?, pronouns = ?, country = ?, city = ?, post_code = ?, phone = ?, profile_picture = ? WHERE user_name = ? ;";
            await db.pool.query(updQuery, [nemail, nfirstName, nlastName, npronouns, ncountry, ncity, npostcode, nphone, nprofilePicture, username]);
        }catch (err) {
            console.log(err);
        }
    },

    getProfilePicture: async function(username){
        try{
            checkInputs([username]);
            let prof_pic = await db.pool.query("SELECT profile_picture FROM users WHERE user_name = ? ;", [username]);
            return prof_pic[0]
        }catch (err) {
            console.log(err);
        }
    },

    getLocation: async function(username) {
        try {
            return await db.pool.query("SELECT post_code, city, country FROM users WHERE user_name = ? ;", [username]);
        } catch (err) {
            console.log(err);
        }
    },

    getLastCommunications: async function(username){
        try {
            return await db.pool.query("SELECT messages.users, messages.sender, messages.text, messages.file FROM messages," +
            " (SELECT users, max(messages.timestamp) AS timestamp FROM messages WHERE users LIKE ? GROUP BY users ORDER BY TIMESTAMP DESC) last_message" +
            " WHERE messages.users=last_message.users" +
            " AND messages.timestamp=last_message.timestamp;", ["%" + username + "%"]);
        }catch (err) {
            console.log(err);
        }
    },

    getFriends: async function(username, names=false){
        try{
            checkInputs([username]);
            let user_names = await db.pool.query("SELECT user2 FROM friends WHERE user1 = ? ;", [username]);
            if(user_names.length === 0){
                return 0;
            }
            else if(names){
                return user_names;
            }
            else{
                let friendsList = [];
                const query = "SELECT profile_picture FROM users WHERE user_name=?";
                for (const item of user_names) {
                    let res = await db.pool.query(query, [item.user2]);
                    let friend = {
                        name: item.user2,
                        prof_pic: JSON.parse(res[0].profile_picture)[0]
                    }
                    friendsList.push(friend)
                }
                return friendsList;
            }
        }catch (err) {
            console.log(err);
        }
    },

    addFriend: async function(username, friend){
        try{
            let rows = await db.pool.query("SELECT * FROM friends WHERE user1 = ? AND user2 = ? ;", [username, friend]);
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
        let code = await db.pool.query("SELECT fr_code FROM addfrcode WHERE username = ? ;", [username]);
        let date = new Date().toJSON();
        if(code.length > 0){
            await db.pool.query("UPDATE addfrcode SET date = ? WHERE username = ? ;", [username, date.slice(0, 10) + " " + date.slice(11,19)])
        }
        else{
            code = uuid.v4();
            const loginsQuery = ("INSERT INTO addfrcode (username, date, fr_code) VALUES (?, ?, ?)");
            await db.pool.query(loginsQuery, [username, date.slice(0, 10) + " " + date.slice(11,19), code]);
            code = [{fr_code: code}];
        }
        return code[0];
    },

    getFriendFromCode: async function(code){
        try{
            checkInputs([code]);
            let friend = await db.pool.query("SELECT username FROM addfrcode WHERE fr_code = ? ;", [code]);
            if(friend){
                return friend[0].username;
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
            checkInputs([friend]);
            const delQuery = "DELETE FROM friends WHERE user1 = ? AND user2 = ? ;";
            await db.pool.query(delQuery, [username, friend]);
            await db.pool.query(delQuery, [friend, username]);
        }catch (err) {
            console.log(err);
        }
    },

    getMessages: async function(username1, username2, n){
        try{
            checkInputs([username2]);
            let usernames = {"usernames": [username1, username2].sort()};
            let rows = await db.pool.query("SELECT sender, text, timestamp, file FROM messages WHERE users = ? ORDER BY timestamp DESC LIMIT ?;", [JSON.stringify(usernames), Number(n)]);
            if(rows.length === 0){
                return [];
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
            checkInputs([sender, recipient, message]);
            let usernames = {"usernames": [sender, recipient].sort()};
            const insertQuery = "INSERT INTO messages (users, sender, text, timestamp, toxic, file) VALUES (?, ?, ?, ?, ?, ?)";
            if(files){
                await db.pool.query(insertQuery, [JSON.stringify(usernames), sender, message, timestamp, toxicity, files]);
            }
            else{
                await db.pool.query(insertQuery, [JSON.stringify(usernames), sender, message, timestamp, toxicity, null]);
            }
            if(toxicity){
                await db.pool.query("UPDATE users SET toxic=toxic+1 WHERE user_name = ? ;", [sender]);
            }
        }catch (err) {
            console.log(err);
        }
    },

    checkToxicity: async function(username){
        try{
            let count_toxic = await db.pool.query("SELECT email, toxic FROM users WHERE user_name = ? ;", [username]);
            return count_toxic[0];
        }catch (err) {
            console.log(err);
        }
    },

    addEvent: async function(orgname, eName, eTimestamp, eDescription, eLat, eLon){
        try{
            checkInputs([orgname, eName, eTimestamp, eDescription, eLat, eLon]);
            const insertQuery = "INSERT INTO events (org_name, name, timestamp, description, lat, lon) VALUES (?, ?, ?, ?, ?, ?)";
            await db.pool.query(insertQuery, [orgname, eName, eTimestamp, eDescription, eLat, eLon]);
        }catch (err) {
            console.log(err);
        }
    },

    updateEvent: async function(eId, eName, eTimestamp, eDescription, eLat, eLon){
        try{
            checkInputs([eId, eName, eTimestamp, eDescription, eLat, eLon]);
            await db.pool.query("UPDATE events SET name = ? , timestamp = ? , description = ? , lat = ? , lon = ? WHERE id = ? ;", [eName, eTimestamp, eDescription, eLat, eLon, eId]);
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
            return await db.pool.query("SELECT id, org_name, name, timestamp, description, lat, lon, creation_timestamp, people_count FROM events WHERE id=?;", [id]);
        }catch (err) {
            console.log(err);
        }
    },

    getEvents: async function(orgname=""){
        try{
            if(orgname === ""){
                return await db.pool.query("SELECT id, org_name, name, timestamp, description, lat, lon, creation_timestamp FROM events WHERE timestamp > ? ;", [formatDate(new Date())]);
            }
            else{
                return await db.pool.query("SELECT * FROM events WHERE org_name = ? AND timestamp > ? ;", [orgname, formatDate(new Date())]);
            }
        }catch (err) {
            console.log(err);
        }
    },

    searchEvents: async function(searchText){
        try{
            checkInputs([searchText]);
            searchText = searchText.trim();
            searchText = searchText.replaceAll(" ", "* ") + "*";
            return await db.pool.query("SELECT id FROM events WHERE timestamp > ? AND MATCH(org_name, name) AGAINST(? IN BOOLEAN MODE) ;", [formatDate(new Date()), searchText]);
        }catch (err) {
            console.log(err);
        }
    },

    updateAttendEvent: async function(username, event_id){
        try {
            checkInputs([username, event_id]);
            let row = await db.pool.query("SELECT * FROM e_attendance WHERE userId = ? AND eventId = ? ;", [username, event_id]);
            if(row[0]){
                await db.pool.query("DELETE FROM e_attendance WHERE userId = ? AND eventId = ? ;", [username, event_id]);
                await db.pool.query("UPDATE events SET people_count = people_count - 1 WHERE id = ? ;", [event_id]);
                return 204;
            }
            else{
                const insertQuery = "INSERT INTO e_attendance (userId, eventId) VALUES (?, ?)";
                await db.pool.query(insertQuery, [username, event_id]);
                await db.pool.query("UPDATE events SET people_count = people_count + 1 WHERE id = ? ;", [event_id]);
                return 201;
            }
        }catch (err) {
            console.log(err);
        }
    },

    userAttendances: async function(username){
        try {
            return  await db.pool.query("SELECT eventId FROM e_attendance WHERE userId = ? ;", [username]);
        }catch (err) {
            console.log(err);
        }
    },

    addToDating: async function(username, gender, info, searchGender, minAge, maxAge, distance){
        try {
            checkInputs([info]);
            checkInputs(gender);
            checkInputs(searchGender);
            gender = gender.join(",");
            searchGender = searchGender.join(",");
            let res_year = await db.pool.query("SELECT YEAR(birth_date) AS year FROM users WHERE user_name = ? ;", [username]);
            await db.pool.query("INSERT INTO dating (user_name, gender, birth_year, info, look_gender, look_min_age, look_max_age, look_distance)" +
                                    " VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [username, gender, res_year[0].year, info, searchGender, minAge, maxAge, distance]);
        }catch (err) {
            console.log(err);
        }
    },

    updateDatingUser: async function(username, gender, info, searchGender, minAge, maxAge, distance){
        try {
            checkInputs([info]);
            checkInputs(gender);
            checkInputs(searchGender);
            gender = gender.join(",");
            searchGender = searchGender.join(",");
            await db.pool.query("UPDATE dating SET gender = ?, info = ?, look_gender = ?, look_min_age = ?, look_max_age = ?, look_distance = ? " +
                " WHERE user_name = ? ;", [gender, info, searchGender, minAge, maxAge, distance, username]);
        }catch (err) {
            console.log(err);
        }
    },

    removeFromDating: async function(username){
        try {
            await db.pool.query("DELETE FROM dating WHERE user_name = ? ;", [username]);
        }catch (err) {
            console.log(err);
        }
    },

    datingUser: async function(username) {
        try {
            return await db.pool.query("SELECT user_name, gender, info, look_gender, look_min_age, look_max_age, look_distance FROM dating " +
                                            "WHERE user_name = ? ;", [username]);
        }catch (err) {
            console.log(err);
        }
    },

    userIsDating: async function(username){
        try{
            let row = await db.pool.query("SELECT user_name FROM dating WHERE user_name = ? ;", [username]);
            return typeof row[0] !== 'undefined';
        }catch (err) {
            console.log(err);
        }
    },

    filterDatingUsers: async function(genderSel, age_lower, age_upper){
        try {
            let query = "SELECT user_name, YEAR(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL birth_year YEAR)) AS age, " +
                                "info, look_distance, look_gender FROM dating WHERE FIND_IN_SET('";
            let genderPref = genderSel.join("', gender) OR FIND_IN_SET('");
            genderPref += "', gender) ";
            query += genderPref;
            return await db.pool.query(query + "AND birth_year BETWEEN " +
                "YEAR(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL ? YEAR)) AND " +
                "YEAR(DATE_SUB(CURRENT_TIMESTAMP(), INTERVAL ? YEAR));", [age_upper, age_lower]);
        }catch (err) {
            console.log(err);
        }
    },

    deleteUser: async function(username){
        try {
            await db.pool.query("DELETE FROM sessions WHERE user_name = ? ;", [username]);
            await db.pool.query("DELETE FROM logins WHERE username = ? ;", [username]);
            await db.pool.query("DELETE FROM messages WHERE users LIKE ? ;", ["%" + username + "%"]);
            await db.pool.query("DELETE FROM friends WHERE user1 = ? ;", [username]);
            await db.pool.query("DELETE FROM friends WHERE user2 = ? ;", [username]);
            await db.pool.query("DELETE FROM addfrcode WHERE username = ? ;", [username]);
            await db.pool.query("DELETE FROM events WHERE org_name = ? ;", [username]);
            await db.pool.query("DELETE FROM dating WHERE user_name = ? ;", [username]);
            await db.pool.query("DELETE FROM users WHERE user_name = ? ;", [username]);
        }catch (err) {
            console.log(err);
        }
    }
};

module.exports = {MARIA_USER_CONTROLLER};