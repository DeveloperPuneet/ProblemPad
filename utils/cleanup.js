const cron = require('node-cron');
const Problem = require('../models/problem');

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
  });
  
  // Also run once on startup for testing
  deleteOldProblems();              // Run on startup
}

module.exports = {
  deleteOldProblems,
  startCleanupSchedule
};