/**
 * components/calendar-grid.js — HTML Rendering for Calendar grid and header
 */

'use strict';

const CalendarGrid = (() => {

  function renderHeader(year, month) {
    const isJp = I18n.getLang() === 'jp';
    const monthName = CalendarService.getMonthNames()[month];
    const monthYearHtml = isJp
      ? `<span class="cal-year">${year}年</span><span class="cal-month-name">${monthName}</span>`
      : `<span class="cal-month-name">${monthName}</span><span class="cal-year">${year}</span>`;

    return `
      <div class="cal-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3);">
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <button class="cal-nav-btn" id="cal-prev" onclick="CalendarView.prevMonth()" aria-label="Previous month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div class="cal-month-title" style="flex: none; display: flex; align-items: baseline; gap: var(--space-2);">
            ${monthYearHtml}
          </div>
          <button class="cal-nav-btn" id="cal-next" onclick="CalendarView.nextMonth()" aria-label="Next month">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
        <div style="display: flex; align-items: center; gap: var(--space-2);">
          <button class="cal-today-btn" onclick="CalendarView.goToToday()">${I18n.t('btn_today')}</button>
          <button class="cal-today-btn" style="background: linear-gradient(135deg, #4f7cff, #3054c4); color: #fff; border: none; box-shadow: 0 4px 10px rgba(79, 124, 255, 0.25); display: flex; align-items: center; gap: var(--space-1);" onclick="CalendarView.openCreateOrderModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ${I18n.t('btn_new_work_order')}
          </button>
        </div>
      </div>
    `;
  }

  function renderDayHeaders() {
    return `<div class="cal-day-headers">${CalendarService.getDayNames().map(d => `<div class="cal-day-name">${d}</div>`).join('')}</div>`;
  }

  function renderPill(task) {
    const short = task.title.length > 18 ? task.title.slice(0, 17) + '…' : task.title;
    const isDone = task.status === 'done';
    return `
      <div
        class="cal-pill priority-pill--${task.priority} status-pill--${task.status}"
        data-task-id="${task.id}"
        draggable="${isDone ? 'false' : 'true'}"
        style="${isDone ? 'cursor:default;' : ''}"
        title="${task.title} — ${task.dueTime}"
      >${short}</div>
    `;
  }

  return {
    renderHeader,
    renderDayHeaders,
    renderPill
  };

})();
