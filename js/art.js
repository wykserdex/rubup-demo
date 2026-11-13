'use strict';
/* Hand-authored vector art — every card is drawn in code, one coherent neon style. */
const ART = (() => {
  let uid = 0;
  const F = 'Manrope,sans-serif';
  const FD = 'Unbounded,Manrope,sans-serif';

  function defs(p, extra) {
    return `<defs>
<radialGradient id="${p}bg" cx="50%" cy="30%" r="90%"><stop offset="0%" stop-color="#2b1f60"/><stop offset="55%" stop-color="#161239"/><stop offset="100%" stop-color="#0a0a20"/></radialGradient>
<linearGradient id="${p}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff0bd"/><stop offset="45%" stop-color="#ffc93c"/><stop offset="100%" stop-color="#d98f12"/></linearGradient>
<linearGradient id="${p}goldD" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f5b93a"/><stop offset="100%" stop-color="#a86e0a"/></linearGradient>
<linearGradient id="${p}red" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ff9db1"/><stop offset="45%" stop-color="#ff4d6b"/><stop offset="100%" stop-color="#b1173a"/></linearGradient>
<linearGradient id="${p}mag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffb3ef"/><stop offset="45%" stop-color="#ff4fd8"/><stop offset="100%" stop-color="#a3128a"/></linearGradient>
<linearGradient id="${p}vio" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b3a1ff"/><stop offset="45%" stop-color="#7c5cff"/><stop offset="100%" stop-color="#4a2fd0"/></linearGradient>
<linearGradient id="${p}blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b5e0ff"/><stop offset="45%" stop-color="#3fa9ff"/><stop offset="100%" stop-color="#1668c9"/></linearGradient>
<linearGradient id="${p}green" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b8f8e0"/><stop offset="45%" stop-color="#2fe6a7"/><stop offset="100%" stop-color="#0c9a6c"/></linearGradient>
<linearGradient id="${p}white" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="#d9d6f2"/></linearGradient>
<linearGradient id="${p}dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3c3c72"/><stop offset="100%" stop-color="#17173a"/></linearGradient>
<linearGradient id="${p}flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff3c4"/><stop offset="45%" stop-color="#ff9f1c"/><stop offset="100%" stop-color="#ff4d2e"/></linearGradient>
<linearGradient id="${p}vin" x1="0" y1="0" x2="0" y2="1"><stop offset="55%" stop-color="#05051a" stop-opacity="0"/><stop offset="100%" stop-color="#05051a" stop-opacity=".85"/></linearGradient>
<pattern id="${p}dots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="#8f73ff" opacity=".13"/></pattern>
<filter id="${p}glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="${p}soft" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="22"/></filter>
${extra || ''}</defs>`;
  }

  const spark = (x, y, s, c, o = 1) => `<path d="M${x} ${y - s} L${x + s * .22} ${y - s * .22} L${x + s} ${y} L${x + s * .22} ${y + s * .22} L${x} ${y + s} L${x - s * .22} ${y + s * .22} L${x - s} ${y} L${x - s * .22} ${y - s * .22} Z" fill="${c}" opacity="${o}"/>`;
  const coin = (x, y, r, p) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * .64}" fill="none" stroke="#a86e0a" stroke-width="${Math.max(1.4, r * .09)}" opacity=".75"/><text x="${x}" y="${y + r * .36}" text-anchor="middle" font-size="${r * 1.05}" font-weight="900" fill="#a86e0a" font-family="${F}">₽</text></g>`;
  const chip = (x, y, r, p, kind) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${p}${kind})" stroke="#0a0a20" stroke-width="2"/><circle cx="${x}" cy="${y}" r="${r * .78}" fill="none" stroke="#fff" stroke-width="${r * .16}" stroke-dasharray="${r * .3} ${r * .26}" opacity=".9"/><circle cx="${x}" cy="${y}" r="${r * .4}" fill="#0a0a20" opacity=".35"/></g>`;
  const gem = (x, y, s, p, kind) => `<g transform="translate(${x} ${y})"><polygon points="0,${-s} ${s * .8},${-s * .25} ${s * .5},${s} ${-s * .5},${s} ${-s * .8},${-s * .25}" fill="url(#${p}${kind})" stroke="#ffffff" stroke-opacity=".35" stroke-width="1.4"/><polyline points="${-s * .8},${-s * .25} 0,${-s * .08} ${s * .8},${-s * .25}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".6"/><line x1="0" y1="${-s}" x2="0" y2="${-s * .08}" stroke="#fff" stroke-width="1.4" opacity=".6"/><line x1="${-s * .5}" y1="${s}" x2="0" y2="${-s * .08}" stroke="#fff" stroke-width="1.1" opacity=".4"/><line x1="${s * .5}" y1="${s}" x2="0" y2="${-s * .08}" stroke="#fff" stroke-width="1.1" opacity=".4"/></g>`;
  const wedge = (cx, cy, r, a0, a1) => {
    const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0), x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    return `M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${(a1 - a0) > Math.PI ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
  };
  const spade = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s / 24})" d="M0,-20 C-16,-4 -24,4 -24,12 C-24,20 -16,24 -10,22 C-12,28 -14,32 -16,34 L16,34 C14,32 12,28 10,22 C16,24 24,20 24,12 C24,4 16,-4 0,-20 Z" fill="${c}"/>`;
  const heart = (x, y, s, c) => `<path transform="translate(${x} ${y}) scale(${s / 24})" d="M0,26 C-26,4 -24,-16 -12,-18 C-4,-19 0,-12 0,-8 C0,-12 4,-19 12,-18 C24,-16 26,4 0,26 Z" fill="${c}"/>`;
  const club = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s / 24})" fill="${c}"><circle cx="0" cy="-12" r="11"/><circle cx="-11" cy="6" r="11"/><circle cx="11" cy="6" r="11"/><path d="M-4 8 L-8 32 L8 32 L4 8 Z"/></g>`;

  function cowFace(x, y, s, p) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
