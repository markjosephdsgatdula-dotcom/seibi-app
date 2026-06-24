/**
 * services/notice-service.js — Business logic & computations for Notice Board
 */

'use strict';

const NoticeService = (() => {

  function relativeTime(isoStr) {
    const diff = Date.now() - new Date(isoStr).getTime();
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    const isJp = I18n.getLang() === 'jp';
    if (mins < 1)   return isJp ? 'たった今' : 'just now';
    if (mins < 60)  return isJp ? `${mins}分前` : `${mins}m ago`;
    if (hours < 24) return isJp ? `${hours}時間前` : `${hours}h ago`;
    return isJp ? `${days}日前` : `${days}d ago`;
  }

  // Avatar colour palette — deterministic from initials so same author always
  // gets the same colour without storing it
  const AVATAR_COLOURS = [
    '#4f7cff', '#f97316', '#22d3ee', '#a855f7',
    '#ec4899', '#10b981', '#f59e0b', '#6366f1',
  ];

  function avatarColour(initials) {
    let hash = 0;
    for (const ch of initials) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
    return AVATAR_COLOURS[hash % AVATAR_COLOURS.length];
  }

  function filterAndSearchNotices(notices, activeFilter, searchQuery) {
    let filtered = notices;
    
    // 1. Filter by category
    if (activeFilter !== 'all') {
      filtered = filtered.filter(n => n.category === activeFilter);
    }

    // 2. Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(n => 
        n.author.toLowerCase().includes(q) || 
        n.message.toLowerCase().includes(q) ||
        (n.repairedBy && n.repairedBy.toLowerCase().includes(q)) ||
        (n.repairNote && n.repairNote.toLowerCase().includes(q))
      );
    }

    return filtered;
  }

  return {
    relativeTime,
    avatarColour,
    filterAndSearchNotices
  };

})();
