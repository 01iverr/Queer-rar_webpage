require("dotenv").config();
const mongoose = require('mongoose');
const DATABASE_URL = process.env.DB;
const User = require("../models/user");
const Session = require("../models/session");
const Message = require("../models/message");
mongoose.connect(DATABASE_URL);

const USER_CONTROLLER = {
    getUserFromUsername: async function(username){
        let result = await User.find({user_name: username});
        return result[0];
    },

    userPassIsCorrect: function(userObj, username, password){
        return userObj.user_name === username && userObj.password === password
    },

    userEmailIsCorrect: async function(email){
        let res = await User.findOne({email: email});
        if(res !== null){
            return res.user_name;
        }
        else{
            return 0;
        }
    },

    login: async function(username, sessionId){
        let res = await Session.find({user_name: username});
        // console.log(user_name + " " + sessionId)
        if(!res.length){
            let newUserObj = new Session({user_name: username, session_id: sessionId});
            await newUserObj.save();
        }
        else{
            let up = await Session.updateOne({user_name: username}, {session_id: sessionId});
            // console.log(up);
        }
    },

    logout: async function(username){
        let del = await Session.deleteOne({user_name: username});
        // console.log(del);
    },

    validSessionId: async function (username, sessionId) {
        let res = await Session.find({user_name: username});
        return res[0].session_id === sessionId;
    },

    changeSessionId: async function(username, sessionId){
        let res = await Session.updateOne({user_name: username}, {session_id: sessionId});
        if(res.modifiedCount === 0){
            let reset_session = new Session({user_name: username, session_id: sessionId});
            await reset_session.save();
        }
    },

    updatePassword: async function(username, password){
        let up = await User.updateOne({user_name: username}, {password: password});
        // console.log(up);
    },

    addUser: async function(firstName, surName, pronouns, email, country, city, postCode, phone, birthDate, username, password, learnUsFrom){
        let newUser = new User({
            user_name: username,
            email: email,
            password: password,
            first_name: firstName,
            last_name: surName,
            pronouns: pronouns,
            country: country,
            city: city,
            post_code: postCode,
            phone: phone,
            birthDate: birthDate,
            learn_us_from: learnUsFrom,
            friend_list: [],
            organization: false,
            organization_details: "",
            dating: false,
            dating_details: ""
        });
        await newUser.save();
    },

    getFriends: async function(username){
        let res = await this.getUserFromUsername(username);
        // console.log(res.friend_list);
        return res.friend_list;
    },

    getMessages: async function(username1, username2){
        let res = await Message.findOne({users: [username1, username2].sort()});
        if(res != null){
            // console.log(res)
            return res.messages;
        }
        else{
            return 0;
        }
    },

    saveMessage: async function(sender, recipient, message, timestamp){
        let res = await this.getMessages(sender, recipient);
        let newMessage = {sender: sender, message: message, timestamp: timestamp};
        if(res !== 0){
            res.push(newMessage);
            await Message.updateOne({users: [sender, recipient].sort()}, {messages: res});
        }
        else{
            let newConversation = new Message({users: [sender, recipient].sort(), messages: [newMessage]});
            await newConversation.save();
        }
    }
};

module.exports = {USER_CONTROLLER};