<ellipse cx="-36" cy="-20" rx="15" ry="9" fill="url(#${p}white)" transform="rotate(-32 -36 -20)"/><ellipse cx="36" cy="-20" rx="15" ry="9" fill="url(#${p}white)" transform="rotate(32 36 -20)"/>
<ellipse cx="-36" cy="-20" rx="8" ry="4.5" fill="#ffb3c8" transform="rotate(-32 -36 -20)"/><ellipse cx="36" cy="-20" rx="8" ry="4.5" fill="#ffb3c8" transform="rotate(32 36 -20)"/>
<path d="M-24 -34 q-6 -16 6 -20 q3 11 5 18 Z" fill="url(#${p}gold)"/><path d="M24 -34 q6 -16 -6 -20 q-3 11 -5 18 Z" fill="url(#${p}gold)"/>
<circle cx="0" cy="0" r="38" fill="url(#${p}white)"/>
<path d="M-38 -4 a38 38 0 0 1 24 -33 q12 12 1 26 q-15 10 -25 7 Z" fill="#23233f"/>
<circle cx="-14" cy="-4" r="4.6" fill="#1a1a2e"/><circle cx="14" cy="-4" r="4.6" fill="#1a1a2e"/><circle cx="-12.5" cy="-5.5" r="1.5" fill="#fff"/><circle cx="15.5" cy="-5.5" r="1.5" fill="#fff"/>
<ellipse cx="0" cy="18" rx="22" ry="14" fill="#ffc9d6"/><ellipse cx="-8" cy="17" rx="3.4" ry="5" fill="#d67a95"/><ellipse cx="8" cy="17" rx="3.4" ry="5" fill="#d67a95"/>
<path d="M-8 26 q8 6 16 0" stroke="#d67a95" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`;
  }

  function base(p, body, glowColor, extra) {
    return `<svg viewBox="0 0 400 420" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${defs(p, extra)}<rect width="400" height="420" fill="url(#${p}bg)"/><rect width="400" height="420" fill="url(#${p}dots)"/><ellipse cx="200" cy="200" rx="155" ry="135" fill="${glowColor}" opacity=".24" filter="url(#${p}soft)"/>${body}<rect width="400" height="420" fill="url(#${p}vin)"/></svg>`;
  }

  const scenes = {
    upgrade(p) {
      let rays = '';
      for (let i = 0; i < 12; i++) rays += `<path d="M200 195 L${200 + 270 * Math.cos(i * Math.PI / 6 - .06)} ${195 + 270 * Math.sin(i * Math.PI / 6 - .06)} L${200 + 270 * Math.cos(i * Math.PI / 6 + .06)} ${195 + 270 * Math.sin(i * Math.PI / 6 + .06)} Z" fill="#ffc93c" opacity=".06"/>`;
      return base(p, `${rays}
<ellipse cx="200" cy="332" rx="98" ry="20" fill="#0a0a20" opacity=".6"/>
<path d="M104 312 h192 v18 a96 20 0 0 1 -192 0 Z" fill="url(#${p}goldD)"/><ellipse cx="200" cy="312" rx="96" ry="20" fill="url(#${p}gold)"/>
<g transform="translate(200 208)">
<path d="M-68 -16 Q0 -108 68 -16 L54 0 Q0 -80 -54 0 Z" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<path d="M-62 28 A62 62 0 0 1 62 28 L62 36 L-62 36 Z" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2"/>
<path d="M-46 36 L46 36 L40 82 L18 82 L18 46 L-18 46 L-18 82 L-40 82 Z" fill="url(#${p}goldD)" stroke="#a86e0a" stroke-width="2"/>
<rect x="-7" y="36" width="14" height="46" fill="url(#${p}gold)"/>
<rect x="-36" y="40" width="17" height="7" rx="3.5" fill="#140f2e"/><rect x="19" y="40" width="17" height="7" rx="3.5" fill="#140f2e"/>
<path d="M-48 8 A52 52 0 0 1 -8 -42" stroke="#fff" stroke-width="5" fill="none" opacity=".55" stroke-linecap="round"/>
</g>
<path d="M158 362 L200 338 L242 362 L242 376 L200 352 L158 376 Z" fill="url(#${p}gold)" filter="url(#${p}glow)"/>
<path d="M170 390 L200 372 L230 390 L230 402 L200 384 L170 402 Z" fill="url(#${p}gold)" opacity=".8"/>
${coin(76, 116, 19, p)}${coin(330, 96, 15, p)}${coin(338, 258, 17, p)}${coin(58, 262, 13, p)}
${spark(120, 170, 9, '#fff', .9)}${spark(296, 160, 12, '#ffc93c')}${spark(268, 88, 7, '#fff', .8)}${spark(96, 220, 6, '#ffc93c', .8)}`, '#ff9f1c');
    },

    storm(p) {
      return base(p, `
