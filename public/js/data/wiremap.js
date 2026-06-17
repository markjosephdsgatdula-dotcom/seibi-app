/**
 * js/data/wiremap.js — Wire Map data store for Seibi
 *
 * Coordinates are loaded dynamically from Firebase Realtime Database.
 * Canvas size: 1060 × 545 px
 * Main room:  x=14, y=22  →  w=1032, h=374  (bottom at y=396)
 * Extension:  x=14, y=396 →  w=155,  h=130  (separate storage area, bottom-left)
 */

'use strict';

const WireMapStore = (() => {

  function getEquipmentList() {
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.equipment) || [];
  }

  function getWiresList() {
    return (typeof FirebaseSync !== 'undefined' && FirebaseSync.cache.wires) || [];
  }

  function getWiresFor(id) {
    return getWiresList().filter(w => w.from === id || w.to === id);
  }

  function getEquipment(id) {
    return getEquipmentList().find(e => e.id === id) || null;
  }

  function saveEquipment(equipmentList) {
    if (typeof FirebaseSync !== 'undefined') {
      FirebaseSync.cache.equipment = equipmentList;
    }
    if (typeof firebaseDb !== 'undefined') {
      return firebaseDb.ref('equipment').set(equipmentList).catch(err => {
        console.error('[Firebase] Write error on equipment:', err);
      });
    }
    return Promise.resolve();
  }

  return {
    get EQUIPMENT() { return getEquipmentList(); },
    get WIRES() { return getWiresList(); },
    getWiresFor,
    getEquipment,
    saveEquipment
  };

})();
