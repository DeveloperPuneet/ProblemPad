const cron = require('node-cron');
const Problem = require('../models/problem');

// Function to delete old solved problems
async function deleteOldProblems() {
  try {
    console.log('🔧 Running problem cleanup...');
    
    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Find and delete problems that were solved more than 30 days ago
    const result = await Problem.deleteMany({
      solved: true,
      confirmed_solved: true,
      solved_at: { $lte: thirtyDaysAgo }
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
    await deleteOldProblems();
  });
  
  // Also run once on startup for testing
  deleteOldProblems();
}

module.exports = {
  deleteOldProblems,
  startCleanupSchedule
};