<ellipse cx="118" cy="82" rx="62" ry="26" fill="#1c1640"/><ellipse cx="205" cy="66" rx="84" ry="30" fill="#221a4e"/><ellipse cx="292" cy="86" rx="60" ry="24" fill="#1c1640"/>
<ellipse cx="150" cy="92" rx="50" ry="18" fill="#2a2054" opacity=".8"/><ellipse cx="255" cy="94" rx="46" ry="16" fill="#2a2054" opacity=".8"/>
<polygon points="206,92 180,152 198,152 170,218 216,142 196,142 220,92" fill="url(#${p}gold)" filter="url(#${p}glow)"/>
<polygon points="120,110 106,146 118,146 100,188 130,140 118,140 132,110" fill="#fff" opacity=".85" filter="url(#${p}glow)"/>
<ellipse cx="200" cy="322" rx="96" ry="20" fill="#120e2c"/>
<ellipse cx="200" cy="320" rx="116" ry="27" fill="none" stroke="#ff4fd8" stroke-width="3" opacity=".65" filter="url(#${p}glow)"/>
<g transform="translate(152 276) rotate(-14) scale(.62)"><polygon points="0,-110 36,-60 26,50 -26,50 -36,-60" fill="url(#${p}mag)" stroke="#fff" stroke-opacity=".4" stroke-width="2"/><line x1="0" y1="-110" x2="0" y2="50" stroke="#fff" stroke-width="2" opacity=".5"/><line x1="-36" y1="-60" x2="36" y2="-60" stroke="#fff" stroke-width="2" opacity=".5"/></g>
<g transform="translate(256 282) rotate(13) scale(.55)"><polygon points="0,-110 36,-60 26,50 -26,50 -36,-60" fill="url(#${p}vio)" stroke="#fff" stroke-opacity=".4" stroke-width="2"/><line x1="0" y1="-110" x2="0" y2="50" stroke="#fff" stroke-width="2" opacity=".5"/><line x1="-36" y1="-60" x2="36" y2="-60" stroke="#fff" stroke-width="2" opacity=".5"/></g>
<polygon points="200,138 238,192 227,306 173,306 162,192" fill="url(#${p}mag)" stroke="#ffffff" stroke-opacity=".5" stroke-width="2.5" filter="url(#${p}glow)"/>
<line x1="200" y1="138" x2="200" y2="306" stroke="#fff" stroke-width="2.5" opacity=".55"/><line x1="162" y1="192" x2="238" y2="192" stroke="#fff" stroke-width="2.5" opacity=".55"/>
<line x1="173" y1="306" x2="200" y2="192" stroke="#fff" stroke-width="1.6" opacity=".35"/><line x1="227" y1="306" x2="200" y2="192" stroke="#fff" stroke-width="1.6" opacity=".35"/>
<g transform="translate(200 316) scale(.42)"><polygon points="0,-110 36,-60 26,50 -26,50 -36,-60" fill="url(#${p}mag)" stroke="#fff" stroke-opacity=".5" stroke-width="3"/></g>
${gem(88, 190, 13, p, 'mag')}${gem(322, 168, 11, p, 'vio')}${gem(330, 288, 9, p, 'mag')}
${spark(140, 240, 8, '#fff', .9)}${spark(268, 230, 11, '#ff9dee')}${spark(200, 108, 7, '#fff')}${spark(96, 300, 6, '#ff9dee', .8)}`, '#ff4fd8');
    },

    rocket(p) {
      return base(p, `
<circle cx="330" cy="86" r="32" fill="url(#${p}blue)" opacity=".85"/><ellipse cx="330" cy="86" rx="52" ry="12" fill="none" stroke="#b5e0ff" stroke-width="3" opacity=".6" transform="rotate(-18 330 86)"/>
<circle cx="70" cy="90" r="2.5" fill="#fff"/><circle cx="110" cy="60" r="2" fill="#fff" opacity=".7"/><circle cx="300" cy="330" r="2.5" fill="#fff" opacity=".8"/><circle cx="60" cy="300" r="2" fill="#fff" opacity=".6"/><circle cx="350" cy="200" r="2" fill="#fff"/>
<g transform="translate(205 225) rotate(-38)">
<path d="M0 92 Q-30 152 0 208 Q30 152 0 92" fill="url(#${p}flame)" filter="url(#${p}glow)"/>
<path d="M0 100 Q-15 148 0 182 Q15 148 0 100" fill="#fff3c4"/>
<path d="M-40 42 L-76 96 L-40 86 Z" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<path d="M40 42 L76 96 L40 86 Z" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<path d="M0 -128 Q42 -64 42 18 L42 72 Q42 90 24 90 L-24 90 Q-42 90 -42 72 L-42 18 Q-42 -64 0 -128" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2.5"/>
<path d="M0 -128 Q20 -96 28 -60 L-28 -60 Q-20 -96 0 -128" fill="url(#${p}red)"/>
<rect x="-42" y="52" width="84" height="12" fill="url(#${p}goldD)" opacity=".9"/>
<circle cx="0" cy="-12" r="31" fill="#0d0d24" stroke="url(#${p}goldD)" stroke-width="6"/>
${cowFace(0, -10, .66, p)}
<path d="M-30 -96 Q-40 -60 -38 -20" stroke="#fff" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>
</g>
<path d="M96 330 L150 290" stroke="#8f73ff" stroke-width="4" stroke-linecap="round" opacity=".5"/><path d="M76 300 L120 268" stroke="#8f73ff" stroke-width="3" stroke-linecap="round" opacity=".35"/>
${spark(120, 140, 10, '#fff')}${spark(300, 250, 12, '#ffc93c')}${spark(250, 90, 7, '#fff', .8)}${spark(80, 220, 7, '#ffc93c', .8)}`, '#7c5cff');
    },

    cases(p) {
      return base(p, `
