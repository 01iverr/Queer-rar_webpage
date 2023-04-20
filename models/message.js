const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    users: {type: [String, String], required: true},
    messages: {type: [{
            sender:String,
            message:String,
            timestamp: Number
        }], required: true}
});

module.exports = mongoose.model('Message', messageSchema);
