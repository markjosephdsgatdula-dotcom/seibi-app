const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Helper to get date string 'YYYY-MM-DD' for Tokyo timezone
 */
function getTokyoDateString(daysOffset = 0) {
  const date = new Date();
  // Add offset
  date.setDate(date.getDate() + daysOffset);
  // Convert to Tokyo time
  const tokyoTime = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const year = tokyoTime.getFullYear();
  const month = String(tokyoTime.getMonth() + 1).padStart(2, '0');
  const day = String(tokyoTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Scheduled function that runs every day at 06:00 AM.
 * Notifies about tasks due TODAY or OVERDUE.
 */
exports.dailyMaintenanceReminder = onSchedule({
  schedule: '0 6 * * *',
  timeZone: 'Asia/Tokyo'
}, async (event) => {
  try {
    const todayStr = getTokyoDateString(0);

    const tasksSnap = await admin.database().ref('tasks').once('value');
    const tasks = tasksSnap.val() || {};
    
    const dueTasks = Object.values(tasks).filter(t => {
      if (t.status === 'done') return false;
      return t.dueDate <= todayStr;
    });

    if (dueTasks.length === 0) {
      console.log('No pending or overdue tasks for today. Skipping notification.');
      return;
    }

    const overdueCount = dueTasks.filter(t => t.dueDate < todayStr).length;

    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    
    // Group tokens by language preference
    const groups = { en: [], jp: [] };
    Object.entries(tokensData).forEach(([token, data]) => {
      const lang = (data && data.lang) === 'jp' ? 'jp' : 'en';
      groups[lang].push(token);
    });

    for (const [lang, tokens] of Object.entries(groups)) {
      if (tokens.length === 0) continue;

      let title, body;
      if (lang === 'jp') {
        title = '本日の整備点検スケジュール';
        body = `本日実施予定の点検が ${dueTasks.length} 件あります。`;
        if (overdueCount > 0) {
          body += `（期限超過 ${overdueCount} 件！）`;
        }
      } else {
        title = 'Seibi Daily Maintenance';
        body = `You have ${dueTasks.length} task(s) to complete today.`;
        if (overdueCount > 0) {
          body += ` (${overdueCount} overdue!)`;
        }
      }

      const message = {
        notification: {
          title: title,
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
      console.log(`Successfully sent daily message in '${lang}'. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    }
    
  } catch (error) {
    console.error('Error in dailyMaintenanceReminder:', error);
  }
});

/**
 * Scheduled function that runs every Monday at 06:00 AM.
 * Notifies about tasks due in the UPCOMING WEEK.
 */
exports.weeklyMaintenanceReminder = onSchedule({
  schedule: '0 6 * * 1', // 06:00 AM on Monday
  timeZone: 'Asia/Tokyo'
}, async (event) => {
  try {
    const todayStr = getTokyoDateString(0);
    const nextWeekStr = getTokyoDateString(7);

    const tasksSnap = await admin.database().ref('tasks').once('value');
    const tasks = tasksSnap.val() || {};
    
    const upcomingTasks = Object.values(tasks).filter(t => {
      if (t.status === 'done') return false;
      return t.dueDate >= todayStr && t.dueDate <= nextWeekStr;
    });

    if (upcomingTasks.length === 0) {
      console.log('No upcoming tasks for the week. Skipping notification.');
      return;
    }

    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    
    // Group tokens by language preference
    const groups = { en: [], jp: [] };
    Object.entries(tokensData).forEach(([token, data]) => {
      const lang = (data && data.lang) === 'jp' ? 'jp' : 'en';
      groups[lang].push(token);
    });

    for (const [lang, tokens] of Object.entries(groups)) {
      if (tokens.length === 0) continue;

      let title, body;
      if (lang === 'jp') {
        title = '週次メンテナンス予定';
        body = `今週実施予定の点検が ${upcomingTasks.length} 件あります。`;
      } else {
        title = 'Seibi Weekly Forecast';
        body = `You have ${upcomingTasks.length} task(s) scheduled for this week.`;
      }

      const message = {
        notification: {
          title: title,
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
      console.log(`Successfully sent weekly message in '${lang}'. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    }
    
  } catch (error) {
    console.error('Error in weeklyMaintenanceReminder:', error);
  }
});

/**
 * Test endpoint
 */
exports.testNotification = onRequest({ cors: true }, async (req, res) => {
  try {
    const todayStr = getTokyoDateString(0);

    const tasksSnap = await admin.database().ref('tasks').once('value');
    const tasks = tasksSnap.val() || {};
    
    const dueTasks = Object.values(tasks).filter(t => {
      if (t.status === 'done') return false;
      return t.dueDate <= todayStr;
    });

    if (dueTasks.length === 0) {
      res.status(200).send('No pending or overdue tasks for today. Skipping notification.');
      return;
    }

    const overdueCount = dueTasks.filter(t => t.dueDate < todayStr).length;

    const tokensSnap = await admin.database().ref('fcmTokens').once('value');
    const tokensData = tokensSnap.val() || {};
    
    // Group tokens by language preference
    const groups = { en: [], jp: [] };
    Object.entries(tokensData).forEach(([token, data]) => {
      const lang = (data && data.lang) === 'jp' ? 'jp' : 'en';
      groups[lang].push(token);
    });

    let results = [];
    for (const [lang, tokens] of Object.entries(groups)) {
      if (tokens.length === 0) continue;

      let title, body;
      if (lang === 'jp') {
        title = '本日の整備点検スケジュール (テスト)';
        body = `本日実施予定の点検が ${dueTasks.length} 件あります。`;
        if (overdueCount > 0) {
          body += `（期限超過 ${overdueCount} 件！）`;
        }
      } else {
        title = 'Seibi Daily Maintenance (TEST)';
        body = `You have ${dueTasks.length} task(s) to complete today.`;
        if (overdueCount > 0) {
          body += ` (${overdueCount} overdue!)`;
        }
      }

      const message = {
        notification: {
          title: title,
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
      results.push(`Sent '${lang}' messages. Success: ${response.successCount}, Failure: ${response.failureCount}`);
    }

    res.status(200).send(results.join('\n') || 'No registered FCM tokens found.');
  } catch (error) {
    console.error('Error in testNotification:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});
