// Importing modules
const express = require("express"); // For web app
const bodyParser = require("body-parser"); // Parse request bodies
const session = require('express-session'); // Manage user sessions
const MongoDBStore = require('connect-mongodb-session')(session); // Store session in MongoDB
const mongoose = require("mongoose"); // For MongoDB interaction
const path = require('path'); // Handle file paths

// Importing files
const config = require("../config/config"); // Load configurations
const controller = require("../controllers/controller"); // Route controllers
const auth = require("../middlewares/auth"); // Authentication middleware

// Constants
const SESSION_EXPIRATION_MILLISECONDS = 1000 * 60 * 60 * 24 * 30; // 30 days in ms
const SESSION_COLLECTION_NAME = 'sessions'; // Session collection name

// Initialize express router
const router = express(); // Create express router 🚀

// Configure MongoDB session store
const sessionStore = new MongoDBStore({
    uri: config.db, // MongoDB connection string
    collection: SESSION_COLLECTION_NAME // Session collection name
});

// Handle session store errors
sessionStore.on('error', (error) => {
    console.error('Session Store Error:', error); // Log session errors
});

// Middleware setup
router.use(bodyParser.json()); // Parse JSON bodies
router.use(bodyParser.urlencoded({ extended: true })); // Parse URL-encoded bodies
router.use(express.static(path.join(__dirname, '../public'))); // Serve static files 📁

// View engine setup
router.set('view engine', 'pug'); // Set view engine
router.set('views', path.join(__dirname, '../views')); // Set views directory

// Session configuration
router.use(session({
    secret: config.secret || "pp-scrt-key", // Secret for session signing
    resave: false, // Don't save if unmodified
    saveUninitialized: false, // Don't save uninitialized sessions
    store: sessionStore, // Use MongoDB for storage
    cookie: { maxAge: SESSION_EXPIRATION_MILLISECONDS }, // Cookie expiration time
    rolling: true // Reset cookie on activity
}));

// Function to update session expiration
const updateSessionExpiration = (sessionId) => {
    const expiresAt = new Date(Date.now() + SESSION_EXPIRATION_MILLISECONDS); // Calculate new expiry date
    mongoose.connection.collection(SESSION_COLLECTION_NAME).updateOne(
        { _id: sessionId }, // Find by session ID
        { $set: { expiresAt: expiresAt } } // Update expiry time
    );
};

// Add 'expiresAt' to new sessions
sessionStore.on('create', (sessionId) => {
    updateSessionExpiration(sessionId); // Extend session duration
});

// Ensure TTL index on session collection
sessionStore.on('connected', () => {
    mongoose.connection.collection(SESSION_COLLECTION_NAME).createIndex(
        { expiresAt: 1 }, // Index for expiry
        { expireAfterSeconds: 0 } // Auto-expire after time
    );
});

router.get('/', auth.isLogout, controller.Load);
router.get('/dashboard', auth.isLogin, controller.DashboardLoad);
router.get('/login', auth.isLogout, (req, res) => res.render('login'));
router.post("/login", auth.isLogout, controller.login_user);
router.get("/logout", auth.isLogin, controller.logout_user);
router.get('/create-account', auth.isLogout, controller.create_account);
router.post('/create-account', auth.isLogout, controller.getting_account);
router.get('/contact', (req, res) => res.render('contact'));
router.get('/term-and-conditions', (req, res) => res.render('terms'));
router.get('/about', (req, res) => res.render('about'));

// Community routes
router.post('/create-community', auth.isLogin, controller.createCommunity);
router.get('/com/:id', auth.isLogin, controller.getCommunityPage);
router.post('/com/:id/raise-problem', auth.isLogin, controller.raiseProblem);
router.post('/mark-problem-solved', auth.isLogin, controller.markProblemSolved);
router.post('/join-community/:id', auth.isLogin, controller.joinCommunity);
router.get('/discover', controller.discoverCommunities);
router.post('/join-community/:id', controller.joinCommunityPublic);
router.post('/com/:id/invite', controller.inviteMember);
router.post('/accept-invitation/:id', controller.acceptInvitation);
router.post('/com/:id/settings', auth.isLogin, controller.updateCommunitySettings);
router.get('/notifications', controller.getNotifications);
router.post('/mark-notification-read', controller.markNotificationRead);
router.get('/notifications', controller.getNotifications);
router.post('/mark-notification-read', controller.markNotificationRead);
router.post('/mark-all-notifications-read', controller.markAllNotificationsRead);

// Community routes (update existing ones)
router.post('/com/:id/invite', controller.inviteMember);
router.post('/com/:id/raise-problem', controller.raiseProblem);
router.post('/mark-problem-solved', controller.markProblemSolved);
router.post('/accept-invitation/:id', controller.acceptInvitation);
router.post('/confirm-solution', controller.confirmSolution);
router.get('/user-profile', controller.getUserProfile);
// updt
router.get('/notifications', controller.getNotifications);
router.post('/mark-notification-read', controller.markNotificationRead);
router.post('/mark-all-notifications-read', controller.markAllNotificationsRead);

// Invitation routes
router.post('/com/:id/invite', controller.inviteMember);
router.post('/accept-invitation/:id', controller.acceptInvitation);

// Discover and Search routes
router.get('/discover', controller.discoverCommunities);
router.get('/search-communities', controller.searchCommunities);

// Profile routes
router.get('/profile', controller.profileSettings);
router.post('/update-profile', controller.updateProfile);
router.get('/forgot-pin', controller.forgotPinPage);
router.post('/forgot-pin', controller.resetPin);
// Make sure this route exists in your server
const Problems = require("../models/problem")
router.get('/problem-audio/:problemId', async (req, res) => {
    try {
        const problem = await Problems.findOne({ pb_id: req.params.problemId });
        
        if (!problem || !problem.audio_data) {
            console.log('Audio not found for problem:', req.params.problemId);
            return res.status(404).send('Audio not found');
        }

        console.log('Serving audio for problem:', req.params.problemId);
        console.log('Audio size:', problem.audio_data.length, 'bytes');
        console.log('Audio MIME type:', problem.audio_mimeType);
        
        // Set appropriate headers based on MIME type
        const mimeType = problem.audio_mimeType || 'audio/mpeg';
        
        res.set({
            'Content-Type': mimeType,
            'Content-Length': problem.audio_data.length,
            'Cache-Control': 'public, max-age=31536000',
            'Accept-Ranges': 'bytes',
            'Content-Disposition': `inline; filename="audio_${req.params.problemId}.${getFileExtension(mimeType)}"`
        });

        // Send the audio buffer
        res.send(problem.audio_data);
        
    } catch (error) {
        console.error('Error serving audio:', error);
        res.status(500).send('Error serving audio');
    }
});

// Helper function to get file extension from MIME type
function getFileExtension(mimeType) {
    const extensions = {
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/mp4': 'mp4',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/webm': 'webm',
        'audio/ogg': 'ogg',
        'audio/aac': 'aac',
        'audio/flac': 'flac'
    };
    
    return extensions[mimeType] || 'mp3';
}

// Export router
module.exports = router; // Export the router 🚀