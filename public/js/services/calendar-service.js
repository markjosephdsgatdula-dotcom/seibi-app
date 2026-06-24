/**
 * services/calendar-service.js — Business logic & date calculations for Calendar
 */

'use strict';

const CalendarService = (() => {

  function getDayNames() {
    return I18n.getLang() === 'jp'
      ? ['日', '月', '火', '水', '木', '金', '土']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }

  function getMonthNames() {
    return I18n.getLang() === 'jp'
      ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      : [
          'January','February','March','April','May','June',
          'July','August','September','October','November','December',
        ];
  }

  function toDateStr(year, month, day) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function todayStr() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 10);
  }

  function tasksForDate(tasks, dateStr) {
    return tasks.filter(t => t.dueDate === dateStr);
  }

  return {
    getDayNames,
    getMonthNames,
    toDateStr,
    todayStr,
    tasksForDate
  };

})();
