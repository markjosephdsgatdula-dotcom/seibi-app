const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onRequest } = require('firebase-functions/v2/https');
const { onValueCreated } = require('firebase-functions/v2/database');
const { defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');

admin.initializeApp();

// Define Webhook parameter (Firebase CLI will ask for this during deploy)
const lineWorksWebhookUrl = defineString('LINE_WORKS_WEBHOOK_URL');

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
    const tokens = Object.keys(tokensData);

    if (tokens.length === 0) {
      console.log('No registered FCM tokens found. Skipping notification.');
      return;
    }

    const title = '本日の整備点検スケジュール';
    let body = `本日実施予定の点検が ${dueTasks.length} 件あります。`;
    if (overdueCount > 0) {
      body += `（期限超過 ${overdueCount} 件！）`;
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
    console.log(`Successfully sent daily message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
    
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
    const tokens = Object.keys(tokensData);

    if (tokens.length === 0) {
      console.log('No registered FCM tokens found. Skipping notification.');
      return;
    }

    const title = '週次メンテナンス予定';
    const body = `今週実施予定の点検が ${upcomingTasks.length} 件あります。`;

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
    console.log(`Successfully sent weekly message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
    
  } catch (error) {
    console.error('Error in weeklyMaintenanceReminder:', error);
  }
});

/**
 * Test endpoint
 */
exports.testNotification = onRequest({ cors: true, invoker: 'public' }, async (req, res) => {
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
    const tokens = Object.keys(tokensData);

    if (tokens.length === 0) {
      res.status(200).send('No registered FCM tokens found. Skipping notification.');
      return;
    }

    const title = '本日の整備点検スケジュール (テスト)';
    let body = `本日実施予定の点検が ${dueTasks.length} 件あります。`;
    if (overdueCount > 0) {
      body += `（期限超過 ${overdueCount} 件！）`;
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
    res.status(200).send(`Successfully sent message. Success count: ${response.successCount}, Failure count: ${response.failureCount}`);
  } catch (error) {
    console.error('Error in testNotification:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
});

/**
 * Realtime Database trigger on notice creation.
 * Sends a secure notification payload to the LINE WORKS talkroom webhook
 * whenever a sudden incident or checklist defect is reported.
 */
exports.sendLineWorksNotice = onValueCreated({
  ref: '/notices/{noticeId}',
  region: 'asia-southeast1' // Matches Singapore database location
}, async (event) => {
  try {
    const notice = event.data.val();
    if (!notice) return;

    // Only notify for incidents or defects
    const category = notice.category;
    if (category !== 'incident' && category !== 'defect') {
      console.log(`Notice category is "${category}". Skipping LINE WORKS webhook.`);
      return;
    }

    console.log(`Processing LINE WORKS notification for notice ID: ${event.params.noticeId}`);

    // Resolve asset name
    let assetName = notice.assetName;
    if (!assetName && notice.assetId) {
      try {
        const assetSnap = await admin.database().ref(`assets/${notice.assetId}`).once('value');
        const asset = assetSnap.val();
        if (asset) {
          assetName = asset.name;
        }
      } catch (err) {
        console.error('Failed to read asset details from database:', err);
      }
    }
    if (!assetName) {
      assetName = 'Unknown Equipment / 不明な設備';
    }

    // Format occurrence time in JST (Tokyo time)
    const occurrenceTime = formatJSTDateTime(notice.timestamp);

    // Format notice text based on category
    let text = '';
    if (category === 'incident') {
      text = `<m userId="all">\n🚨 突発異常が発生しました (Sudden Incident Alert)\n\n■ 設備名 (Equipment): ${assetName}\n■ 異常内容 (Details): ${notice.message}\n■ 報告者 (Reporter): ${notice.author}\n■ 日時 (Time): ${occurrenceTime}`;
    } else {
      text = `<m userId="all">\n🔧 点検不具合が検出されました (Defect Detected)\n\n■ 設備名 (Equipment): ${assetName}\n■ 不具合内容 (Details): ${notice.message}\n■ 報告者 (Reporter): ${notice.author}\n■ 日時 (Time): ${occurrenceTime}`;
    }

    // Construct payload matching worksmobile schema
    const payload = {
      title: category === 'incident' ? '🚨 異常発生通知 (Incident Alert)' : '🔧 不具合発生通知 (Defect Alert)',
      body: {
        text: text
      },
      button: {
        label: 'アプリを開く (Open Seibi)',
        url: 'https://seibi-app.web.app'
      }
    };

    const webhookUrl = lineWorksWebhookUrl.value();
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`Successfully sent LINE WORKS notification. Status: ${response.status}`);
    } else {
      const respText = await response.text();
      console.error(`Failed to send LINE WORKS notification. Status: ${response.status}. Response: ${respText}`);
    }
  } catch (error) {
    console.error('Error in sendLineWorksNotice trigger:', error);
  }
});

/**
 * Helper to format ISO timestamp to JST (Asia/Tokyo) YYYY-MM-DD HH:MM
 */
function formatJSTDateTime(isoString) {
  try {
    const date = new Date(isoString || Date.now());
    const options = {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    };
    const jstStr = date.toLocaleString('ja-JP', options);
    // Replace slashes with dashes
    return jstStr.replace(/\//g, '-');
  } catch (e) {
    return isoString || '';
  }
}

