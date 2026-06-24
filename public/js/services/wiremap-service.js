/**
 * services/wiremap-service.js — Business logic & layout configuration for Wire Map
 */

'use strict';

const WireMapService = (() => {

  const W = 1160, H = 630;
  const R = { x1:14, y1:22, x2:1146, y2:478 };   // main room
  const E = { x1:14, y1:478, x2:169, y2:608 };   // extension

  const CFG = {
    'pillar':     { color:'#6b7099', label:'Pillar'     },
    'tank':       { color:'#e07b39', label:'Gas Tank'   },
    'controller': { color:'#4f7cff', label:'Controller' },
    'welder-tig': { color:'#00b4d8', label:'TIG Welder' },
    'welder-co2': { color:'#f72585', label:'CO2 Welder' },
    'robot':      { color:'#f4a261', label:'Robot'      },
    'weld-table': { color:'#2ec4b6', label:'Weld Table' },
    'torch':      { color:'#e63946', label:'Torch'      },
  };

  const COND = { Good:'#52c41a', Fair:'#faad14', Poor:'#ff4d4f' };

  function boundPosition(cx, cy, radius, shape, rectW, rectH) {
    const halfW = shape === 'circle' ? radius : rectW / 2;
    const halfH = shape === 'circle' ? radius : rectH / 2;
    
    let x = cx;
    let y = cy;

    // Check if within extension zone (left area below main floor)
    const isLeft = x <= (169 + 50); // allow slightly wider transition margin
    
    if (isLeft) {
      x = Math.max(14 + halfW, Math.min(1146 - halfW, x));
      // If x is positioned within extension bounds, let y go down to 608
      if (x <= 169 - halfW) {
        y = Math.max(22 + halfH, Math.min(608 - halfH, y));
      } else {
        y = Math.max(22 + halfH, Math.min(478 - halfH, y));
      }
    } else {
      x = Math.max(14 + halfW, Math.min(1146 - halfW, x));
      y = Math.max(22 + halfH, Math.min(478 - halfH, y));
    }
    
    return { x, y };
  }

  return {
    W, H, R, E, CFG, COND,
    boundPosition
  };

})();