<ellipse cx="118" cy="240" rx="80" ry="70" fill="#3fa9ff" opacity=".2" filter="url(#${p}soft)"/>
<ellipse cx="282" cy="240" rx="80" ry="70" fill="#ff4d6b" opacity=".2" filter="url(#${p}soft)"/>
<g transform="translate(118 262)">
<polygon points="-12,-56 12,-56 30,-160 -30,-160" fill="#3fa9ff" opacity=".35" filter="url(#${p}glow)"/>
<polygon points="-62,-8 -52,-56 68,-56 62,-8" fill="url(#${p}dark)" stroke="#3fa9ff" stroke-width="2.5"/>
<rect x="-62" y="-10" width="124" height="76" rx="10" fill="url(#${p}dark)" stroke="#3fa9ff" stroke-width="2.5"/>
<rect x="-10" y="-10" width="20" height="76" fill="url(#${p}gold)"/><circle cx="0" cy="26" r="10" fill="url(#${p}goldD)" stroke="#a86e0a" stroke-width="2"/>
${gem(0, -32, 20, p, 'blue')}
</g>
<g transform="translate(282 262)">
<polygon points="-12,-56 12,-56 30,-160 -30,-160" fill="#ff4d6b" opacity=".35" filter="url(#${p}glow)"/>
<polygon points="-62,-8 -52,-56 68,-56 62,-8" fill="url(#${p}dark)" stroke="#ff4d6b" stroke-width="2.5"/>
<rect x="-62" y="-10" width="124" height="76" rx="10" fill="url(#${p}dark)" stroke="#ff4d6b" stroke-width="2.5"/>
<rect x="-10" y="-10" width="20" height="76" fill="url(#${p}gold)"/><circle cx="0" cy="26" r="10" fill="url(#${p}goldD)" stroke="#a86e0a" stroke-width="2"/>
<g transform="translate(0 -34) scale(.42)"><path d="M-62 28 A62 62 0 0 1 62 28 L62 36 L-62 36 Z" fill="url(#${p}gold)"/><path d="M-68 -16 Q0 -108 68 -16 L54 0 Q0 -80 -54 0 Z" fill="url(#${p}red)"/><path d="M-46 36 L46 36 L40 70 L-40 70 Z" fill="url(#${p}goldD)"/></g>
</g>
<polygon points="200,110 184,176 202,176 180,258 222,164 202,164 220,110" fill="url(#${p}gold)" filter="url(#${p}glow)"/>
${coin(66, 110, 15, p)}${coin(338, 104, 17, p)}${coin(200, 56, 12, p)}${chip(340, 330, 16, p, 'red')}${chip(60, 330, 14, p, 'blue')}
${spark(150, 130, 8, '#fff')}${spark(258, 128, 8, '#fff')}${spark(200, 300, 10, '#ffc93c')}`, '#9b5cff');
    },

    cow(p) {
      let city = '';
      const bs = [[16, 70, 44], [70, 96, 36], [116, 60, 50], [176, 88, 40], [226, 66, 46], [282, 96, 38], [330, 74, 52]];
      bs.forEach(([x, h, w], i) => {
        city += `<rect x="${x}" y="${150 - h}" width="${w}" height="${h}" fill="#141031"/>`;
        for (let wy = 150 - h + 8; wy < 142; wy += 14) for (let wx = x + 6; wx < x + w - 6; wx += 12)
          city += `<rect x="${wx}" y="${wy}" width="5" height="7" fill="${['#ffc93c', '#3fa9ff', '#ff4fd8'][(wx + wy + i) % 3]}" opacity=".75"/>`;
      });
      let walk = '';
      for (let i = 0; i < 5; i++) { const t = i / 4, y = 292 + t * 62, w = 34 + t * 26, x = 200 - w / 2 + (t - .5) * 10; walk += `<polygon points="${x - w / 2},${y} ${x + w / 2},${y} ${x + w / 2 + 8},${y + 16} ${x - w / 2 - 8},${y + 16}" fill="#e8e6f5" opacity="${.5 + t * .4}"/>`; }
      return base(p, `
${city}<circle cx="332" cy="52" r="21" fill="#fff3c4" opacity=".95" filter="url(#${p}glow)"/>
<polygon points="0,420 400,420 336,238 64,238" fill="#191938"/><polygon points="0,420 400,420 336,238 64,238" fill="none" stroke="#2c2c58" stroke-width="2"/>
${walk}
<g transform="translate(92 306)">
<polygon points="70,-2 168,-18 168,30 70,18" fill="#fff8d0" opacity=".3"/>
<path d="M-72 10 Q-62 -18 -22 -24 L28 -24 Q58 -20 72 4 L72 22 L-72 22 Z" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<path d="M-20 -22 L24 -22 Q44 -19 54 -4 L-26 -4 Z" fill="#141031"/>
<circle cx="-40" cy="22" r="15" fill="#0a0a18" stroke="#3c3c72" stroke-width="3"/><circle cx="-40" cy="22" r="6" fill="url(#${p}gold)"/>
<circle cx="42" cy="22" r="15" fill="#0a0a18" stroke="#3c3c72" stroke-width="3"/><circle cx="42" cy="22" r="6" fill="url(#${p}gold)"/>
<rect x="64" y="0" width="8" height="8" rx="3" fill="#fff8d0" filter="url(#${p}glow)"/>
</g>
<path d="M150 260 Q210 170 282 216" stroke="#8f73ff" stroke-width="3" stroke-dasharray="7 8" fill="none" opacity=".6"/>
<g transform="translate(262 208) rotate(-8)">
<ellipse cx="0" cy="0" rx="46" ry="29" fill="url(#${p}white)"/>
<path d="M-40 -12 a46 29 0 0 1 30 -16 q12 10 2 22 q-18 8 -32 -6 Z" fill="#23233f"/>
<path d="M18 14 q14 8 24 2 q4 12 -8 16 q-14 2 -16 -18 Z" fill="#23233f"/>
<rect x="-30" y="20" width="11" height="22" rx="5" fill="url(#${p}white)" transform="rotate(24 -24 30)"/><rect x="-6" y="24" width="11" height="20" rx="5" fill="url(#${p}white)" transform="rotate(-14 0 34)"/>
<rect x="14" y="22" width="11" height="22" rx="5" fill="url(#${p}white)" transform="rotate(18 20 32)"/><rect x="30" y="16" width="11" height="20" rx="5" fill="url(#${p}white)" transform="rotate(-24 36 26)"/>
<path d="M-46 -4 q-14 4 -12 18" stroke="#d9d6f2" stroke-width="5" fill="none" stroke-linecap="round"/>
${cowFace(40, -20, .58, p)}
</g>
<g transform="translate(318 366)"><rect x="-19" y="-16" width="38" height="32" rx="5" fill="url(#${p}mag)"/><rect x="-4" y="-16" width="8" height="32" fill="url(#${p}gold)"/><rect x="-19" y="-4" width="38" height="8" fill="url(#${p}gold)"/><circle cx="-6" cy="-18" r="6" fill="url(#${p}gold)"/><circle cx="6" cy="-18" r="6" fill="url(#${p}gold)"/></g>
<g transform="translate(52 372)"><rect x="-15" y="-13" width="30" height="26" rx="5" fill="url(#${p}blue)"/><rect x="-3" y="-13" width="6" height="26" fill="#fff" opacity=".85"/><rect x="-15" y="-3" width="30" height="6" fill="#fff" opacity=".85"/></g>
${spark(200, 150, 8, '#fff')}${spark(310, 250, 9, '#ffc93c')}${spark(140, 190, 6, '#ff9dee', .9)}`, '#3fa9ff');
    },

    flight(p) {
      return base(p, `
