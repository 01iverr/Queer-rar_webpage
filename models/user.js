const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    user_name: {type: String, required: true},
    email: {type: String, required: true},
    password: {type: String, required: true},
    first_name: {type:String, required: true},
    last_name: {type:String, required: false},
    pronouns: {type:String, required: false},
    country: {type:String, required: true},
    city: {type:String, required: true},
    post_code: {type:String, required: true},
    phone: {type:String, required: true},
    birthDate: {type:String, required: true},
    learn_us_from: {type:String, required: true},
    friend_list: {type: Array, required: false},
    organization: {type: Boolean, required: true},
    organization_details: {type: String, required: false},
    dating: {type: Boolean, required: true},
    dating_details: {type: String, required: false}
});

module.exports = mongoose.model('User', userSchema);
