const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Scheduled function that runs every day at 08:00 AM.
 * It checks the Realtime Database for due/overdue tasks.
 * If tasks are found, it sends a Push Notification to all registered device tokens.
 */
exports.dailyMaintenanceReminder = onSchedule({
  schedule: '0 8 * * *',
  timeZone: 'Asia/Tokyo'
}, async (event) => {
  try {
    // 1. Fetch tasks from Realtime Database (Staging or Prod depending on deployment)
    const tasksSnap = await admin.database().ref('tasks').once('value');
    const tasks = tasksSnap.val() || {};
    
    const dueTasks = Object.values(tasks).filter(
      t => t.status === 'pending' || t.status === 'overdue'
    );

    if (dueTasks.length === 0) {
      console.log('No pending or overdue tasks. Skipping notification.');
      return;
    }

    const overdueCount = dueTasks.filter(t => t.status === 'overdue').length;
    let body = `You have ${dueTasks.length} task(s) due today.`;
    if (overdueCount > 0) {
      body += ` (${overdueCount} overdue!)`;
    }

    // 2. Fetch all registered FCM tokens
    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    
    // The keys are the actual token strings (fcmTokens/{token})
    const tokens = Object.keys(tokensData);

    if (tokens.length === 0) {
      console.log('No registered FCM tokens found. Skipping notification.');
      return;
    }

    // 3. Send Multicast Message
    const message = {
      notification: {
        title: 'Seibi Maintenance Reminder',
        body: body
      },
      tokens: tokens,
      webpush: {
        notification: {
          icon: '/images/icon.svg',
          vibrate: [200, 100, 200]
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Successfully sent message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
    
  } catch (error) {
    console.error('Error in dailyMaintenanceReminder:', error);
  }
});

exports.testNotification = onRequest({ cors: true }, async (req, res) => {
  try {
    // 1. Fetch tasks from Realtime Database
    const tasksSnap = await admin.database().ref('tasks').once('value');
    const tasks = tasksSnap.val() || {};
    
    const dueTasks = Object.values(tasks).filter(
      t => t.status === 'pending' || t.status === 'overdue'
    );

    if (dueTasks.length === 0) {
      res.status(200).send('No pending or overdue tasks. Skipping notification.');
      return;
    }

    const overdueCount = dueTasks.filter(t => t.status === 'overdue').length;
    let body = `You have ${dueTasks.length} task(s) due today.`;
    if (overdueCount > 0) {
      body += ` (${overdueCount} overdue!)`;
    }

    // 2. Fetch all registered FCM tokens
    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    const tokens = Object.keys(tokensData);

    if (tokens.length === 0) {
      res.status(200).send('No registered FCM tokens found. Skipping notification.');
      return;
    }

    // 3. Send Multicast Message
    const message = {
      notification: {
        title: 'Seibi Maintenance Reminder (TEST)',
        body: body
      },
      tokens: tokens,
      webpush: {
        notification: {
          icon: '/images/icon.svg',
          vibrate: [200, 100, 200]
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    res.status(200).send(`Successfully sent message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
  } catch (error) {
    console.error('Error in testNotification:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});
