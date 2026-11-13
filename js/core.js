'use strict';
/* LootUP platform core: state, economy, payments, bonuses, profile, live feed. */
const RU = { GAMES: [], pages: {} };
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const h = html => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => (Math.round(n * 100) / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  const money = n => fmt(n) + ' ₽';
  const multFmt = x => '×' + (x >= 100 ? Math.round(x) : x.toFixed(2));
  const today = () => new Date().toISOString().slice(0, 10);
  const yesterday = () => new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const hex = n => { let s = ''; const c = '0123456789abcdef'; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * 16)]; return s; };

  /* ---------- state ---------- */
  const KEY = 'lootup_v1';
  const defState = () => ({
    balance: 1000, xp: 0, name: 'Игрок' + Math.floor(1000 + Math.random() * 9000), avatar: '🐮',
    stats: { bets: 0, wins: 0, wagered: 0, won: 0, best: 0, cases: 0 },
    inventory: [], tx: [], favs: [],
    settings: { sound: true, fast: false },
    fair: { server: hex(32), client: 'moo-' + hex(8), nonce: 0 },
    bonus: { dailyDay: 0, dailyLast: '', wheelLast: '', cashLast: '', faucetLast: 0, promos: [], lossPool: 0 },
    quests: { date: today(), bets: 0, wins: 0, cases: 0, wagered: 0, claimed: [] },
    jackpot: 12500 + Math.random() * 2000,
    created: Date.now()
  });
  function merge(def, obj) { for (const k in def) { if (obj[k] === undefined) obj[k] = def[k]; else if (def[k] && typeof def[k] === 'object' && !Array.isArray(def[k])) merge(def[k], obj[k]); } return obj; }
  let S;
  try { S = merge(defState(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { S = defState(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  /* ---------- provably-fair RNG ---------- */
  function xmur3(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; }; }
  function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let lastRoll = null;
  function floats(n) {
    const nonce = S.fair.nonce++;
    const seed = xmur3(S.fair.server + ':' + S.fair.client + ':' + nonce)();
    const rnd = mulberry32(seed);
    const out = []; for (let i = 0; i < n; i++) out.push(rnd());
    lastRoll = { nonce, out }; save(); return out;
  }
  const float = () => floats(1)[0];

  /* ---------- audio ---------- */
  let AC = null, master = null;
  function ac() { if (!AC) { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = .5; master.connect(AC.destination); } if (AC.state === 'suspended') AC.resume(); return AC; }
  function tone(f, d, type = 'sine', g = .2, when = 0, slide = 0) {
    if (!S.settings.sound) return;
    try {
      const ctx = ac(), o = ctx.createOscillator(), gn = ctx.createGain(), t0 = ctx.currentTime + when;
      o.type = type; o.frequency.setValueAtTime(f, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + d);
      gn.gain.setValueAtTime(0, t0); gn.gain.linearRampToValueAtTime(g, t0 + .012); gn.gain.exponentialRampToValueAtTime(.001, t0 + d);
      o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0 + d + .05);
    } catch (e) {}
  }
  function noise(d = .2, g = .25, fc = 1200, when = 0) {
    if (!S.settings.sound) return;
    try {
      const ctx = ac(), len = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(); src.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = fc;
      const gn = ctx.createGain(); gn.gain.value = g;
      src.connect(f); f.connect(gn); gn.connect(master); src.start(ctx.currentTime + when);
    } catch (e) {}
  }
  const sfx = {
    click: () => tone(750, .05, 'square', .07),
    bet: () => { tone(320, .08, 'triangle', .16); tone(480, .08, 'triangle', .12, .05); },
    win: () => [523, 659, 784].forEach((f, i) => tone(f, .14, 'triangle', .18, i * .07)),
    big: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, .2, 'triangle', .2, i * .08)); noise(.4, .1, 4000, .1); },
    lose: () => tone(220, .3, 'sawtooth', .12, 0, -140),
    tick: () => tone(1200, .025, 'sine', .06),
    cash: () => { tone(880, .1, 'triangle', .18); tone(1320, .14, 'triangle', .16, .07); },
    card: () => noise(.05, .13, 3000),
    boom: () => { noise(.45, .35, 300); tone(90, .4, 'sine', .28, 0, -40); },
    coin: () => { tone(1568, .09, 'triangle', .14); tone(2093, .12, 'triangle', .12, .06); },
    spin: () => noise(.12, .07, 2000),
    hop: () => tone(500, .07, 'square', .09, 0, 200)
  };

  /* ---------- toast / modal / confetti ---------- */
  function toast(msg, type = 'info', ms = 3400) {
    const t = h(`<div class="toast ${type}">${msg}</div>`);
    $('#toasts').appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, ms);
  }
  let modalEl = null;
  function modal(html, wide) {
    closeModal();
    const back = h(`<div class="mback"><div class="modal ${wide ? 'wide' : ''}">${html}</div></div>`);
    back.addEventListener('mousedown', e => { if (e.target === back) closeModal(); });
    $('#modalRoot').appendChild(back); modalEl = back; return back;
  }
  function closeModal() { if (modalEl) { modalEl.remove(); modalEl = null; } }

  const cvs = $('#confetti'), cx = cvs.getContext('2d');
  let parts = [], confRAF = 0;
  function confetti(n = 130) {
    const cols = ['#ffc93c', '#ff4fd8', '#7c5cff', '#2fe6a7', '#3fa9ff', '#ff4d6b'];
    cvs.width = innerWidth; cvs.height = innerHeight;
    for (let i = 0; i < n; i++) parts.push({ x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .45, y: innerHeight * .35, vx: (Math.random() - .5) * 11, vy: -Math.random() * 11 - 3, g: .32, s: Math.random() * 7 + 4, c: cols[i % 6], r: Math.random() * Math.PI, vr: (Math.random() - .5) * .3, l: 1 });
    if (!confRAF) confLoop();
  }
  function confLoop() {
    confRAF = requestAnimationFrame(confLoop);
    cx.clearRect(0, 0, cvs.width, cvs.height);
    parts = parts.filter(p => p.l > 0 && p.y < cvs.height + 40);
    if (!parts.length) { cancelAnimationFrame(confRAF); confRAF = 0; return; }
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr; p.l -= .008;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.globalAlpha = Math.max(0, p.l); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .62); cx.restore();
    }
  }

  /* ---------- economy ---------- */
  function updateBalance() { $('#balVal').textContent = fmt(S.balance); }
  function addFunds(amount, type, note) {
    S.balance = Math.round((S.balance + amount) * 100) / 100;
    S.tx.unshift({ ts: Date.now(), type, amount, note }); S.tx = S.tx.slice(0, 80);
    save(); updateBalance();
  }
  const RANKS = ['Телёнок', 'Бычок', 'Подросток', 'Бык', 'Бугай', 'Минотавр', 'Золотой бык', 'Платиновый бык', 'Алмазный бык', 'Легенда фермы'];
  const level = () => Math.floor(Math.sqrt(S.xp / 100)) + 1;
  const rank = () => RANKS[Math.min(level() - 1, RANKS.length - 1)];
  function gainXP(n) {
    const before = level(); S.xp += n; const after = level();
    if (after > before) {
      const reward = 50 * after;
      addFunds(reward, 'bonus', 'Новый ранг: ' + rank());
      toast(`🏆 Новый ранг: <b>${rank()}</b>! Бонус ${money(reward)}`, 'gold', 5000);
      confetti(90); sfx.big();
    }
  }
  function ensureQuestDate() { if (S.quests.date !== today()) S.quests = { date: today(), bets: 0, wins: 0, cases: 0, wagered: 0, claimed: [] }; }
  function questProg(key, n = 1) { ensureQuestDate(); S.quests[key] += n; }
  function bet(amount) {
    amount = Math.round(amount * 100) / 100;
    if (!(amount > 0)) { toast('Введи ставку', 'error'); return false; }
    if (amount < 1) { toast('Минимальная ставка — 1 ₽', 'error'); return false; }
    if (amount > S.balance) { toast('Недостаточно средств — пополни баланс или забери бонус', 'error'); return false; }
    S.balance = Math.round((S.balance - amount) * 100) / 100;
    S.stats.bets++; S.stats.wagered += amount; S.jackpot += amount * .005;
    questProg('bets'); questProg('wager', amount); gainXP(amount / 10);
    save(); updateBalance(); sfx.bet();
    return true;
  }
  function gameName(id) { const g = RU.GAMES.find(x => x.id === id); return g ? g.name : id; }
  function payout(gameId, betAmt, mult, opts = {}) {
    const win = Math.round(betAmt * mult * 100) / 100;
    if (opts.push) { S.balance = Math.round((S.balance + win) * 100) / 100; save(); updateBalance(); sfx.click(); return win; }
    if (win > 0) {
      S.balance = Math.round((S.balance + win) * 100) / 100;
      S.stats.wins++; S.stats.won += win; S.stats.best = Math.max(S.stats.best, win);
      questProg('wins');
      if (win >= 300) pushLive({ name: S.name, ava: S.avatar, game: gameName(gameId), gameId, amount: win });
      if (!opts.silent) { if (mult >= 5 || win >= 1000) { sfx.big(); confetti(Math.min(220, 80 + mult * 8)); } else sfx.win(); }
      if (mult >= 2 && float() < .0006) {
        const j = Math.floor(S.jackpot); S.jackpot = 10000;
        addFunds(j, 'jackpot', 'ДЖЕКПОТ');
        toast(`🏆 ДЖЕКПОТ! +${money(j)}`, 'gold', 7000); confetti(240); sfx.big();
      }
    } else {
      S.bonus.lossPool += betAmt;
      if (!opts.silent) sfx.lose();
    }
    save(); updateBalance();
    return win;
  }
  function caseOpened() { S.stats.cases++; questProg('cases'); save(); }

  /* ---------- live feed / online / jackpot ---------- */
  const NAMES = ['БыкФёдор', 'milkman', 'Корован', 'xX_Фарм_Xx', 'Телятина', 'ЛунаMoo', 'Джекпотыч', 'НочнойДойщик', 'СырныйБарон', 'Пастух2007', 'MooMaster', 'КопытоУдачи', 'ФармлюКакБог', 'СеноЕд', 'Бурёнка2000', 'Тракторист', 'МолочныйПуть', 'РогаИКопыта', 'Сливочник', 'БычокТим'];
  const AVAS = ['🐮', '', '', '🐸', '🦄', '', '', '🐺', '🐱', '', '', '⭐', '', '💎', '🎯', '', '🎲', '🎰', '', '🃏'];
  function avaBg(name) { let hh = 0; for (const c of name) hh = (hh * 31 + c.charCodeAt(0)) >>> 0; const hues = [262, 318, 42, 200, 152, 350]; return `linear-gradient(135deg,hsl(${hues[hh % 6]} 80% 55%),hsl(${(hues[hh % 6] + 40) % 360} 80% 40%))`; }
  function pushLive(item) {
    const feed = $('#liveFeed');
    const el = h(`<div class="lv-item"><div class="lv-ava" style="background:${avaBg(item.name)}">${item.ava}</div><div><div class="lv-name">${esc(item.name)}</div><div class="lv-game">${esc(item.game)}</div></div><div class="lv-amt">+${fmt(item.amount)} ₽</div></div>`);
    el.onclick = () => { const g = RU.GAMES.find(x => x.name === item.game); if (g) openGame(g.id); };
    feed.prepend(el);
    while (feed.children.length > 14) feed.lastChild.remove();
  }
  function simLive() {
    const g = RU.GAMES[Math.floor(Math.random() * RU.GAMES.length)]; if (!g) return;
    pushLive({ name: NAMES[Math.floor(Math.random() * NAMES.length)], ava: AVAS[Math.floor(Math.random() * AVAS.length)], game: g.name, amount: Math.round(Math.exp(Math.random() * 4.2 + 3.2)) });
  }
  let online = 1247;
  function tickOnline() {
    online = Math.max(900, online + Math.floor((Math.random() - .48) * 40));
    $('#onlineVal').textContent = fmt(online);
    $$('[data-players]').forEach(el => { const base = +el.dataset.players; el.textContent = Math.max(3, Math.round(base * (.85 + Math.random() * .3))) + ' играют'; });
  }

  /* ---------- navigation ---------- */
  const NAV = [{ id: 'home', ic: '🎮', label: 'Игры' }, { id: 'cases', ic: '📦', label: 'Кейсы' }, { id: 'earn', ic: '💰', label: 'Заработок' }, { id: 'bonus', ic: '🎁', label: 'Бонусы' }, { id: 'friends', ic: '🤝', label: 'Друзья' }, { id: 'profile', ic: '👤', label: 'Профиль' }];
  let pageIv = [];
  const pageTimer = (ms, fn) => { const id = setInterval(fn, ms); pageIv.push(id); return id; };
  function nav(id) {
    pageIv.forEach(clearInterval); pageIv = [];
    RU.page = id;
    $$('.tab,.snav').forEach(b => b.classList.toggle('active', b.dataset.nav === id));
    const fn = RU.pages[id] || RU.pages.home;
    const root = $('#page'); root.innerHTML = ''; fn(root);
    window.scrollTo(0, 0);
  }

  /* ---------- home page ---------- */
  const CATS = [{ id: 'all', label: 'Все' }, { id: 'fav', label: '⭐ Избранное' }, { id: 'hot', label: '🔥 Популярные' }, { id: 'fast', label: '⚡ Быстрые' }, { id: 'cards', label: '🃏 Карточные' }, { id: 'pvp', label: '⚔️ PvP' }];
  RU.pages.home = function (root) {
    root.innerHTML = `
<div class="hero"><div class="hero-art">${ART.hero()}</div><div class="hero-in">
<span class="badge-bonus">🎁 Стартовый бонус • 1 000 ₽</span>
<h1>Твой лут.<br><b>16 режимов</b> — один баланс.</h1>
<p>Краш, кейсы, мины, рулетка и PvP-баттлы. Стартовые 1 000 ₽ уже на балансе.</p>
<button class="btn gold" id="heroCta">🎁 Забрать бонусы</button>
</div></div>
<div class="jackstrip"><div><div class="jack-label">🏆 Общий джекпот</div><div class="tiny muted">шанс сорвать на любой победе ×2+</div></div><div class="jack-val" id="jackVal">${money(Math.floor(S.jackpot))}</div></div>
<div class="searchbar"><input class="inp" id="gSearch" placeholder="🔍 Найти игру…"><select class="inp" id="gSort" style="max-width:170px"><option value="pop">Популярные</option><option value="az">По алфавиту</option><option value="new">Новые</option></select></div>
<div class="chiprow scroll mt12" id="gCats">${CATS.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
<div class="games-grid" id="gGrid"></div>`;
    let cat = 'all', q = '', sort = 'pop';
    const grid = root.querySelector('#gGrid');
    function renderGrid() {
      let list = [...RU.GAMES];
      if (cat === 'fav') list = list.filter(g => S.favs.includes(g.id));
      else if (cat === 'hot') list = list.filter(g => g.cat.includes('hot'));
      else if (cat !== 'all') list = list.filter(g => g.cat.includes(cat));
      if (q) list = list.filter(g => g.name.toLowerCase().includes(q));
      if (sort === 'pop') list.sort((a, b) => b.players - a.players);
      if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      if (sort === 'new') list.sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
      grid.innerHTML = list.length ? list.map(g => `
<button class="gcard" data-game="${g.id}">
<div class="gart-svg">${ART.card(g.art)}</div>
<span class="gcard-players"><span class="dot"></span><span data-players="${g.players}">${g.players} играют</span></span>
${g.tag ? `<span class="gcard-tag ${g.tag === 'HOT' ? 'hot' : g.tag === 'NEW' ? 'new' : ''}">${g.tag}</span>` : ''}
<span class="gcard-name">${g.icon} ${g.name}</span>
<span class="gcard-fav ${S.favs.includes(g.id) ? 'on' : ''}" data-fav="${g.id}">⭐</span>
</button>`).join('') : `<div class="empty" style="grid-column:1/-1"><span class="e-ic">🐮</span>Ничего не нашлось. Попробуй другой запрос.</div>`;
    }
    grid.addEventListener('click', e => {
      const fav = e.target.closest('[data-fav]');
      if (fav) {
        e.stopPropagation();
        const id = fav.dataset.fav;
        S.favs = S.favs.includes(id) ? S.favs.filter(x => x !== id) : [...S.favs, id];
        save(); fav.classList.toggle('on'); sfx.click();
        if (cat === 'fav') renderGrid();
        return;
      }
      const card = e.target.closest('[data-game]');
      if (card) openGame(card.dataset.game);
    });
    root.querySelector('#gSearch').addEventListener('input', e => { q = e.target.value.trim().toLowerCase(); renderGrid(); });
    root.querySelector('#gSort').addEventListener('change', e => { sort = e.target.value; renderGrid(); });
    root.querySelector('#gCats').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      cat = b.dataset.cat; sfx.click();
      root.querySelectorAll('#gCats .chip').forEach(c => c.classList.toggle('active', c === b));
      renderGrid();
    });
    root.querySelector('#heroCta').onclick = () => nav('bonus');
    renderGrid();
  };

  /* ---------- earn page ---------- */
  const QUESTS = [
    { id: 'bets', ic: '🎯', name: 'Сделай 10 ставок', need: 10, reward: 100 },
    { id: 'wins', ic: '🏆', name: 'Выиграй 3 раза', need: 3, reward: 150 },
    { id: 'cases', ic: '📦', name: 'Открой 1 кейс', need: 1, reward: 100 },
    { id: 'wager', ic: '💸', name: 'Поставь 1 000 ₽', need: 1000, reward: 200 }
  ];
  const PROMOS = { LOOTUP: 500, MOO: 250, COW: 100, START: 1000 };
  const FAUCET_CD = 5 * 60 * 1000;
  RU.pages.earn = function (root) {
    ensureQuestDate();
    root.innerHTML = `
<div class="sec-title">💰 Заработок</div>
<div class="panel"><div class="row between wrap"><div><h3>🚰 Кран удачи</h3><div class="small muted">Бесплатные 50 ₽ каждые 5 минут. Без условий.</div></div><button class="btn green" id="faucetBtn">Забрать 50 ₽</button></div></div>
<div class="sec-title">📋 Ежедневные задания</div><div class="col" id="questList"></div>
<div class="sec-title">🎟️ Промокод</div>
<div class="panel"><div class="row"><input class="inp" id="promoInp" placeholder="Введи промокод…" style="text-transform:uppercase"><button class="btn violet" id="promoBtn">Активировать</button></div><div class="small muted mt8">Подсказка: где-то по платформе разбросаны коды на 100–1000 ₽.</div></div>
<div class="sec-title">🤝 Рефералка</div>
<div class="panel"><div class="small muted">Твоя реферальная ссылка:</div><div class="row mt8"><input class="inp" id="refLink" readonly value="${RU.referral ? `https://t.me/${BOT_USERNAME}?start=r_${esc(RU.referral.code)}` : `https://t.me/${BOT_USERNAME}?start=friends`}"><button class="btn ghost" id="refCopy">Копировать</button></div></div>
<div class="sec-title">🐮 Ранг</div>
<div class="panel"><div class="row between wrap"><span class="rank-badge">🐮 ${rank()} • ур. ${level()}</span><span class="small muted">${fmt(S.xp)} XP</span></div><div class="xpbar mt12"><i style="width:${xpPct()}%"></i></div><div class="small muted mt8">XP капает с каждой ставки (1 XP за 10 ₽). Новый ранг = денежный бонус.</div></div>`;
    const fb = root.querySelector('#faucetBtn');
    function faucetTick() {
      const left = S.bonus.faucetLast + FAUCET_CD - Date.now();
      if (left <= 0) { fb.disabled = false; fb.textContent = 'Забрать 50 ₽'; }
      else { fb.disabled = true; fb.textContent = 'Через ' + Math.ceil(left / 1000) + ' с'; }
    }
    fb.onclick = () => { if (Date.now() - S.bonus.faucetLast < FAUCET_CD) return; S.bonus.faucetLast = Date.now(); addFunds(50, 'bonus', 'Кран удачи'); sfx.coin(); toast('🚰 +50 ₽ из крана', 'success'); faucetTick(); };
    faucetTick(); pageTimer(1000, faucetTick);
    const ql = root.querySelector('#questList');
    function renderQuests() {
      ql.innerHTML = QUESTS.map(q => {
        const val = Math.min(S.quests[q.id], q.need), done = S.quests.claimed.includes(q.id), can = val >= q.need && !done;
        return `<div class="quest"><span class="q-ic">${q.ic}</span><div class="q-body"><div class="q-name">${q.name}</div><div class="q-prog"><i style="width:${val / q.need * 100}%"></i></div><div class="q-n">${fmt(val)} / ${fmt(q.need)} • награда ${money(q.reward)}</div></div>${done ? '<span class="green-text small">✓ получено</span>' : `<button class="btn ${can ? 'green' : 'ghost'} sm" data-claim="${q.id}" ${can ? '' : 'disabled'}>Забрать</button>`}</div>`;
      }).join('');
    }
    ql.addEventListener('click', e => {
      const b = e.target.closest('[data-claim]'); if (!b || b.disabled) return;
      const q = QUESTS.find(x => x.id === b.dataset.claim);
      S.quests.claimed.push(q.id); addFunds(q.reward, 'quest', 'Задание: ' + q.name);
      sfx.coin(); toast(`📋 Задание выполнено: +${money(q.reward)}`, 'success'); renderQuests();
    });
    renderQuests();
    root.querySelector('#promoBtn').onclick = () => {
      const code = root.querySelector('#promoInp').value.trim().toUpperCase();
      if (!code) return;
      if (!PROMOS[code]) { toast('Такого промокода нет 🐮', 'error'); return; }
      if (S.bonus.promos.includes(code)) { toast('Этот код уже активирован', 'error'); return; }
      S.bonus.promos.push(code); addFunds(PROMOS[code], 'bonus', 'Промокод ' + code);
      sfx.coin(); confetti(70); toast(`🎟️ Промокод ${code}: +${money(PROMOS[code])}`, 'gold');
      root.querySelector('#promoInp').value = '';
    };
    root.querySelector('#refCopy').onclick = async () => {
      const link = root.querySelector('#refLink').value;
      try { await navigator.clipboard.writeText(link); } catch (e) { const i = root.querySelector('#refLink'); i.select(); document.execCommand('copy'); }
      toast('Ссылка скопирована', 'success'); sfx.click();
    };
  };
  function xpPct() { const l = level(), cur = 100 * (l - 1) ** 2, next = 100 * l ** 2; return clamp((S.xp - cur) / (next - cur) * 100, 0, 100); }

  /* ---------- bonus page ---------- */
  const DAILY = [50, 75, 100, 150, 200, 300, 500];
  const BW_VALS = [25, 50, 75, 100, 150, 250, 500, 1000];
  const BW_W = [30, 25, 18, 12, 8, 4, 2, 1];
  const BW_COLS = ['#7c5cff', '#ff4fd8', '#ffc93c', '#3fa9ff', '#9b5cff', '#ff6b4d', '#2fe6a7', '#ff4d6b'];
  RU.pages.bonus = function (root) {
    const canDaily = S.bonus.dailyLast !== today();
    const nextDay = S.bonus.dailyLast === yesterday() ? S.bonus.dailyDay % 7 + 1 : 1;
    const canWheel = S.bonus.wheelLast !== today();
    const canCash = S.bonus.cashLast !== today();
    const cashAmt = Math.floor(S.bonus.lossPool * .05);
    root.innerHTML = `
<div class="sec-title">🎁 Бонусы</div>
<div class="panel"><div class="row between wrap"><h3>📅 Ежедневный бонус</h3><span class="small muted">серия: ${S.bonus.dailyDay} дн.</span></div>
<div class="daily-grid mt12">${DAILY.map((a, i) => `<div class="daily-cell ${i + 1 < nextDay || (!canDaily && i + 1 === S.bonus.dailyDay) ? 'claimed' : ''} ${canDaily && i + 1 === nextDay ? 'today' : ''}"><div class="d">ДЕНЬ ${i + 1}</div><div class="a">${a} ₽</div></div>`).join('')}</div>
<button class="btn gold block mt12" id="dailyBtn" ${canDaily ? '' : 'disabled'}>${canDaily ? `Забрать день ${nextDay}: ${money(DAILY[nextDay - 1])}` : 'Сегодня уже получено — приходи завтра'}</button></div>
<div class="panel mt16"><div class="row between wrap"><h3>🎡 Колесо фортуны</h3><span class="small muted">1 бесплатный спин в день</span></div>
<div class="fwheel-wrap mt16"><div class="fwheel-pointer">🔻</div><div class="fwheel" id="bwheel" style="background:conic-gradient(${BW_COLS.map((c, i) => `${c} ${i * 45}deg ${(i + 1) * 45}deg`).join(',')})">${BW_VALS.map((v, i) => `<span class="fwheel-lbl" style="transform:rotate(${i * 45 + 22.5}deg) translateY(-118px)">${v}</span>`).join('')}</div><div class="fwheel-cap">🐮</div></div>
<button class="btn violet block mt16" id="bwheelBtn" ${canWheel ? '' : 'disabled'}>${canWheel ? 'Крутить бесплатно' : 'Завтра будет новый спин'}</button></div>
<div class="panel mt16"><div class="row between wrap"><div><h3>💸 Кэшбэк 5%</h3><div class="small muted">Накоплено потерь: ${money(Math.floor(S.bonus.lossPool))} • к возврату: <b class="gold-text">${money(cashAmt)}</b></div></div><button class="btn green" id="cashBtn" ${canCash && cashAmt >= 10 ? '' : 'disabled'}>Забрать</button></div><div class="tiny muted mt8">Считается от проигранных ставок, минимум к выводу 10 ₽, раз в день.</div></div>
<div class="panel mt16"><h3>🎟️ Активные промокоды</h3><div class="chiprow mt8">${Object.keys(PROMOS).map(c => `<span class="chip">${c} • ${PROMOS[c]} ₽</span>`).join('')}</div><div class="small muted mt8">Активируй во вкладке «Заработок».</div></div>`;
    root.querySelector('#dailyBtn').onclick = () => {
      if (S.bonus.dailyLast === today()) return;
      S.bonus.dailyDay = nextDay; S.bonus.dailyLast = today();
      const a = DAILY[nextDay - 1];
      addFunds(a, 'bonus', 'Ежедневный бонус, день ' + nextDay);
      sfx.coin(); if (a >= 200) confetti(90);
      toast(`📅 День ${nextDay}: +${money(a)}`, 'gold'); nav('bonus');
    };
    const wheel = root.querySelector('#bwheel'), wbtn = root.querySelector('#bwheelBtn');
    let spinning = false;
    wbtn.onclick = () => {
      if (spinning || S.bonus.wheelLast === today()) return;
      spinning = true; wbtn.disabled = true; sfx.spin();
      const total = BW_W.reduce((a, b) => a + b, 0);
      let r = float() * total, idx = 0;
      for (let i = 0; i < BW_W.length; i++) { r -= BW_W[i]; if (r <= 0) { idx = i; break; } }
      const target = 360 * 5 - (idx * 45 + 22.5);
      wheel.style.transform = `rotate(${target}deg)`;
      const tickIv = setInterval(() => sfx.tick(), 130);
      setTimeout(() => {
        clearInterval(tickIv);
        S.bonus.wheelLast = today();
        const v = BW_VALS[idx];
        addFunds(v, 'bonus', 'Колесо фортуны');
        sfx.coin(); if (v >= 250) { confetti(140); sfx.big(); }
        toast(`🎡 Колесо: +${money(v)}`, v >= 250 ? 'gold' : 'success', 5000);
        wbtn.textContent = 'Завтра будет новый спин'; spinning = false; save();
      }, 4400);
    };
    root.querySelector('#cashBtn').onclick = () => {
      if (S.bonus.cashLast === today() || cashAmt < 10) return;
      S.bonus.cashLast = today(); S.bonus.lossPool = 0;
      addFunds(cashAmt, 'bonus', 'Кэшбэк 5%');
      sfx.coin(); toast(`💸 Кэшбэк: +${money(cashAmt)}`, 'success'); nav('bonus');
    };
  };

  /* ---------- profile page ---------- */
  const AVATARS = ['🐮', '', '', '🐷', '🐸', '', '😎', '👑', '🐺', '', '💎', '🍀'];
  const TX_IC = { dep: '💳', wd: '🏧', bonus: '🎁', case: '📦', sell: '💰', jackpot: '🏆', quest: '📋' };
  function txRow(t) {
    const d = new Date(t.ts);
    return `<div class="tx-row"><span class="t-ic">${TX_IC[t.type] || '•'}</span><div class="t-b"><div class="t-n">${esc(t.note)}</div><div class="t-d">${d.toLocaleDateString('ru-RU')} ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div></div><span class="t-a ${t.amount >= 0 ? 'green-text' : 'red-text'}">${t.amount >= 0 ? '+' : ''}${fmt(t.amount)} ₽</span></div>`;
  }
  RU.pages.profile = function (root) {
    const st = S.stats, profit = st.won - st.wagered;
    root.innerHTML = `
<div class="sec-title">👤 Профиль</div>
<div class="panel"><div class="row wrap" style="gap:16px">
<div class="ava-btn" style="width:72px;height:72px;font-size:38px;cursor:default" id="pAva">${S.avatar}</div>
<div style="flex:1;min-width:200px"><div class="row"><input class="inp" id="pName" value="${esc(S.name)}" maxlength="18" style="max-width:220px"><span class="small muted">#${String(S.created).slice(-6)}</span></div>
<div class="row mt8 wrap"><span class="rank-badge">🐮 ${rank()} • ур. ${level()}</span><span class="small muted">${fmt(S.xp)} XP</span></div>
<div class="xpbar mt8"><i style="width:${xpPct()}%"></i></div></div>
<div class="col"><button class="btn gold" id="pDep">💳 Пополнить</button><button class="btn ghost" id="pWd">🏧 Вывести</button></div>
</div>
<div class="lbl mt16">Аватар</div><div class="avatar-pick" id="avaPick">${AVATARS.map(a => `<button data-ava="${a}" class="${a === S.avatar ? 'active' : ''}">${a}</button>`).join('')}</div></div>
<div class="sec-title">📊 Статистика</div>
<div class="stat-grid">
<div class="stat-box"><div class="v">${fmt(st.bets)}</div><div class="k">Ставок</div></div>
<div class="stat-box"><div class="v green-text">${fmt(st.wins)}</div><div class="k">Побед</div></div>
<div class="stat-box"><div class="v">${fmt(st.wagered)} ₽</div><div class="k">Поставлено</div></div>
<div class="stat-box"><div class="v gold-text">${fmt(st.won)} ₽</div><div class="k">Выиграно</div></div>
<div class="stat-box"><div class="v ${profit >= 0 ? 'green-text' : 'red-text'}">${profit >= 0 ? '+' : ''}${fmt(profit)} ₽</div><div class="k">Профит</div></div>
<div class="stat-box"><div class="v gold-text">${fmt(st.best)} ₽</div><div class="k">Лучший выигрыш</div></div>
<div class="stat-box"><div class="v">${fmt(st.cases)}</div><div class="k">Кейсов открыто</div></div>
<div class="stat-box"><div class="v">${st.bets ? Math.round(st.wins / st.bets * 100) : 0}%</div><div class="k">Винрейт</div></div>
</div>
<div class="sec-title">🎒 Инвентарь <span class="small muted" id="invCount">(${S.inventory.length})</span></div>
<div class="panel"><div class="row between wrap"><div class="small muted">Предметы из кейсов. Продавай в баланс.</div><button class="btn ghost sm" id="sellAll">Продать всё</button></div><div class="inv-grid mt12" id="invGrid"></div></div>
<div class="sec-title">🧾 История</div>
<div class="panel"><div class="col" id="txList">${S.tx.slice(0, 8).map(txRow).join('') || '<div class="empty">Пока пусто</div>'}</div><button class="btn ghost block mt12" id="txAll">Вся история</button></div>
<div class="sec-title">⚙️ Настройки</div>
<div class="panel col">
<div class="row between"><span>🔊 Звук</span><button class="switch ${S.settings.sound ? 'on' : ''}" id="setSound"></button></div>
<div class="row between"><span>⚡ Быстрые анимации</span><button class="switch ${S.settings.fast ? 'on' : ''}" id="setFast"></button></div>
<div class="row between"><span>🔐 Честная игра</span><button class="btn ghost sm" id="setFair">Сиды и проверка</button></div>
<div class="row between"><span class="red-text">🗑️ Сбросить прогресс</span><button class="btn red sm" id="setReset">Сброс</button></div>
</div>
<div class="trust-note mt16">🔒 <span>LootUP защищает данные шифрованием и использует проверяемый честный алгоритм. Играйте ответственно — 18+.</span></div>`;
    root.querySelector('#pName').addEventListener('change', e => { S.name = e.target.value.trim() || S.name; save(); toast('Ник сохранён', 'success'); });
    root.querySelector('#avaPick').addEventListener('click', e => {
      const b = e.target.closest('[data-ava]'); if (!b) return;
      S.avatar = b.dataset.ava; save(); sfx.click();
      root.querySelector('#pAva').textContent = S.avatar; $('#avaBtn').textContent = S.avatar;
      root.querySelectorAll('[data-ava]').forEach(x => x.classList.toggle('active', x === b));
    });
    root.querySelector('#pDep').onclick = () => openWallet('dep');
    root.querySelector('#pWd').onclick = () => openWallet('wd');
    const invGrid = root.querySelector('#invGrid');
    function renderInv() {
      root.querySelector('#invCount').textContent = `(${S.inventory.length})`;
      invGrid.innerHTML = S.inventory.length ? S.inventory.map(it => `<div class="inv-item rar-${it.rar}" style="--rar:${RAR_COLS[it.rar]}"><div class="em">${it.emoji}</div><div class="nm">${esc(it.name)}</div><div class="vl">${money(it.value)}</div><button class="btn ghost sm block mt8" data-sell="${it.id}">Продать</button></div>`).join('') : '<div class="empty" style="grid-column:1/-1"><span class="e-ic">🎒</span>Пусто. Открой кейс — предметы появятся тут.</div>';
    }
    invGrid.addEventListener('click', e => {
      const b = e.target.closest('[data-sell]'); if (!b) return;
      const it = S.inventory.find(x => x.id === b.dataset.sell); if (!it) return;
      S.inventory = S.inventory.filter(x => x.id !== it.id);
      addFunds(it.value, 'sell', 'Продажа: ' + it.name); sfx.coin(); toast(`Продано: ${it.name} +${money(it.value)}`, 'success'); renderInv();
    });
    root.querySelector('#sellAll').onclick = () => {
      if (!S.inventory.length) return;
      const total = S.inventory.reduce((a, b) => a + b.value, 0);
      S.inventory = []; addFunds(total, 'sell', 'Продажа всего инвентаря');
      sfx.coin(); toast(`🎒 Инвентарь продан: +${money(total)}`, 'success'); renderInv();
    };
    renderInv();
    root.querySelector('#txAll').onclick = () => openWallet('hist');
    root.querySelector('#setSound').onclick = e => { S.settings.sound = !S.settings.sound; save(); e.currentTarget.classList.toggle('on', S.settings.sound); $('#soundBtn').textContent = S.settings.sound ? '🔊' : '🔇'; if (S.settings.sound) sfx.click(); };
    root.querySelector('#setFast').onclick = e => { S.settings.fast = !S.settings.fast; save(); e.currentTarget.classList.toggle('on', S.settings.fast); sfx.click(); };
    root.querySelector('#setFair').onclick = openFair;
    root.querySelector('#setReset').onclick = () => {
      const m = modal(`<div class="modal-head"><div class="modal-title red-text">Сбросить прогресс?</div></div><p class="small muted">Баланс, статистика, инвентарь и бонусы обнулятся. Стартовые 1 000 ₽ вернутся.</p><div class="row mt16"><button class="btn ghost block" data-no>Отмена</button><button class="btn red block" data-yes>Сбросить</button></div>`);
      m.querySelector('[data-no]').onclick = closeModal;
      m.querySelector('[data-yes]').onclick = () => { localStorage.removeItem(KEY); localStorage.removeItem(KEY + '_seen'); location.reload(); };
    };
  };
  const RAR_COLS = ['#8a8aa8', '#3fa9ff', '#9b5cff', '#ff4fd8', '#ffc93c'];
  RU.RAR_COLS = RAR_COLS;
  RU.RAR_NAMES = ['Обычный', 'Необычный', 'Редкий', 'Эпический', 'Легендарный'];

  /* ---------- wallet (fake payments) ---------- */
  function openWallet(tab = 'dep') {
    const m = modal(`<div class="modal-head"><div class="modal-title">👛 Кошелёк</div><button class="x-btn" data-x>✕</button></div>
<div class="tabs" id="wTabs"><button data-t="dep">Пополнить</button><button data-t="wd">Вывести</button><button data-t="hist">История</button></div>
<div id="wBody" class="mt16"></div>`);
    m.querySelector('[data-x]').onclick = closeModal;
    const body = m.querySelector('#wBody');
    const tabs = m.querySelectorAll('#wTabs button');
    function setTab(t) { tabs.forEach(b => b.classList.toggle('active', b.dataset.t === t)); render(t); }
    tabs.forEach(b => b.onclick = () => { sfx.click(); setTab(b.dataset.t); });
    function render(t) {
      if (t === 'dep') renderDep(); else if (t === 'wd') renderWd(); else renderHist();
    }
    function renderDep() {
      body.innerHTML = `
<div class="trust-note">🔒 <span><b>Безопасная оплата.</b> Данные карты защищены шифрованием. Средства поступают на баланс мгновенно.</span></div>
<div class="lbl mt12">Сумма пополнения</div>
<div class="chiprow" id="depAmts">${[100, 500, 1000, 5000, 10000].map(v => `<button class="chip" data-a="${v}">${fmt(v)} ₽</button>`).join('')}</div>
<input class="inp mt8" id="depAmt" type="number" inputmode="numeric" value="1000" min="50">
<div class="lbl mt12">Способ оплаты</div>
<div class="pay-methods" id="payM">
<button class="pay-m active" data-m="card"><span class="pm-ic">💳</span>Карта</button>
<button class="pay-m" data-m="sbp"><span class="pm-ic">📱</span>СБП</button>
<button class="pay-m" data-m="crypto"><span class="pm-ic">₿</span>Крипта</button>
<button class="pay-m" data-m="stars"><span class="pm-ic">⭐</span>Stars</button>
</div>
<div id="cardForm" class="mt12 col">
<input class="inp" id="ccNum" placeholder="Номер карты" value="4242 4242 4242 4242" inputmode="numeric" maxlength="19">
<div class="row"><input class="inp" id="ccExp" placeholder="ММ/ГГ" value="12/29" maxlength="5"><input class="inp" id="ccCvc" placeholder="CVC" value="777" type="password" maxlength="3"></div>
</div>
<button class="btn gold block lg mt16" id="payBtn">Оплатить</button>`;
      let method = 'card';
      const amtInp = body.querySelector('#depAmt');
      body.querySelector('#depAmts').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) { amtInp.value = b.dataset.a; sfx.click(); } });
      body.querySelector('#payM').addEventListener('click', e => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        method = b.dataset.m; sfx.click();
        body.querySelectorAll('.pay-m').forEach(x => x.classList.toggle('active', x === b));
        body.querySelector('#cardForm').style.display = method === 'card' ? '' : 'none';
      });
      body.querySelector('#ccNum').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); });
      body.querySelector('#ccExp').addEventListener('input', e => { let v = e.target.value.replace(/\D/g, '').slice(0, 4); if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2); e.target.value = v; });
      body.querySelector('#payBtn').onclick = () => {
        const amt = Math.floor(parseFloat(amtInp.value) || 0);
        if (amt < 50) { toast('Минимум 50 ₽', 'error'); return; }
        const mName = { card: 'Карта', sbp: 'СБП', crypto: 'Крипта', stars: 'Stars' }[method];
        body.innerHTML = `<div class="center" style="padding:34px 0"><div class="spinner"></div><div class="mt16 muted">Проводим платёж через «${mName}»…</div></div>`;
        setTimeout(() => {
          addFunds(amt, 'dep', 'Пополнение • ' + mName);
          sfx.coin(); confetti(60);
          body.innerHTML = `<div class="center" style="padding:20px 0"><div class="pay-success">✓</div><h3 class="mt16" style="font-family:var(--disp)">+${money(amt)}</h3><div class="muted small mt8">Баланс пополнен. Средства доступны для игры.</div><button class="btn gold block mt16" data-done>Отлично</button></div>`;
          body.querySelector('[data-done]').onclick = closeModal;
        }, 1600);
      };
    }
    function renderWd() {
      body.innerHTML = `
<div class="trust-note">🔒 <span><b>Вывод средств.</b> Заявка обрабатывается на указанные реквизиты. Обычно занимает до 24 часов.</span></div>
<div class="lbl mt12">Сумма (мин. 500 ₽)</div>
<input class="inp" id="wdAmt" type="number" inputmode="numeric" value="1000" min="500">
<div class="lbl mt12">Реквизиты (что угодно)</div>
<input class="inp" id="wdReq" placeholder="Номер карты или телефон">
<div class="statline mt12"><span>Доступно</span><b>${money(S.balance)}</b></div>
<button class="btn violet block lg mt16" id="wdBtn">Вывести</button>`;
      body.querySelector('#wdBtn').onclick = () => {
        const amt = Math.floor(parseFloat(body.querySelector('#wdAmt').value) || 0);
        if (amt < 500) { toast('Минимум 500 ₽', 'error'); return; }
        if (amt > S.balance) { toast('Недостаточно средств', 'error'); return; }
        if (!body.querySelector('#wdReq').value.trim()) { toast('Укажи реквизиты (любые)', 'error'); return; }
        body.innerHTML = `<div class="center" style="padding:34px 0"><div class="spinner"></div><div class="mt16 muted">Обрабатываем вывод…</div></div>`;
        setTimeout(() => {
          addFunds(-amt, 'wd', 'Вывод средств');
          sfx.cash();
          body.innerHTML = `<div class="center" style="padding:20px 0"><div class="pay-success">✓</div><h3 class="mt16" style="font-family:var(--disp)">−${money(amt)}</h3><div class="muted small mt8">Заявка на вывод создана. Средства поступят на реквизиты.</div><button class="btn gold block mt16" data-done>Понятно</button></div>`;
          body.querySelector('[data-done]').onclick = closeModal;
        }, 2000);
      };
    }
    function renderHist() {
      body.innerHTML = `<div class="col">${S.tx.length ? S.tx.slice(0, 40).map(txRow).join('') : '<div class="empty"><span class="e-ic">🧾</span>Операций пока не было</div>'}</div>`;
    }
    setTab(tab);
  }

  /* ---------- fair play modal ---------- */
  function openFair() {
    const hash = xmur3(S.fair.server)().toString(16).padStart(8, '0');
    const m = modal(`<div class="modal-head"><div class="modal-title">🔐 Честная игра</div><button class="x-btn" data-x>✕</button></div>
<div class="trust-note">ℹ️ <span>Алгоритм: xmur3 + mulberry32 от строки <b>server:client:nonce</b>. Каждый раунд увеличивает nonce — результаты воспроизводимы.</span></div>
<div class="lbl mt12">Хэш серверного сида</div><div class="inp" style="font-family:monospace;font-size:13px">${hash}</div>
<div class="lbl mt12">Клиентский сид</div><div class="row"><input class="inp" id="fClient" value="${esc(S.fair.client)}"><button class="btn violet sm" id="fApply">OK</button></div>
<div class="statline mt12"><span>Nonce (раундов сыграно)</span><b>${S.fair.nonce}</b></div>
${lastRoll ? `<div class="lbl mt12">Последний ролл #${lastRoll.nonce}</div><div class="inp tiny" style="font-family:monospace">${lastRoll.out.slice(0, 6).map(x => x.toFixed(6)).join(' · ')}</div>` : ''}
<button class="btn ghost block mt16" id="fRotate">🔄 Сменить серверный сид</button>`);
    m.querySelector('[data-x]').onclick = closeModal;
    m.querySelector('#fApply').onclick = () => { const v = m.querySelector('#fClient').value.trim(); if (v) { S.fair.client = v; save(); toast('Клиентский сид обновлён', 'success'); closeModal(); } };
    m.querySelector('#fRotate').onclick = () => { const old = S.fair.server; S.fair.server = hex(32); S.fair.nonce = 0; save(); toast('Старый сид раскрыт: <span style="font-family:monospace">' + old.slice(0, 16) + '…</span>', 'info', 6000); openFair(); };
  }

  /* ---------- game overlay ---------- */
  let gameSession = null;
  function makeSession() {
    const s = { iv: [], to: [], raf: [], cbs: [], alive: true };
    s.every = (ms, fn) => { const id = setInterval(() => { if (s.alive) fn(); }, ms); s.iv.push(id); return id; };
    s.after = (ms, fn) => { const id = setTimeout(() => { if (s.alive) fn(); }, ms); s.to.push(id); return id; };
    s.loop = fn => { let id; const step = t => { if (!s.alive) return; fn(t); id = requestAnimationFrame(step); }; id = requestAnimationFrame(step); s.raf.push(() => cancelAnimationFrame(id)); };
    s.onCleanup = fn => s.cbs.push(fn);
    s.kill = () => { s.alive = false; s.iv.forEach(clearInterval); s.to.forEach(clearTimeout); s.raf.forEach(f => f()); s.cbs.forEach(f => { try { f(); } catch (e) {} }); };
    return s;
  }
  function openGame(id) {
    const g = RU.GAMES.find(x => x.id === id); if (!g) return;
    if (g.page) { nav(g.page); return; }
    closeGame();
    const sess = makeSession(); gameSession = sess;
    const back = h(`<div class="gback"><div class="gshell">
<div class="ghead"><span class="ghead-ic">${g.icon}</span><div><div class="ghead-title">${g.name}</div><div class="ghead-online"><span class="dot"></span><span data-players="${g.players}">${g.players} играют</span></div></div><div class="sp"></div><button class="icon-btn" data-fair title="Честная игра">🔐</button><button class="x-btn" data-close>✕</button></div>
<div class="gbody"></div></div></div>`);
    $('#gameRoot').appendChild(back);
    back.querySelector('[data-close]').onclick = closeGame;
    back.querySelector('[data-fair]').onclick = openFair;
    back.addEventListener('mousedown', e => { if (e.target === back) closeGame(); });
    document.body.style.overflow = 'hidden';
    g.mount(back.querySelector('.gbody'), sess);
    sfx.click();
  }
  function closeGame() {
    if (gameSession) { gameSession.kill(); gameSession = null; }
    $('#gameRoot').innerHTML = '';
    document.body.style.overflow = '';
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeGame(); } });

  /* ---------- shared game helpers ---------- */
  function betPanel(opts = {}) {
    const min = opts.min ?? 1;
    const el = h(`<div class="betpanel">
<div class="lbl">Ставка</div>
<div class="betrow"><input class="inp" type="number" inputmode="decimal" value="${opts.bet ?? 100}" min="${min}"><button class="betmod" data-m="half">½</button><button class="betmod" data-m="double">×2</button><button class="betmod" data-m="max">MAX</button></div>
<div class="betquick">${[50, 100, 500, 1000].map(v => `<button data-q="${v}">${v}</button>`).join('')}</div>
</div>`);
    const inp = el.querySelector('input');
    const amount = () => Math.max(0, parseFloat(inp.value) || 0);
    el.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
      let v = amount();
      if (b.dataset.m === 'half') v = Math.max(min, v / 2);
      if (b.dataset.m === 'double') v = Math.min(S.balance, (v || min) * 2);
      if (b.dataset.m === 'max') v = S.balance;
      inp.value = Math.floor(v * 100) / 100; sfx.click();
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    });
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { inp.value = b.dataset.q; sfx.click(); inp.dispatchEvent(new Event('input', { bubbles: true })); });
    return { el, amount, input: inp, lock(v) { inp.disabled = v; el.querySelectorAll('button').forEach(b => b.disabled = v); } };
  }
  function fitCanvas(c) {
    const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr));
    const ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: r.width, h: r.height };
  }
  function histChip(el, text, cls) {
    el.prepend(h(`<span class="hchip ${cls}">${text}</span>`));
    while (el.children.length > 14) el.lastChild.remove();
  }

  /* ---------- friends / referrals ---------- */
  const BOT_USERNAME = 'rubup_upgrade_demo_bot';
  RU.referral = null; RU.refError = '';
  function openTg(url) {
    const t = window.Telegram && window.Telegram.WebApp;
    if (t && t.initData && t.openTelegramLink) t.openTelegramLink(url);
    else window.open(url, '_blank', 'noreferrer');
  }
  RU.pages.friends = function (root) {
    const snap = RU.referral;
    const link = snap ? `https://t.me/${BOT_USERNAME}?start=r_${snap.code}` : '';
    root.innerHTML = `
<div class="sec-title">🤝 Друзья</div>
<div class="game-layout">
  <div class="col">
    <div class="panel">
      <h3>Собери коллекцию вместе</h3>
      <div class="small muted">Отправь другу личную ссылку. Первое нажатие Start в боте засчитается как приглашение.</div>
      ${snap ? `
      <div class="lbl mt12">Твоя реферальная ссылка</div>
      <div class="row"><input class="inp" id="frLink" readonly value="${link}"><button class="btn ghost" id="frCopy">Копировать</button></div>
      <button class="btn violet block mt8" id="frShare">Поделиться</button>` : `
      <button class="btn gold block lg mt12" id="frGet">Получить ссылку в Telegram</button>`}
      ${RU.refError ? `<div class="trust-note mt12">⚠️ ${esc(RU.refError)}</div>` : ''}
    </div>
  </div>
  <div class="col">
    <div class="panel center">
      <div class="lbl">Приглашено друзей</div>
      <div class="gold-text" style="font-family:var(--disp);font-size:46px;font-weight:900;line-height:1.1">${snap ? fmt(snap.count) : '—'}</div>
      <div class="small muted mt8">${snap ? 'На ' + new Date(snap.issued * 1000).toLocaleString('ru-RU') + '. Подписано ботом.' : 'Статистика появится после запуска через бота.'}</div>
      <button class="btn ghost sm mt12" id="frUpd">Обновить через бота</button>
    </div>
  </div>
</div>
<div class="panel mt16">
  <h3>Как учитываются приглашения</h3>
  <div class="small muted">Только новые пользователи бота. Один Telegram-аккаунт учитывается один раз; повторный запуск и приглашение себя не увеличивают счётчик. Переход без нажатия Start не считается.</div>
  <div class="small muted mt8">Счётчик хранится у бота, не в браузере. Это снимок статистики: для обновления открой новую кнопку из бота. Пока бот выключен, новые приглашения не обрабатываются.</div>
  <div class="small muted mt8">Денежных выплат за приглашения нет. Счётчик друзей хранится у бота, а игровой баланс и предметы — в этом браузере.</div>
</div>`;
    const copyBtn = root.querySelector('#frCopy');
    if (copyBtn) copyBtn.onclick = async () => {
      const i = root.querySelector('#frLink');
      try { await navigator.clipboard.writeText(link); } catch (e) { i.select(); document.execCommand('copy'); }
      sfx.click(); toast('🔗 Ссылка скопирована', 'success');
    };
    const share = root.querySelector('#frShare');
    if (share) share.onclick = () => { sfx.click(); openTg(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Присоединяйся к LOOTUP — кейсы, апгрейд и коллекция подарков!')}`); };
    const get = root.querySelector('#frGet');
    if (get) get.onclick = () => { sfx.click(); openTg(`https://t.me/${BOT_USERNAME}?start=friends`); };
    root.querySelector('#frUpd').onclick = () => { sfx.click(); openTg(`https://t.me/${BOT_USERNAME}?start=friends`); };
  };

  /* ---------- boot ---------- */
  function boot() {
    $('#sidenav').innerHTML = NAV.map(n => `<button class="snav" data-nav="${n.id}"><span class="t-ic">${n.ic}</span>${n.label}</button>`).join('');
    $('#tabbar').innerHTML = NAV.map(n => `<button class="tab" data-nav="${n.id}"><span class="t-ic">${n.ic}</span>${n.label}</button>`).join('');
    $$('[data-nav]').forEach(b => b.onclick = () => { sfx.click(); nav(b.dataset.nav); });
    $('#balChip').onclick = () => openWallet('dep');
    $('#depBtn').onclick = () => openWallet('dep');
    $('#avaBtn').onclick = () => nav('profile');
    $('#avaBtn').textContent = S.avatar;
    const sb = $('#soundBtn');
    const soundIcon = () => sb.textContent = S.settings.sound ? '🔊' : '🔇';
    soundIcon();
    sb.onclick = () => { S.settings.sound = !S.settings.sound; save(); soundIcon(); if (S.settings.sound) sfx.click(); toast(S.settings.sound ? '🔊 Звук включён' : '🔇 Звук выключен', 'info', 1500); };
    updateBalance();
    nav('home');
    for (let i = 0; i < 6; i++) simLive();
    setInterval(() => { if (!document.hidden) simLive(); }, 3200);
    setInterval(tickOnline, 4000); tickOnline();
    setInterval(() => {
      S.jackpot += Math.random() * 9;
      const v = money(Math.floor(S.jackpot));
      const a = $('#sjVal'), b = $('#jackVal');
      if (a) a.textContent = v; if (b) b.textContent = v;
    }, 3000);
    if (!localStorage.getItem(KEY + '_seen')) {
      localStorage.setItem(KEY + '_seen', '1');
      setTimeout(() => toast('🐮 Добро пожаловать в LootUP! Стартовые <b>1 000 ₽</b> уже на балансе.', 'gold', 6500), 700);
    }
    document.addEventListener('pointerdown', () => { if (S.settings.sound) ac(); }, { once: true });
  }

  Object.assign(RU, {
    $, $$, h, esc, fmt, money, multFmt, today, yesterday, clamp, hex,
    S, save, floats, float, sfx, toast, modal, closeModal, confetti,
    addFunds, bet, payout, caseOpened, gainXP, questProg, ensureQuestDate,
    level, rank, xpPct, avaBg, pushLive, gameName,
    nav, openGame, closeGame, openWallet, openFair, betPanel, fitCanvas, histChip, pageTimer,
    NAMES, AVAS, PROMOS, boot, botName: BOT_USERNAME, openTg
  });
})();