const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    us_id: {
        type: String,
        required: true
    },
    msg: {
        type: String,
        required: true,
        default: ""
    },
    remarks: {
        type: String
    },
    worker_remarks: {  // New field for worker comments
        type: String,
        default: ""
    },
    pb_id: {
        type: String,
        required: true,
        unique: true
    },
    solved: {
        type: Boolean,
        default: false
    },
    confirmed_solved: {  // New field for user confirmation
        type: Boolean,
        default: false
    },
    com_id: {
        type: String,
        required: true
    },
    category: {  // New field for problem category
        type: String,
        required: true,
        default: "general"
    },
    solved_by: {  // Track who solved the problem
        type: String,
        default: null
    },
    audio_data: {
        type: Buffer, // Store audio as binary buffer
        required: false
    },
    audio_mimeType: {
        type: String,
        required: false
    },
    has_audio: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    solved_at: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model('Problem', schema);