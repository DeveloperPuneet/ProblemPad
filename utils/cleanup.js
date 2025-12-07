const cron = require('node-cron');
const Problem = require('../models/problem');
const Accounts = require('../models/accounts');

// Function to delete old solved problems
async function deleteOldProblems() {
  try {
    console.log('🔧 Running problem cleanup...');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30); 
    
    // Find and delete old problems
    const result = await Problem.deleteMany({
      solved: true,                  // Only solved problems
      confirmed_solved: true,       // And confirmed solved
      solved_at: { $lte: thirtyDaysAgo } // Older than 30 days
    });
    
    console.log(`✅ Deleted ${result.deletedCount} old problems`);
    return result.deletedCount;
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return 0;
  }
}

// Schedule to run every day at 2:00 AM
function startCleanupSchedule() {
  console.log('⏰ Cleanup scheduler started - will run daily at 2:00 AM');
  
  cron.schedule('0 2 * * *', async () => {
    console.log('🕑 Running scheduled cleanup...');
    await deleteOldProblems();       // Run cleanup function
    await deleteOldNotifications();  // Also clean old notifications
  });
  
  // Also run once on startup for testing
  deleteOldProblems();              // Run on startup
  deleteOldNotifications();         // Run notifications cleanup on startup
}

// Function to delete notifications older than 30 days
async function deleteOldNotifications() {
  try {
    console.log('🔧 Running notifications cleanup...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Remove notifications older than 30 days from all accounts
    const result = await Accounts.updateMany(
      {},
      { $pull: { notification: { timestamp: { $lte: thirtyDaysAgo } } } }
    );

    console.log(`✅ Notifications cleanup: matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    return result.modifiedCount;
  } catch (error) {
    console.error('❌ Notifications cleanup error:', error);
    return 0;
  }
}

module.exports = {
  deleteOldProblems,
  startCleanupSchedule
};