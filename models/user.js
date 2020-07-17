const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    landmarks: { 
        type: Array,
        required: true,
        default: []
    },
    socketId: {
        type: String,
        required: true,
        default: "0"
    }, 
    score: {
        type: Number,
        required: true,
        default: 0
    }
})

module.exports = mongoose.model('User', userSchema)