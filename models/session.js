const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
    user_name: {type: String, required: true},
    session_id: {type: String, required: true}
});

module.exports = mongoose.model('Session', sessionSchema);