<circle cx="200" cy="196" r="74" fill="#ffe9a8" opacity=".9" filter="url(#${p}soft)"/>
<circle cx="200" cy="196" r="56" fill="#fff3c4" opacity=".8"/>
<ellipse cx="86" cy="306" rx="70" ry="24" fill="#ffe9d6" opacity=".9"/><ellipse cx="140" cy="322" rx="60" ry="20" fill="#ffd9c2" opacity=".85"/>
<ellipse cx="308" cy="330" rx="76" ry="24" fill="#ffe9d6" opacity=".9"/><ellipse cx="350" cy="120" rx="52" ry="18" fill="#ffd9c2" opacity=".7"/>
<ellipse cx="60" cy="120" rx="46" ry="16" fill="#ffe9d6" opacity=".6"/>
<g transform="translate(200 182) rotate(-7)">
<polygon points="-78,-4 -106,-36 -88,-38 -64,-8" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<polygon points="-12,-8 42,-8 12,-54 -26,-54" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<polygon points="-10,8 46,8 18,52 -22,52" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/>
<ellipse cx="0" cy="0" rx="86" ry="26" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2.5"/>
<path d="M-80 6 Q0 20 80 4" stroke="url(#${p}gold)" stroke-width="6" fill="none"/>
<circle cx="34" cy="-6" r="10" fill="#bfe6ff" stroke="url(#${p}goldD)" stroke-width="3"/>
<path d="M52 -18 Q70 -14 78 -4 L52 -4 Z" fill="#bfe6ff" opacity=".9"/>
<circle cx="86" cy="0" r="15" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2"/>
<ellipse cx="104" cy="0" rx="6" ry="42" fill="#fff" opacity=".55"/><circle cx="104" cy="0" r="6" fill="url(#${p}goldD)"/>
<line x1="0" y1="26" x2="0" y2="88" stroke="#c9a86a" stroke-width="2.5" stroke-dasharray="5 4"/>
<g transform="translate(0 106)"><rect x="-21" y="-17" width="42" height="36" rx="6" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/><rect x="-4" y="-17" width="8" height="36" fill="url(#${p}gold)"/><rect x="-21" y="-4" width="42" height="8" fill="url(#${p}gold)"/><circle cx="-7" cy="-20" r="6" fill="url(#${p}gold)"/><circle cx="7" cy="-20" r="6" fill="url(#${p}gold)"/></g>
</g>
${spark(110, 170, 9, '#fff')}${spark(300, 230, 11, '#ffc93c')}${spark(260, 90, 7, '#fff', .9)}${spark(80, 240, 6, '#ffc93c', .8)}`, '#ff9f1c');
    },

    mines(p) {
      let tiles = '';
      const gemsAt = { '0,1': 1, '1,3': 1, '2,0': 1, '3,2': 1, '0,3': 1, '3,0': 1 };
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
        const x = 62 + c * 70, y = 96 + r * 70;
        tiles += `<rect x="${x}" y="${y}" width="58" height="58" rx="12" fill="url(#${p}dark)" stroke="#3c3c72" stroke-width="2"/>`;
        if (gemsAt[r + ',' + c]) tiles += gem(x + 29, y + 29, 15, p, 'green');
      }
      return base(p, `${tiles}
<ellipse cx="200" cy="238" rx="86" ry="70" fill="#2fe6a7" opacity=".16" filter="url(#${p}soft)"/>
<g transform="translate(200 240)">
<circle cx="0" cy="0" r="48" fill="#0a0a18" stroke="#3c3c72" stroke-width="3"/>
<circle cx="0" cy="0" r="48" fill="none" stroke="#2fe6a7" stroke-width="2" opacity=".5"/>
<ellipse cx="-16" cy="-18" rx="16" ry="10" fill="#fff" opacity=".22" transform="rotate(-30)"/>
<rect x="-12" y="-58" width="24" height="14" rx="4" fill="url(#${p}goldD)"/>
<path d="M0 -58 Q6 -84 30 -88" stroke="#c9a86a" stroke-width="4.5" fill="none" stroke-linecap="round"/>
${spark(34, -90, 12, '#ffc93c')}${spark(46, -78, 6, '#fff')}${spark(24, -104, 5, '#ff9f1c')}
</g>
${spark(96, 80, 8, '#2fe6a7')}${spark(318, 76, 9, '#fff', .9)}${spark(330, 386, 7, '#2fe6a7', .8)}`, '#2fe6a7');
    },

    plinko(p) {
      let pegs = '';
      for (let r = 0; r < 7; r++) { const n = r + 3, y = 84 + r * 34; for (let i = 0; i < n; i++) { const x = 200 + (i - (n - 1) / 2) * 34; pegs += `<circle cx="${x}" cy="${y}" r="5" fill="url(#${p}gold)" filter="url(#${p}glow)"/>`; } }
      let slots = '';
      const cols = ['#ff4d6b', '#ff6b4d', '#ff9f1c', '#ffc93c', '#2fe6a7', '#ffc93c', '#ff9f1c', '#ff6b4d', '#ff4d6b'];
      for (let i = 0; i < 9; i++) slots += `<rect x="${52 + i * 34}" y="330" width="28" height="26" rx="6" fill="${cols[i]}" opacity=".95"/>`;
      return base(p, `
<rect x="40" y="42" width="320" height="336" rx="20" fill="none" stroke="#7c5cff" stroke-width="2.5" opacity=".55"/>
${pegs}
<polyline points="200,58 184,118 214,152 190,186 222,220 204,254 232,288" stroke="#ffc93c" stroke-width="3" stroke-dasharray="2 9" fill="none" opacity=".7" stroke-linecap="round"/>
<circle cx="232" cy="288" r="11" fill="url(#${p}gold)" filter="url(#${p}glow)"/><circle cx="228" cy="284" r="3.5" fill="#fff" opacity=".9"/>
${slots}
${spark(80, 70, 8, '#fff')}${spark(330, 100, 9, '#ff9dee')}${spark(70, 250, 6, '#ffc93c', .8)}`, '#9b5cff');
    },

    roulette(p) {
      let segs = '';
      for (let i = 0; i < 12; i++) {
        const a0 = -Math.PI / 2 + i * Math.PI / 6, a1 = a0 + Math.PI / 6;
        segs += `<path d="${wedge(200, 212, 106, a0, a1)}" fill="${i === 0 ? '#0f8f68' : i % 2 ? '#16122e' : '#c22445'}" stroke="#ffc93c" stroke-width="1.6"/>`;
      }
      let bulbs = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; bulbs += `<circle cx="${200 + 121 * Math.cos(a)}" cy="${212 + 121 * Math.sin(a)}" r="4" fill="${i % 2 ? '#fff3c4' : '#ffc93c'}" filter="url(#${p}glow)"/>`; }
      return base(p, `
