/**
 * data/i18n.js — Seibi Multi-Language (EN/JP) Translation Engine
 */

'use strict';

const I18n = (() => {

  const STORAGE_KEY = 'seibi_language';
  let _lang = 'en';

  const DICTIONARY = {
    en: {
      // Bottom Nav
      'nav_home': 'Home',
      'nav_assets': 'Assets',
      'nav_history': 'History',
      'nav_notice': 'Notice',

      // Home View
      'subtab_daily': 'Daily Tasks',
      'subtab_calendar': 'Calendar',
      'tasks_empty': 'No tasks scheduled for today.',
      'task_progress': 'Task Progress',
      'active_defects': 'Active Defects',
      'asset_health': 'Asset Health',
      'completed_pct': 'Completed',
      'requires_action': 'Requires action',
      'all_healthy': 'All machines healthy',
      'healthy_ratio': 'active healthy',
      'of': 'of',
      'group_overdue': '🔴 Overdue',
      'group_pending': '⚪ Pending',
      'group_done': '✅ Completed',
      'card_done': 'Done',
      'card_pending': 'Pending',
      'card_overdue': 'Overdue',
      'min': 'min',

      // Calendar View
      'btn_today': 'Today',
      'cal_empty': 'No tasks scheduled.',
      'btn_new_work_order': 'Custom Work Order',
      'modal_create_order': 'Create Custom Work Order',
      'label_title': 'Task Title *',
      'label_date': 'Due Date *',
      'label_time': 'Due Time *',
      'label_assignee': 'Assignee',
      'label_priority': 'Priority',
      'label_notes': 'Description / Notes',
      'btn_create': 'Create Task',

      // Assets View
      'btn_register_machine': 'Register Machine',
      'section_active_robots': 'Active Welding Robots',
      'section_active_regulators': 'Active Gas Regulators',
      'section_active_tools': 'Active Grinders & Sanders',
      'section_inactive_robots': 'Inactive / Offline Equipment',
      'btn_edit_asset': 'Edit Asset & Checklist',
      'meta_location': 'Location',
      'meta_last_checked': 'Last Checked',
      'meta_next_due': 'Next Due',
      'badge_healthy': 'Healthy',
      'badge_due': 'Due',
      'badge_repair': 'Needs Repair',
      'badge_offline': 'Offline',
      'never': 'Never',
      'na': 'N/A',
      'type_co2_mag': 'CO2/MAG Welding Robot',
      'type_tig': 'TIG Welding Robot',
      'type_regulator': 'Gas Regulator',
      'type_grinder': 'Hand Grinder',
      'type_belt_grinder': 'Belt Grinder',
      'type_sander': 'Mini Sander',

      // History View
      'hist_title': 'History Log',
      'sort_date': 'By Date',
      'sort_machine': 'By Machine',
      'inspections': 'inspections',
      'inspection': 'inspection',
      'records': 'records',
      'record': 'record',
      'last': 'Last',
      'hist_empty': 'No completed inspections yet.',

      // Notice View
      'placeholder_name': 'Your name',
      'placeholder_post': 'Post an operational update…',
      'notice_empty': 'No notices yet. Be the first to post.',
      'btn_mark_repaired': '🔧 Mark as Repaired',
      'repaired_label': 'Repaired',
      'repaired_by': 'by',
      'confirm_repair': '✅ Confirm Repair',
      'cancel': 'Cancel',
      'repair_by_placeholder': 'Your name',
      'repair_notes_placeholder': 'What was done to fix it?',
      'confirm_delete_notice': 'Delete this notice?\nThis cannot be undone.',
      'confirm_delete_history': 'Delete this record?\nThis cannot be undone.',

      // Incident reporting
      'btn_report_incident': '🚨 Report Incident',
      'modal_report_incident': 'Report Sudden Incident',
      'label_machine': 'Affected Machine *',
      'label_incident_type': 'Incident Type *',
      'label_incident_time': 'Occurrence Time *',
      'btn_submit_incident': 'Report Incident',
      'placeholder_incident_notes': 'Describe the sudden stoppage, spark, abnormal sound, or other issue in detail...',
      'inc_stoppage': 'Sudden Stoppage',
      'inc_spark': 'Spark / Arc Error',
      'inc_noise': 'Abnormal Noise / Vibration',
      'inc_leak': 'Gas Leak / Odor',
      'inc_overheat': 'Overheating',
      'inc_other': 'Other',
      'resolved_label': 'Resolved',
      'btn_resolve_incident': '🔧 Resolve Incident',
      'confirm_resolve_incident': '✅ Confirm Resolution',
      'resolved_by_placeholder': 'Your name',
      'resolution_notes_placeholder': 'What was done to resolve the incident?',
      'section_active_utilities': 'Facility Utilities',
      'type_utility': 'Facility Utility',
      'nav_manual': 'Manual',
      'manual_title': 'Maintenance Manual',
      'manual_howto': 'How to?',
      'manual_search': 'Search manuals...',
      'manual_step': 'Step',
      'manual_safety': 'Safety Note',
    },
    jp: {
      // Bottom Nav
      'nav_home': 'ホーム',
      'nav_assets': '設備管理',
      'nav_history': '履歴',
      'nav_notice': '掲示板',

      // Home View
      'subtab_daily': '本日のタスク',
      'subtab_calendar': 'カレンダー',
      'tasks_empty': '本日のタスクはありません。',
      'task_progress': 'タスク進捗',
      'active_defects': '異常発生件数',
      'asset_health': '設備健全率',
      'completed_pct': '完了',
      'requires_action': '要対応',
      'all_healthy': '全設備 正常',
      'healthy_ratio': '台稼働中・正常',
      'of': '中',
      'group_overdue': '🔴 期限超過',
      'group_pending': '⚪ 未着手',
      'group_done': '✅ 完了済み',
      'card_done': '完了',
      'card_pending': '未着手',
      'card_overdue': '期限超過',
      'min': '分',

      // Calendar View
      'btn_today': '今日',
      'cal_empty': '予定されているタスクはありません。',
      'btn_new_work_order': '臨時点検・作業の追加',
      'modal_create_order': '臨時点検・作業の作成',
      'label_title': 'タスク名（必須）*',
      'label_date': '実施日（必須）*',
      'label_time': '実施時間（必須）*',
      'label_assignee': '担当者',
      'label_priority': '優先度',
      'label_notes': '作業内容・メモ',
      'btn_create': 'タスクを作成する',

      // Assets View
      'btn_register_machine': '設備登録',
      'section_active_robots': '稼働中のロボット設備',
      'section_active_regulators': '稼働中のガス調整器・配管',
      'section_active_tools': '稼働中のグラインダー・サンダー類',
      'section_inactive_robots': '停止中/非稼働の設備',
      'btn_edit_asset': '設備とチェックシートの編集',
      'meta_location': '配置場所',
      'meta_last_checked': '最終点検日',
      'meta_next_due': '次回点検日',
      'badge_healthy': '正常',
      'badge_due': '期限日',
      'badge_repair': '要修理',
      'badge_offline': '停止中',
      'never': '未実施',
      'na': '対象外',
      'type_co2_mag': 'CO2/MAG 溶接ロボット',
      'type_tig': 'TIG 溶接ロボット',
      'type_regulator': 'ガス調整器・レギュレーター',
      'type_grinder': 'ハンドグラインダー',
      'type_belt_grinder': 'ベルトグラインダー',
      'type_sander': 'ミニサンダー',

      // History View
      'hist_title': '点検履歴ログ',
      'sort_date': '日付順',
      'sort_machine': '設備順',
      'inspections': '件の点検',
      'inspection': '件の点検',
      'records': '件の履歴',
      'record': '件の履歴',
      'last': '最終点検',
      'hist_empty': '完了した点検履歴はありません。',

      // Notice View
      'placeholder_name': 'お名前',
      'placeholder_post': '作業状況・連絡事項を書き込む...',
      'notice_empty': '投稿はありません。最初のメッセージをどうぞ。',
      'btn_mark_repaired': '🔧 修理完了にする',
      'repaired_label': '修理完了',
      'repaired_by': '担当',
      'confirm_repair': '✅ 修理を確定する',
      'cancel': 'キャンセル',
      'repair_by_placeholder': 'あなたの名前',
      'repair_notes_placeholder': 'どのような修理を行いましたか？',
      'confirm_delete_notice': 'この投稿を削除しますか？\n元に戻すことはできません。',
      'confirm_delete_history': 'この履歴レコードを削除しますか？\n元に戻すことはできません。',

      // Incident reporting
      'btn_report_incident': '🚨 異常報告',
      'modal_report_incident': '突発異常・アクシデント報告',
      'label_machine': '発生した設備・機械 *',
      'label_incident_type': '異常の種類 *',
      'label_incident_time': '発生時間 *',
      'btn_submit_incident': '異常を報告する',
      'placeholder_incident_notes': '緊急停止、スパーク、異音、その他アクシデントの詳細を入力してください...',
      'inc_stoppage': '緊急停止・動作停止',
      'inc_spark': 'スパーク・アーク異常',
      'inc_noise': '異音・異常振動',
      'inc_leak': 'ガス漏れ・異臭',
      'inc_overheat': '発熱・過熱',
      'inc_other': 'その他',
      'resolved_label': '解決済み',
      'btn_resolve_incident': '🔧 解決済みにする',
      'confirm_resolve_incident': '✅ 解決を確定する',
      'resolved_by_placeholder': 'あなたの名前',
      'resolution_notes_placeholder': 'どのような対処を行いましたか？',
      'section_active_utilities': '設備ユーティリティ',
      'type_utility': '設備ユーティリティ',
      'nav_manual': 'マニュアル',
      'manual_title': 'メンテナンスマニュアル',
      'manual_howto': '手順を見る',
      'manual_search': 'マニュアルを検索...',
      'manual_step': '手順',
      'manual_safety': '安全上の注意',
    }
  };

  function init() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'jp') {
        _lang = saved;
      }
    } catch (_) {}
  }

  function setLang(lang) {
    if (lang !== 'en' && lang !== 'jp') return;
    _lang = lang;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {}

    // Dispatch a global custom event so views know to refresh
    window.dispatchEvent(new CustomEvent('seibi_language_changed', { detail: lang }));
  }

  function t(key) {
    const dict = DICTIONARY[_lang] || DICTIONARY.en;
    return dict[key] || DICTIONARY.en[key] || key;
  }

  function getLang() {
    return _lang;
  }

  return { init, setLang, t, getLang };

})();
