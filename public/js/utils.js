/**
 * utils.js — Shared utility functions for Seibi
 *
 * Loaded first in index.html so every layer can use these safely.
 *
 * Functions:
 *   Utils.escapeHtml(str)  — For rendering user content inside element text.
 *                            Converts newlines to <br> so multi-line messages display correctly.
 *   Utils.escapeAttr(str)  — For embedding strings inside HTML attribute values (e.g. value="...").
 *                            Escapes single quotes instead of newlines.
 */

'use strict';

const Utils = (() => {

  /**
   * Escape a string for safe insertion as element innerHTML / text content.
   * Converts \n → <br> so user-typed newlines render as line breaks.
   * @param {string|null|undefined} str
   * @returns {string}
   */
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/\n/g, '<br>');
  }

  /**
   * Escape a string for safe insertion as an HTML attribute value (e.g. value="...").
   * Escapes single quotes so the value is safe inside both single- and double-quoted attributes.
   * Does NOT convert \n → <br> since attribute values are not rendered as HTML.
   * @param {string|null|undefined} str
   * @returns {string}
   */
  function escapeAttr(str) {
    if (!str) return '';
    return str
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#039;');
  }

  return { escapeHtml, escapeAttr };

})();
