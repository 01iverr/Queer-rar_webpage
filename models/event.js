const mongoose = require('mongoose');

module.exports = mongoose.model('Event',
    new mongoose.Schema({ user_name: String, event: {name: String, place: String, date: Date, info: String, counter: Number}}));