// models/community.js - Update with these fields
const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    Name: {
        type: String,
        required: true
    },
    Description: {
        type: String,
        default: ""
    },
    Category: {
        type: Array,
        default: []
    },
    members: {
        type: Array,
        default: []
    },
    invitedMembers: {
        type: Array,
        default: []
    },
    Rating: {
        type: Number,
        default: 0
    },
    gp_id: {
        type: String,
        required: true,
        unique: true
    },
    settings: {
        allowPublicJoin: {
            type: Boolean,
            default: true  // Changed default to true for discoverability
        },
        onlyWorkersCanSolve: {
            type: Boolean,
            default: false
        }
    },
    createdAt: {  // New field for sorting
        type: Date,
        default: Date.now
    },
    isPublic: {  // New field for community visibility
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model('Community', schema);