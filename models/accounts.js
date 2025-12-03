const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['new_problem', 'problem_solved', 'invitation', 'new_member', 'general']
    },
    message: {
        type: String,
        required: true
    },
    communityId: {
        type: String,
        default: null
    },
    problemId: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    read: {
        type: Boolean,
        default: false
    }
});

const schema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Mob_no: {
        type: Number,
        required: true,
        unique: true,
    },
    PIN: {
        type: String,
        required: true
    },
    role: {
        type: String,
        required: true
    },
    Proff: {
        type: String
    },
    us_id: {
        type: String,
        required: true,
        unique: true
    },
    notification: {
        type: [notificationSchema],
        default: []
    },
    Address:{
        type: String,
        default: ""
    }
});

module.exports = mongoose.model('Account', schema);