<ellipse cx="200" cy="330" rx="170" ry="52" fill="#0f5c40" opacity=".45"/>
<circle cx="200" cy="212" r="128" fill="url(#${p}goldD)" stroke="#a86e0a" stroke-width="3"/>
${segs}
<circle cx="200" cy="212" r="60" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="3"/>
<circle cx="200" cy="212" r="34" fill="url(#${p}goldD)"/>${spark(200, 212, 16, '#fff3c4')}
<circle cx="${200 + 92 * Math.cos(-.7)}" cy="${212 + 92 * Math.sin(-.7)}" r="8" fill="#fff" filter="url(#${p}glow)"/>
${bulbs}
${chip(76, 330, 20, p, 'red')}${chip(330, 322, 22, p, 'vio')}${chip(344, 96, 15, p, 'blue')}
${spark(90, 120, 9, '#fff')}${spark(316, 160, 8, '#ffc93c')}`, '#2fe6a7');
    },

    slots(p) {
      let bulbs = '';
      for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; bulbs += `<circle cx="${200 + 118 * Math.cos(a)}" cy="${118 + 66 * Math.sin(a)}" r="5" fill="${i % 2 ? '#ff4fd8' : '#ffc93c'}" filter="url(#${p}glow)"/>`; }
      const reels = [0, 1, 2].map(i => `<rect x="${100 + i * 70}" y="150" width="62" height="94" rx="10" fill="url(#${p}white)"/><text x="${131 + i * 70}" y="216" text-anchor="middle" font-size="52" font-weight="900" font-family="${FD}" fill="${i === 1 ? '#c22445' : '#d98f12'}">7</text>`).join('');
      return base(p, `
<path d="M82 118 A118 66 0 0 1 318 118 L318 130 L82 130 Z" fill="url(#${p}vio)" stroke="#ffc93c" stroke-width="3"/>
${bulbs}
<rect x="70" y="118" width="260" height="240" rx="24" fill="url(#${p}vio)" stroke="#ffc93c" stroke-width="3"/>
<rect x="92" y="140" width="216" height="112" rx="14" fill="#0d0d24" stroke="url(#${p}goldD)" stroke-width="3"/>
${reels}
<line x1="96" y1="197" x2="304" y2="197" stroke="#ff4fd8" stroke-width="2.5" stroke-dasharray="8 6" filter="url(#${p}glow)"/>
<rect x="96" y="272" width="208" height="18" rx="9" fill="#0d0d24" opacity=".7"/><text x="200" y="285" text-anchor="middle" font-size="11" font-weight="800" fill="#ffc93c" font-family="${F}" letter-spacing="2">JACKPOT</text>
<rect x="90" y="352" width="220" height="14" rx="7" fill="url(#${p}goldD)"/>
<line x1="332" y1="170" x2="360" y2="116" stroke="#8a8aa8" stroke-width="7" stroke-linecap="round"/><circle cx="362" cy="110" r="14" fill="url(#${p}red)" filter="url(#${p}glow)"/>
${coin(104, 392, 17, p)}${coin(200, 402, 20, p)}${coin(296, 390, 15, p)}
${spark(60, 200, 8, '#fff')}${spark(350, 260, 9, '#ff9dee')}`, '#ff4fd8');
    },

    blackjack(p) {
      return base(p, `
