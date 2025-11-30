// models/problem.js
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
    }
});

module.exports = mongoose.model('Problem', schema);