<polygon points="200,0 54,420 346,420" fill="#fff" opacity=".05"/>
<ellipse cx="200" cy="336" rx="172" ry="56" fill="#0f5c40" opacity=".5"/>
<g transform="translate(162 206) rotate(-12)">
<rect x="-47" y="-67" width="94" height="134" rx="12" fill="url(#${p}white)" stroke="#c9c6e0" stroke-width="2"/>
<text x="-34" y="-36" font-size="27" font-weight="900" fill="#1a1a2e" font-family="${F}">A</text>${spade(-27, -18, 9, '#1a1a2e')}${spade(0, 8, 26, '#1a1a2e')}
</g>
<g transform="translate(248 214) rotate(10)">
<rect x="-47" y="-67" width="94" height="134" rx="12" fill="url(#${p}white)" stroke="#c9c6e0" stroke-width="2"/>
<text x="-34" y="-36" font-size="27" font-weight="900" fill="#d6294e" font-family="${F}">K</text>${heart(-27, -18, 9, '#d6294e')}${heart(0, 8, 26, '#d6294e')}
</g>
<g transform="translate(322 328)">
<ellipse cx="0" cy="0" rx="27" ry="10" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/><ellipse cx="0" cy="-9" rx="27" ry="10" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2"/><ellipse cx="0" cy="-18" rx="27" ry="10" fill="url(#${p}red)" stroke="#7d1030" stroke-width="2"/><ellipse cx="0" cy="-27" rx="27" ry="10" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2"/><ellipse cx="0" cy="-27" rx="16" ry="5.5" fill="none" stroke="#a86e0a" stroke-width="2" stroke-dasharray="4 3"/>
</g>
${chip(72, 330, 17, p, 'vio')}
${spark(100, 130, 9, '#fff')}${spark(316, 140, 10, '#ffc93c')}${spark(200, 90, 6, '#fff', .8)}`, '#2fe6a7');
    },

    dice(p) {
      const pip = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="#1a1a2e"/>`;
      return base(p, `
<path d="M84 150 Q140 90 210 96" stroke="#ffc93c" stroke-width="3" stroke-dasharray="3 10" fill="none" opacity=".7" stroke-linecap="round"/>
<path d="M310 300 Q330 240 300 190" stroke="#ff4fd8" stroke-width="3" stroke-dasharray="3 10" fill="none" opacity=".6" stroke-linecap="round"/>
<g transform="translate(158 204) rotate(-14)">
<rect x="-54" y="-54" width="108" height="108" rx="24" fill="url(#${p}white)" stroke="#c9c6e0" stroke-width="2.5"/>
<path d="M-54 -30 a24 24 0 0 1 24 -24 h60 a24 24 0 0 1 24 24 v10 h-108 Z" fill="#fff" opacity=".5"/>
${pip(-27, -27)}${pip(27, -27)}${pip(0, 0)}${pip(-27, 27)}${pip(27, 27)}
</g>
<g transform="translate(272 276) rotate(13) scale(.82)">
<rect x="-54" y="-54" width="108" height="108" rx="24" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2.5"/>
${pip(-26, -26)}${pip(26, 26)}
</g>
${spark(96, 300, 10, '#ffc93c')}${spark(320, 130, 11, '#fff')}${spark(220, 330, 7, '#ff9dee')}${spark(140, 110, 6, '#fff', .8)}`, '#7c5cff');
    },

    wheel(p) {
      const cols = ['vio', 'mag', 'gold', 'blue', 'vio', 'mag', 'gold', 'blue'];
      let segs = '';
      for (let i = 0; i < 8; i++) segs += `<path d="${wedge(200, 224, 112, -Math.PI / 2 + i * Math.PI / 4, -Math.PI / 2 + (i + 1) * Math.PI / 4)}" fill="url(#${p}${cols[i]})" stroke="#0d0d24" stroke-width="2.5"/>`;
      let bulbs = '';
      for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; bulbs += `<circle cx="${200 + 119 * Math.cos(a)}" cy="${224 + 119 * Math.sin(a)}" r="4.5" fill="${i % 2 ? '#fff3c4' : '#ffc93c'}" filter="url(#${p}glow)"/>`; }
      let conf = '';
      const cc = ['#ffc93c', '#ff4fd8', '#3fa9ff', '#2fe6a7', '#ff4d6b'];
      [[70, 90], [330, 80], [60, 250], [342, 260], [110, 340], [300, 350], [200, 40]].forEach(([x, y], i) => { conf += `<rect x="${x}" y="${y}" width="9" height="14" rx="2" fill="${cc[i % 5]}" transform="rotate(${i * 37} ${x} ${y})" opacity=".9"/>`; });
      return base(p, `
${conf}
<rect x="186" y="336" width="28" height="46" fill="url(#${p}dark)"/><ellipse cx="200" cy="386" rx="52" ry="12" fill="url(#${p}dark)"/>
<circle cx="200" cy="224" r="124" fill="none" stroke="url(#${p}goldD)" stroke-width="9"/>
${segs}${bulbs}
<circle cx="200" cy="224" r="27" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="3"/>${spark(200, 224, 13, '#fff3c4')}
<polygon points="200,62 176,102 224,102" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2.5" filter="url(#${p}glow)"/>
${spark(90, 170, 8, '#fff')}${spark(318, 180, 9, '#fff', .9)}`, '#ff9f1c');
    },

    coin(p) {
      return base(p, `
<path d="M74 150 A152 152 0 0 1 196 58" stroke="#ffc93c" stroke-width="3.5" stroke-dasharray="4 10" fill="none" opacity=".8" stroke-linecap="round"/>
<polygon points="196,58 176,52 184,74" fill="#ffc93c"/>
<path d="M326 274 A152 152 0 0 1 204 366" stroke="#ff4fd8" stroke-width="3.5" stroke-dasharray="4 10" fill="none" opacity=".7" stroke-linecap="round"/>
<polygon points="204,366 224,372 216,350" fill="#ff4fd8"/>
<circle cx="200" cy="212" r="106" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="4" filter="url(#${p}glow)"/>
<circle cx="200" cy="212" r="97" fill="none" stroke="#a86e0a" stroke-width="3" stroke-dasharray="4 5" opacity=".8"/>
<circle cx="200" cy="212" r="78" fill="none" stroke="#a86e0a" stroke-width="3" opacity=".7"/>
<text x="200" y="252" text-anchor="middle" font-size="104" font-weight="900" fill="#b8791a" font-family="${F}">₽</text>
<text x="197" y="248" text-anchor="middle" font-size="104" font-weight="900" fill="#fff0bd" opacity=".85" font-family="${F}">₽</text>
<path d="M130 150 A96 96 0 0 1 190 118" stroke="#fff" stroke-width="7" fill="none" opacity=".6" stroke-linecap="round"/>
${coin(88, 330, 24, p)}${coin(322, 322, 20, p)}${coin(332, 108, 15, p)}
${spark(110, 110, 10, '#fff')}${spark(300, 160, 12, '#fff')}${spark(250, 340, 7, '#ffc93c')}`, '#ffc93c');
    },

    hilo(p) {
      return base(p, `
<g transform="translate(136 244) rotate(-10)">
<rect x="-47" y="-67" width="94" height="134" rx="12" fill="url(#${p}white)" stroke="#c9c6e0" stroke-width="2"/>
<text x="-34" y="-36" font-size="27" font-weight="900" fill="#1a1a2e" font-family="${F}">3</text>${club(-27, -18, 9, '#1a1a2e')}${club(0, 8, 24, '#1a1a2e')}
</g>
<g transform="translate(272 196) rotate(9)">
<rect x="-47" y="-67" width="94" height="134" rx="12" fill="url(#${p}white)" stroke="#c9c6e0" stroke-width="2"/>
<text x="-34" y="-36" font-size="27" font-weight="900" fill="#1a1a2e" font-family="${F}">A</text>${spade(-27, -18, 9, '#1a1a2e')}${spade(0, 8, 26, '#1a1a2e')}
</g>
<polygon points="202,96 226,128 210,128 210,158 194,158 194,128 178,128" fill="url(#${p}green)" filter="url(#${p}glow)"/>
<polygon points="202,336 178,304 194,304 194,274 210,274 210,304 226,304" fill="url(#${p}red)" filter="url(#${p}glow)"/>
${chip(76, 330, 16, p, 'gold')}${chip(330, 330, 18, p, 'mag')}
${spark(90, 140, 9, '#fff')}${spark(320, 120, 10, '#ffc93c')}${spark(200, 210, 6, '#fff', .9)}`, '#3fa9ff');
    }
  };

  function card(key) {
    const p = 'a' + (++uid) + '-';
    return (scenes[key] || scenes.coin)(p);
  }

  function hero() {
    const p = 'h' + (++uid) + '-';
    let pile = '';
    const rows = [[830, 452, 150, 34], [880, 428, 190, 38], [930, 402, 150, 32], [860, 380, 110, 26]];
    rows.forEach(([x, y, rx, ry]) => { pile += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="url(#${p}goldD)"/>`; });
    for (let i = 0; i < 14; i++) { const x = 740 + (i * 53) % 320, y = 360 + (i * 37) % 100; pile += coin(x, y, 15 + (i % 3) * 5, p); }
    let chain = '';
    for (let i = 0; i <= 10; i++) { const t = i / 10, x = -58 + 116 * t, y = -44 + 34 * Math.sin(Math.PI * t); chain += `<circle cx="${x}" cy="${y}" r="7" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="1.6"/>`; }
    return `<svg viewBox="0 0 1200 500" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">${defs(p)}
<rect width="1200" height="500" fill="url(#${p}bg)"/><rect width="1200" height="500" fill="url(#${p}dots)"/>
<polygon points="700,0 860,0 1020,500 760,500" fill="#fff" opacity=".045"/>
<polygon points="980,0 1080,0 1200,380 1200,500 1100,500" fill="#ff4fd8" opacity=".06"/>
<ellipse cx="900" cy="260" rx="300" ry="220" fill="#7c5cff" opacity=".28" filter="url(#${p}soft)"/>
${pile}
<g transform="translate(905 268)">
<path d="M-96 60 q-30 10 -26 40 q20 6 34 -10" fill="url(#${p}white)"/>
<ellipse cx="0" cy="52" rx="98" ry="82" fill="url(#${p}white)"/>
<path d="M-90 20 a98 82 0 0 1 52 -52 q26 20 6 48 q-34 18 -58 4 Z" fill="#23233f"/>
<path d="M40 96 q30 16 52 4 q8 26 -18 34 q-30 4 -34 -38 Z" fill="#23233f"/>
<rect x="-58" y="112" width="30" height="46" rx="13" fill="url(#${p}white)"/><rect x="26" y="112" width="30" height="46" rx="13" fill="url(#${p}white)"/>
<ellipse cx="-43" cy="158" rx="17" ry="8" fill="#23233f"/><ellipse cx="41" cy="158" rx="17" ry="8" fill="#23233f"/>
<g transform="translate(0 -78)">
<ellipse cx="-62" cy="-24" rx="24" ry="14" fill="url(#${p}white)" transform="rotate(-30 -62 -24)"/><ellipse cx="62" cy="-24" rx="24" ry="14" fill="url(#${p}white)" transform="rotate(30 62 -24)"/>
<ellipse cx="-62" cy="-24" rx="13" ry="7" fill="#ffb3c8" transform="rotate(-30 -62 -24)"/><ellipse cx="62" cy="-24" rx="13" ry="7" fill="#ffb3c8" transform="rotate(30 62 -24)"/>
<path d="M-40 -52 q-10 -26 10 -32 q5 18 8 28 Z" fill="url(#${p}gold)"/><path d="M40 -52 q10 -26 -10 -32 q-5 18 -8 28 Z" fill="url(#${p}gold)"/>
<circle cx="0" cy="0" r="66" fill="url(#${p}white)"/>
<path d="M-66 -8 a66 66 0 0 1 40 -56 q22 20 4 44 q-26 16 -44 12 Z" fill="#23233f"/>
<rect x="-52" y="-22" width="44" height="30" rx="11" fill="#14142e" stroke="#ffc93c" stroke-width="3.5"/>
<rect x="8" y="-22" width="44" height="30" rx="11" fill="#14142e" stroke="#ffc93c" stroke-width="3.5"/>
<line x1="-8" y1="-12" x2="8" y2="-12" stroke="#ffc93c" stroke-width="4"/>
<path d="M-44 -16 l14 10 M-36 -18 l14 10 M16 -16 l14 10 M24 -18 l14 10" stroke="#fff" stroke-width="2.5" opacity=".45"/>
<ellipse cx="0" cy="30" rx="36" ry="23" fill="#ffc9d6"/><ellipse cx="-13" cy="28" rx="5.5" ry="8" fill="#d67a95"/><ellipse cx="13" cy="28" rx="5.5" ry="8" fill="#d67a95"/>
<path d="M-13 44 q13 9 26 0" stroke="#d67a95" stroke-width="3.5" fill="none" stroke-linecap="round"/>
</g>
${chain}
<circle cx="0" cy="-2" r="17" fill="url(#${p}gold)" stroke="#a86e0a" stroke-width="2.5"/><text x="0" y="6" text-anchor="middle" font-size="20" font-weight="900" fill="#a86e0a" font-family="${F}">₽</text>
</g>
${gem(640, 130, 26, p, 'mag')}${gem(1090, 120, 20, p, 'blue')}${gem(600, 330, 16, p, 'green')}
<g transform="translate(1075 220) rotate(14)"><rect x="-26" y="-26" width="52" height="52" rx="12" fill="url(#${p}white)"/><circle cx="-12" cy="-12" r="5.5" fill="#1a1a2e"/><circle cx="12" cy="12" r="5.5" fill="#1a1a2e"/><circle cx="12" cy="-12" r="5.5" fill="#1a1a2e"/><circle cx="-12" cy="12" r="5.5" fill="#1a1a2e"/></g>
${chip(660, 240, 22, p, 'red')}${chip(1120, 330, 24, p, 'vio')}
${spark(560, 90, 12, '#ffc93c')}${spark(720, 60, 9, '#fff')}${spark(1130, 70, 11, '#ff9dee')}${spark(520, 250, 8, '#fff', .8)}${spark(1060, 400, 9, '#ffc93c')}
<rect width="1200" height="500" fill="url(#${p}vin)"/></svg>`;
  }

  return { card, hero };
})();