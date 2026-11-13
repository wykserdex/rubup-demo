'use strict';
/* Games part 2: Кейсы + PvP-баттлы, Рулетка, Слоты, Блэкджек, Кости, Колесо, Монетка, Хай-Лоу */
(() => {
  const { h, esc, fmt, money, multFmt, clamp, float, floats, bet, payout, sfx, toast, modal, closeModal, betPanel, fitCanvas, histChip, confetti, S } = RU;

  /* ================= CASES ================= */
  const CASES = [
    { id: 'calf', name: 'Телёнок', emoji: '🐮', price: 50, items: [['Сено', '🌾', 10, 45], ['Молоко', '🥛', 25, 27], ['Колокольчик', '🔔', 60, 13], ['Клевер', '🍀', 150, 7], ['Подарок', '🎁', 400, 2.5], ['Корона', '👑', 2000, .5]] },
    { id: 'farm', name: 'Ферма', emoji: '🚜', price: 150, items: [['Тыква', '🎃', 30, 40], ['Яйцо', '🥚', 70, 28], ['Трактор', '🚜', 180, 16], ['Бычок', '🐂', 450, 9], ['Алмаз', '💎', 1200, 5], ['Ракета', '🚀', 4000, 2]] },
    { id: 'hoof', name: 'Золотое копыто', emoji: '🪙', price: 500, items: [['Монетка', '🪙', 100, 40], ['Клевер', '🍀', 250, 28], ['Кубок', '🏆', 600, 16], ['Кольцо', '💍', 1500, 9], ['Алмаз', '💎', 4000, 5], ['Корона', '👑', 15000, 2]] },
    { id: 'stormc', name: 'Штормовой', emoji: '🔮', price: 2500, items: [['Кристалл', '🔮', 500, 40], ['Молния', '⚡', 1250, 28], ['Звезда', '⭐', 3000, 16], ['Комета', '☄️', 7500, 9], ['Алмаз', '💎', 20000, 5], ['Корона', '👑', 75000, 2]] },
    { id: 'bull', name: 'Бык-машина', emoji: '🐂', price: 1500, items: [['Шлем', '🪖', 300, 40], ['Клинок', '🗡️', 750, 28], ['Амулет', '🔮', 1800, 16], ['Слиток', '💰', 4500, 9], ['Алмаз', '💎', 12000, 5], ['Корона', '👑', 45000, 2]] },
    { id: 'elite', name: 'Элитный загон', emoji: '👑', price: 5000, items: [['Бокал', '🥂', 1000, 40], ['Часы', '⌚', 2500, 28], ['Бусы', '📿', 6000, 16], ['Мешок золота', '💰', 15000, 9], ['Алмаз', '💎', 40000, 5], ['Корона', '👑', 150000, 2]] }
  ];
  CASES.forEach(c => {
    const ev = c.items.reduce((a, [, , v, w]) => a + v * w, 0) / c.items.reduce((a, [, , , w]) => a + w, 0);
    const scale = .9 * c.price / ev;
    c.items = c.items.map(([name, emoji, v, w]) => {
      const value = Math.max(1, Math.round(v * scale));
      const ratio = value / c.price;
      const rar = ratio < .5 ? 0 : ratio < 1 ? 1 : ratio < 3 ? 2 : ratio < 10 ? 3 : 4;
      return { name, emoji, value, w, rar };
    });
    c.totalW = c.items.reduce((a, i) => a + i.w, 0);
  });
  function rollItem(c) {
    let r = float() * c.totalW;
    for (const it of c.items) { r -= it.w; if (r <= 0) return it; }
    return c.items[0];
  }
  const rarCol = i => RU.RAR_COLS[i];

  RU.GAMES.push({ id: 'cases', name: 'Кейсы', icon: '📦', art: 'cases', players: 1187, tag: 'PvP', cat: ['pvp', 'hot'], page: 'cases' });

  RU.pages.cases = function (root) {
    let tab = 'cases';
    root.innerHTML = `
<div class="sec-title">📦 Кейсы и баттлы</div>
<div class="tabs" id="caseTabs"><button data-t="cases" class="active">Кейсы</button><button data-t="battle">⚔️ PvP-баттлы</button></div>
<div id="caseBody" class="mt16"></div>`;
    const body = root.querySelector('#caseBody');
    root.querySelector('#caseTabs').addEventListener('click', e => {
      const b = e.target.closest('[data-t]'); if (!b) return;
      tab = b.dataset.t; sfx.click();
      root.querySelectorAll('#caseTabs button').forEach(x => x.classList.toggle('active', x === b));
      render();
    });
    function render() { tab === 'cases' ? renderCases() : renderBattle(); }

    function renderCases() {
      body.innerHTML = `<div class="case-grid">${CASES.map(c => `<div class="case-card" data-case="${c.id}"><div class="case-emoji">${c.emoji}</div><div class="case-name">${c.name}</div><span class="case-price">${money(c.price)}</span><div class="tiny muted mt8">топ-дроп: ${c.items[c.items.length - 1].emoji} ${fmt(c.items[c.items.length - 1].value)} ₽</div></div>`).join('')}</div>`;
      body.querySelectorAll('[data-case]').forEach(el => el.onclick = () => openCaseView(CASES.find(c => c.id === el.dataset.case)));
    }

    function openCaseView(c) {
      body.innerHTML = `
<button class="btn ghost sm" id="caseBack">← Все кейсы</button>
<div class="panel mt12 center"><div class="case-emoji">${c.emoji}</div><h3 style="font-family:var(--disp);font-size:18px">${c.name}</h3><div class="muted small">Цена открытия: <b class="gold-text">${money(c.price)}</b></div></div>
<div class="reel-wrap mt16" id="reelWrap"><div class="reel-pointer"></div><div class="reel-strip-h" id="reelStrip"></div></div>
<div class="row mt16"><button class="btn gold lg" id="openBtn" style="flex:1">Открыть за ${money(c.price)}</button><button class="btn ghost" id="fastBtn">${S.settings.fast ? '⚡ Быстро' : '🐢 Обычная'}</button></div>
<div class="lbl mt20">Содержимое кейса</div>
<div class="inv-grid">${c.items.map(it => `<div class="inv-item rar-${it.rar}" style="--rar:${rarCol(it.rar)}"><div class="em">${it.emoji}</div><div class="nm">${it.name}</div><div class="vl">${money(it.value)}</div><div class="tiny muted">${(it.w / c.totalW * 100).toFixed(1)}%</div></div>`).join('')}</div>`;
      body.querySelector('#caseBack').onclick = renderCases;
      const strip = body.querySelector('#reelStrip'), wrap = body.querySelector('#reelWrap');
      const openBtn = body.querySelector('#openBtn'), fastBtn = body.querySelector('#fastBtn');
      let fast = S.settings.fast, busy = false;
      fastBtn.onclick = () => { fast = !fast; fastBtn.textContent = fast ? '⚡ Быстро' : '🐢 Обычная'; sfx.click(); };
      function fillStrip(winner) {
        const items = [];
        for (let i = 0; i < 40; i++) {
          const it = i === 32 ? winner : c.items[Math.floor(Math.random() * c.items.length)];
          items.push(`<div class="reel-item rar-${it.rar}"><span class="em">${it.emoji}</span><span class="vl" style="color:${rarCol(it.rar)}">${fmt(it.value)} ₽</span></div>`);
        }
        strip.innerHTML = items.join('');
        strip.style.transition = 'none'; strip.style.transform = 'translateX(0)';
      }
      fillStrip(c.items[0]);
      openBtn.onclick = () => {
        if (busy) return;
        if (!bet(c.price)) return;
        RU.caseOpened();
        busy = true; openBtn.disabled = true;
        const winner = rollItem(c);
        fillStrip(winner);
        void strip.offsetWidth;
        const itemW = 112, target = -(32 * itemW - wrap.clientWidth / 2 + itemW / 2);
        const dur = fast ? .7 : 4.6;
        strip.style.transition = `transform ${dur}s cubic-bezier(.08,.72,.08,1)`;
        strip.style.transform = `translateX(${target}px)`;
        sfx.spin();
        const tickIv = setInterval(() => sfx.tick(), fast ? 90 : 140);
        setTimeout(() => {
          clearInterval(tickIv);
          busy = false;
          if (!openBtn.isConnected) return;
          openBtn.disabled = false;
          revealItem(winner, c);
        }, dur * 1000 + 150);
      };
    }

    function revealItem(it, c) {
      if (it.rar >= 3) { confetti(120); sfx.big(); } else if (it.rar >= 1) sfx.win(); else sfx.click();
      const m = modal(`<div class="item-reveal" style="--rar:${rarCol(it.rar)}">
<div class="rar-name">${RU.RAR_NAMES[it.rar]}</div>
<div class="big-em mt8">${it.emoji}</div>
<h3 class="mt8" style="font-family:var(--disp)">${it.name}</h3>
<div class="gold-text mt8" style="font-size:20px;font-weight:800">${money(it.value)}</div>
<div class="row mt16"><button class="btn green block" data-sell>Продать за ${money(it.value)}</button><button class="btn violet block" data-keep>В инвентарь</button></div>
<div class="tiny muted mt8">из кейса «${c.name}»</div></div>`);
      m.querySelector('[data-sell]').onclick = () => { RU.addFunds(it.value, 'case', 'Дроп: ' + it.name); sfx.coin(); toast(`${it.emoji} ${it.name} продан: +${money(it.value)}`, 'success'); closeModal(); };
      m.querySelector('[data-keep]').onclick = () => {
        S.inventory.unshift({ id: 'it' + Date.now() + Math.floor(Math.random() * 999), name: it.name, emoji: it.emoji, value: it.value, rar: it.rar, type: 'gift', ts: Date.now() });
        RU.save(); sfx.click(); toast(`${it.emoji} ${it.name} в инвентаре`, 'info'); closeModal();
      };
    }

    /* ----- battles ----- */
    function renderBattle() {
      let selCase = CASES[0], rounds = 1;
      body.innerHTML = `
<div class="panel"><div class="lbl">Кейс для баттла</div><div class="chiprow scroll" id="bCases">${CASES.map((c, i) => `<button class="chip ${i === 0 ? 'active' : ''}" data-c="${c.id}">${c.emoji} ${c.name} • ${fmt(c.price)} ₽</button>`).join('')}</div>
<div class="lbl mt12">Раундов</div><div class="chiprow" id="bRounds">${[1, 2, 3].map(n => `<button class="chip ${n === 1 ? 'active' : ''}" data-r="${n}">${n}</button>`).join('')}</div>
<div class="statline mt12"><span>Стоимость входа</span><b class="gold-text" id="bCost">${money(selCase.price)}</b></div>
<button class="btn gold block lg mt12" id="bStart">⚔️ Создать баттл</button>
<div class="small muted mt8 center">Ты против случайного игрока. Кто выбьет больше — забирает всё.</div></div>
<div id="bArena" class="mt16"></div>`;
      const costEl = body.querySelector('#bCost');
      const upd = () => costEl.textContent = money(selCase.price * rounds);
      body.querySelector('#bCases').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (!b) return; selCase = CASES.find(c => c.id === b.dataset.c); body.querySelectorAll('#bCases .chip').forEach(x => x.classList.toggle('active', x === b)); sfx.click(); upd(); });
      body.querySelector('#bRounds').addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; rounds = +b.dataset.r; body.querySelectorAll('#bRounds .chip').forEach(x => x.classList.toggle('active', x === b)); sfx.click(); upd(); });
      body.querySelector('#bStart').onclick = () => {
        const cost = selCase.price * rounds;
        if (!bet(cost)) return;
        RU.caseOpened();
        const bot = { name: RU.NAMES[Math.floor(Math.random() * RU.NAMES.length)], ava: RU.AVAS[Math.floor(Math.random() * RU.AVAS.length)] };
        const arena = body.querySelector('#bArena');
        body.querySelector('#bStart').disabled = true;
        arena.innerHTML = `
<div class="battle-vs">
<div class="battle-side"><div class="ava-btn" style="margin:0 auto;width:48px;height:48px;font-size:24px">${S.avatar}</div><div class="small mt8">${esc(S.name)}</div><div class="battle-total gold-text" id="bMyTotal">0 ₽</div></div>
<div class="battle-x">VS</div>
<div class="battle-side"><div class="ava-btn" style="margin:0 auto;width:48px;height:48px;font-size:24px">${bot.ava}</div><div class="small mt8">${esc(bot.name)}</div><div class="battle-total gold-text" id="bBotTotal">0 ₽</div></div>
</div>
<div id="bRoundsWrap"></div><div id="bResult" class="mt12"></div>`;
        let myTotal = 0, botTotal = 0, round = 0;
        const roundsWrap = arena.querySelector('#bRoundsWrap');
        function playRound() {
          round++;
          const my = rollItem(selCase), botIt = rollItem(selCase);
          const row = h(`<div class="panel mt8"><div class="lbl">Раунд ${round} • ${selCase.emoji} ${selCase.name}</div><div class="row" style="gap:8px"><div class="reel-wrap" style="flex:1;height:110px"><div class="reel-pointer"></div><div class="reel-strip-h" data-side="my"></div></div><div class="reel-wrap" style="flex:1;height:110px"><div class="reel-pointer"></div><div class="reel-strip-h" data-side="bot"></div></div></div></div>`);
          roundsWrap.appendChild(row);
          const strips = [row.querySelector('[data-side="my"]'), row.querySelector('[data-side="bot"]')];
          const winners = [my, botIt];
          strips.forEach((strip, si) => {
            const items = [];
            for (let i = 0; i < 30; i++) {
              const it = i === 24 ? winners[si] : selCase.items[Math.floor(Math.random() * selCase.items.length)];
              items.push(`<div class="reel-item rar-${it.rar}" style="width:92px;height:88px"><span class="em" style="font-size:28px">${it.emoji}</span><span class="vl" style="color:${rarCol(it.rar)}">${fmt(it.value)} ₽</span></div>`);
            }
            strip.innerHTML = items.join('');
            void strip.offsetWidth;
            const wrap = strip.parentElement;
            const target = -(24 * 100 - wrap.clientWidth / 2 + 46);
            strip.style.transition = 'transform 2.6s cubic-bezier(.08,.72,.08,1)';
            strip.style.transform = `translateX(${target}px)`;
          });
          sfx.spin();
          setTimeout(() => {
            myTotal += my.value; botTotal += botIt.value;
            if (!arena.isConnected) { finishBattle(); return; }
            arena.querySelector('#bMyTotal').textContent = money(myTotal);
            arena.querySelector('#bBotTotal').textContent = money(botTotal);
            if (my.rar >= 3 || botIt.rar >= 3) sfx.big(); else sfx.card();
            if (round < rounds) setTimeout(playRound, 700);
            else finishBattle();
          }, 2800);
        }
        function finishBattle() {
          const pot = myTotal + botTotal;
          let msg, cls;
          if (myTotal > botTotal) { payout('cases', cost, pot / cost); msg = `🏆 Победа! Забрал весь банк: ${money(pot)}`; cls = 'win'; confetti(130); }
          else if (myTotal < botTotal) { payout('cases', cost, 0); msg = `💀 ${bot.name} забрал банк ${money(pot)}`; cls = 'lose'; }
          else { payout('cases', cost, myTotal / cost, { push: true }); msg = `🤝 Ничья! Каждый при своём: ${money(myTotal)}`; cls = 'push'; }
          if (arena.isConnected) {
            arena.querySelector('#bResult').innerHTML = `<div class="result-banner ${cls}">${msg}</div>`;
            const sb = body.querySelector('#bStart'); if (sb) sb.disabled = false;
          }
        }
        playRound();
      };
    }
    render();
  };

  /* ================= ROULETTE ================= */
  const RO_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const RO_BETS = [
    { id: 'red', label: '🔴 Красное', mult: 2, cls: 'red', test: n => REDS.has(n) },
    { id: 'black', label: '⚫ Чёрное', mult: 2, cls: 'black', test: n => n !== 0 && !REDS.has(n) },
    { id: 'green', label: '🟢 Зеро ×36', mult: 36, cls: 'green', test: n => n === 0 },
    { id: 'even', label: 'Чёт', mult: 2, cls: '', test: n => n !== 0 && n % 2 === 0 },
    { id: 'odd', label: 'Нечет', mult: 2, cls: '', test: n => n !== 0 && n % 2 === 1 },
    { id: 'low', label: '1–18', mult: 2, cls: '', test: n => n >= 1 && n <= 18 },
    { id: 'high', label: '19–36', mult: 2, cls: '', test: n => n >= 19 },
    { id: 'd1', label: '1–12', mult: 3, cls: '', test: n => n >= 1 && n <= 12 },
    { id: 'd2', label: '13–24', mult: 3, cls: '', test: n => n >= 13 && n <= 24 },
    { id: 'd3', label: '25–36', mult: 3, cls: '', test: n => n >= 25 }
  ];
  RU.GAMES.push({
    id: 'roulette', name: 'Рулетка', icon: '🎡', art: 'roulette', players: 203, cat: ['hot'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout rev">
  <div class="col">
    <div class="stage center" style="padding:18px"><canvas id="roCanvas" style="width:min(320px,80vw);height:min(320px,80vw);margin:0 auto"></canvas>
      <div class="row" style="justify-content:center;margin-top:10px"><div class="roul-num" id="roNum" style="background:#22224d">–</div></div>
    </div>
    <div class="hist" id="roHist"></div>
    <div class="roul-board" id="roBoard">${RO_BETS.map(b => `<button class="rbet ${b.cls}" data-b="${b.id}">${b.label}</button>`).join('')}</div>
  </div>
  <div class="col" id="roSide"></div>
</div>`;
      const side = body.querySelector('#roSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      side.appendChild(h(`<div class="small muted center">Ставка = фишка. Кликай по полям — фишки лягут туда. Несколько фишек за спин можно.</div>`));
      const totalEl = h(`<div class="statline"><span>Всего на столе</span><b class="gold-text" id="roTotal">0 ₽</b></div>`);
      side.appendChild(totalEl);
      const spinBtn = h(`<button class="btn gold block lg" id="roSpin" disabled>🎡 Крутить</button>`);
      const clearBtn = h(`<button class="btn ghost block" id="roClear">Убрать фишки</button>`);
      side.appendChild(spinBtn); side.appendChild(clearBtn);
      const canvas = body.querySelector('#roCanvas');
      let ctx, W, H, rot = 0, anim = null, bets = {}, spinning = false;
      function refit() { const f = fitCanvas(canvas); ctx = f.ctx; W = f.w; H = f.h; }
      refit();
      const onRes = () => refit();
      addEventListener('resize', onRes); sess.onCleanup(() => removeEventListener('resize', onRes));
      const seg = Math.PI * 2 / 37;
      function drawWheel(rotation, ballA) {
        const cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 8;
        ctx.clearRect(0, 0, W, H);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotation);
        ctx.beginPath(); ctx.arc(0, 0, R, 0, 7); ctx.fillStyle = '#a86e0a'; ctx.fill();
        for (let i = 0; i < 37; i++) {
          const n = RO_ORDER[i], a0 = -Math.PI / 2 + i * seg;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R - 6, a0, a0 + seg); ctx.closePath();
          ctx.fillStyle = n === 0 ? '#0f8f68' : REDS.has(n) ? '#c22445' : '#16122e'; ctx.fill();
          ctx.strokeStyle = '#ffc93c'; ctx.lineWidth = 1; ctx.stroke();
          ctx.save(); ctx.rotate(a0 + seg / 2); ctx.translate(R - 22, 0); ctx.rotate(Math.PI / 2);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Manrope,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(n, 0, 0); ctx.restore();
        }
        ctx.beginPath(); ctx.arc(0, 0, R * .45, 0, 7); ctx.fillStyle = '#1b1b40'; ctx.fill(); ctx.strokeStyle = '#ffc93c'; ctx.lineWidth = 3; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, R * .18, 0, 7); ctx.fillStyle = '#ffc93c'; ctx.fill();
        ctx.restore();
        if (ballA != null) {
          ctx.beginPath(); ctx.arc(cx + Math.cos(ballA) * (R - 14), cy + Math.sin(ballA) * (R - 14), 6, 0, 7);
          ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
        }
        ctx.beginPath(); ctx.moveTo(cx - 9, 2); ctx.lineTo(cx + 9, 2); ctx.lineTo(cx, 18); ctx.closePath(); ctx.fillStyle = '#ffc93c'; ctx.fill();
      }
      function total() { return Object.values(bets).reduce((a, b) => a + b, 0); }
      function refresh() {
        body.querySelector('#roTotal').textContent = money(total());
        spinBtn.disabled = spinning || total() === 0;
        body.querySelectorAll('[data-b]').forEach(el => {
          const amt = bets[el.dataset.b] || 0;
          el.querySelector('.amt')?.remove();
          if (amt) el.appendChild(h(`<span class="amt">${fmt(amt)}</span>`));
        });
      }
      body.querySelector('#roBoard').addEventListener('click', e => {
        const b = e.target.closest('[data-b]'); if (!b || spinning) return;
        const chip = bp.amount();
        if (chip < 1) { toast('Фишка от 1 ₽', 'error'); return; }
        if (total() + chip > S.balance) { toast('Не хватает баланса на фишку', 'error'); return; }
        bets[b.dataset.b] = (bets[b.dataset.b] || 0) + chip;
        sfx.click(); refresh();
      });
      clearBtn.onclick = () => { if (!spinning) { bets = {}; sfx.click(); refresh(); } };
      spinBtn.onclick = () => {
        const t = total();
        if (spinning || !t || !bet(t)) return;
        spinning = true; refresh();
        const idx = Math.floor(float() * 37), n = RO_ORDER[idx];
        const targetRot = rot + Math.PI * 2 * 5 + ((-Math.PI / 2 - (-Math.PI / 2 + idx * seg + seg / 2) - rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        anim = { t0: performance.now(), dur: S.settings.fast ? 1200 : 4200, from: rot, to: targetRot, idx, n };
        sfx.spin();
      };
      sess.loop(now => {
        let ballA = null;
        if (anim) {
          const p = clamp((now - anim.t0) / anim.dur, 0, 1);
          const e = 1 - Math.pow(1 - p, 3);
          rot = anim.from + (anim.to - anim.from) * e;
          ballA = -Math.PI / 2 - (1 - e) * Math.PI * 8;
          if (p >= 1) {
            const n = anim.n; anim = null; spinning = false;
            const numEl = body.querySelector('#roNum');
            numEl.textContent = n;
            numEl.style.background = n === 0 ? '#0f8f68' : REDS.has(n) ? '#c22445' : '#16122e';
            let win = 0;
            RO_BETS.forEach(b => { if (bets[b.id] && b.test(n)) win += bets[b.id] * b.mult; });
            const t = total();
            payout('roulette', t, win / t);
            histChip(body.querySelector('#roHist'), String(n), n === 0 ? 'g' : REDS.has(n) ? 'r' : 'b');
            if (win > 0) toast(`🎡 Выпало ${n} — выигрыш ${money(win)}`, 'success');
            bets = {}; refresh();
          }
        }
        drawWheel(rot, ballA);
      });
      refresh();
    }
  });

  /* ================= SLOTS ================= */
  const SYMBOLS = [['🍋', 30, 2], ['🍒', 25, 3], ['🔔', 18, 5], ['⭐', 12, 8], ['💎', 8, 15], ['7️⃣', 5, 30], ['🐮', 2, 100]];
  const TOT_W = SYMBOLS.reduce((a, s) => a + s[1], 0);
  let evLine = 0;
  SYMBOLS.forEach(([e, w, pay]) => evLine += Math.pow(w / TOT_W, 3) * pay);
  evLine += Math.pow(2 / TOT_W, 2) * (1 - 2 / TOT_W) * 2;
  const PAY_SCALE = .96 / evLine;
  const PAYS = SYMBOLS.map(([e, w, pay]) => [e, Math.max(.5, Math.round(pay * PAY_SCALE * 10) / 10)]);
  function weightedSymbol() { let r = Math.random() * TOT_W; for (const [e, w] of SYMBOLS) { r -= w; if (r <= 0) return e; } return '🍋'; }
  RU.GAMES.push({
    id: 'slots', name: 'Слоты', icon: '🎰', art: 'slots', players: 312, tag: 'HOT', cat: ['hot'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="slSide"></div>
  <div class="col">
    <div class="slots-machine">
      <div class="slots-window">${[0, 1, 2].map(i => `<div class="reel"><div class="reel-strip" data-reel="${i}"></div></div>`).join('')}</div>
      <div class="slots-line-info">5 линий: 3 ряда + 2 диагонали • 🐮🐮 = ×2 линии</div>
    </div>
    <div id="slResult" class="mt12" style="min-height:48px"></div>
    <div class="hist" id="slHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#slSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const spinBtn = h(`<button class="btn gold block lg" id="slSpin">🎰 Крутить</button>`);
      const payBtn = h(`<button class="btn ghost block" id="slPay">📋 Таблица выплат</button>`);
      side.appendChild(spinBtn); side.appendChild(payBtn);
      side.appendChild(h(`<div class="small muted center">Три одинаковых на линии — куш. Корова 🐮 — самый жирный символ.</div>`));
      const strips = [...body.querySelectorAll('.reel-strip')];
      let busy = false;
      function setReel(i, syms, animate, dur) {
        const strip = strips[i];
        if (!animate) { strip.style.transition = 'none'; strip.innerHTML = syms.map(s => `<div class="reel-cell">${s}</div>`).join(''); strip.style.transform = 'translateY(0)'; return; }
        const filler = Array.from({ length: 18 }, weightedSymbol);
        const all = [...filler, ...syms];
        strip.style.transition = 'none';
        strip.innerHTML = all.map(s => `<div class="reel-cell">${s}</div>`).join('');
        strip.style.transform = 'translateY(0)';
        void strip.offsetWidth;
        strip.style.transition = `transform ${dur}s cubic-bezier(.12,.8,.25,1)`;
        strip.style.transform = `translateY(${-18 * 72}px)`;
      }
      [0, 1, 2].forEach(i => setReel(i, ['🐮', '7️⃣', '💎'], false));
      payBtn.onclick = () => {
        modal(`<div class="modal-head"><div class="modal-title">📋 Выплаты (за линию, ставка/5)</div><button class="x-btn" data-x>✕</button></div>
<div class="col">${PAYS.map(([e, p]) => `<div class="row between"><span style="font-size:24px">${e} ${e} ${e}</span><b class="gold-text">×${p}</b></div>`).join('')}
<div class="row between"><span style="font-size:24px">🐮 🐮 ?</span><b class="gold-text">×2</b></div></div>`, false).querySelector('[data-x]').onclick = closeModal;
      };
      spinBtn.onclick = () => {
        if (busy) return;
        const a = bp.amount();
        if (!bet(a)) return;
        busy = true; spinBtn.disabled = true; bp.lock(true);
        body.querySelector('#slResult').innerHTML = '';
        const final = [0, 1, 2].map(() => [0, 1, 2].map(weightedSymbol));
        const base = S.settings.fast ? .4 : 1.15;
        [0, 1, 2].forEach(i => setReel(i, final[i], true, base + i * (S.settings.fast ? .15 : .45)));
        sfx.spin();
        const tickIv = sess.every(110, () => sfx.tick());
        const totalDur = (base + 2 * (S.settings.fast ? .15 : .45)) * 1000 + 150;
        sess.after(totalDur, () => {
          clearInterval(tickIv);
          const lines = [
            [final[0][0], final[1][0], final[2][0]],
            [final[0][1], final[1][1], final[2][1]],
            [final[0][2], final[1][2], final[2][2]],
            [final[0][0], final[1][1], final[2][2]],
            [final[0][2], final[1][1], final[2][0]]
          ];
          let winMult = 0; const winLines = [];
          lines.forEach((ln, li) => {
            if (ln[0] === ln[1] && ln[1] === ln[2]) { const p = PAYS.find(x => x[0] === ln[0])[1]; winMult += p / 5; winLines.push(li); }
            else if (ln[0] === '🐮' && ln[1] === '🐮') { winMult += 2 / 5; winLines.push(li); }
          });
          if (winLines.length) {
            winLines.forEach(li => {
              const cells = li < 3 ? [0, 1, 2].map(r => strips[r].children[18 + li]) : li === 3 ? [strips[0].children[18], strips[1].children[19], strips[2].children[20]] : [strips[0].children[20], strips[1].children[19], strips[2].children[18]];
              cells.forEach(c => c && c.classList.add('win'));
            });
          }
          const win = payout('slots', a, winMult);
          const res = body.querySelector('#slResult');
          if (winMult > 0) {
            res.innerHTML = `<div class="result-banner win">🎰 ${winLines.length} лин${winLines.length === 1 ? 'ия' : 'ии'}! +${money(win)} (${multFmt(winMult)})</div>`;
            histChip(body.querySelector('#slHist'), multFmt(winMult), winMult >= 5 ? 'y' : 'g');
          } else {
            res.innerHTML = `<div class="result-banner lose">Мимо. Крути ещё 🐮</div>`;
            histChip(body.querySelector('#slHist'), '✕', 'r');
          }
          busy = false; spinBtn.disabled = false; bp.lock(false);
        });
      };
    }
  });

  /* ================= BLACKJACK ================= */
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANK_L = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  function cardEl(c, hidden) {
    if (hidden) return `<div class="pcard back"></div>`;
    const red = c.s === 1 || c.s === 2;
    return `<div class="pcard ${red ? 'red' : ''}"><span class="r1">${RANK_L[c.r]}<br>${SUITS[c.s]}</span><span class="suit">${SUITS[c.s]}</span><span class="r2">${RANK_L[c.r]}<br>${SUITS[c.s]}</span></div>`;
  }
  function handVal(hand) {
    let v = 0, aces = 0;
    hand.forEach(c => { if (c.r === 1) { aces++; v += 11; } else v += Math.min(10, c.r); });
    while (v > 21 && aces) { v -= 10; aces--; }
    return v;
  }
  RU.GAMES.push({
    id: 'blackjack', name: 'Блэкджек', icon: '🃏', art: 'blackjack', players: 146, cat: ['cards'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="bjSide"></div>
  <div class="col">
    <div class="stage" style="padding:18px">
      <div class="row between"><span class="lbl">Дилер</span><span class="hand-score" id="bjDScore">–</span></div>
      <div class="hand mt8" id="bjDealer"></div>
      <div class="row between mt20"><span class="lbl">Ты</span><span class="hand-score" id="bjPScore">–</span></div>
      <div class="hand mt8" id="bjPlayer"></div>
    </div>
    <div id="bjResult" class="mt12" style="min-height:48px"></div>
  </div>
</div>`;
      const side = body.querySelector('#bjSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const dealBtn = h(`<button class="btn gold block lg" id="bjDeal">🃏 Сдать</button>`);
      const actRow = h(`<div class="row hidden" id="bjActs"><button class="btn violet block" id="bjHit">Ещё</button><button class="btn green block" id="bjStand">Хватит</button><button class="btn ghost block" id="bjDouble">×2</button></div>`);
      side.appendChild(dealBtn); side.appendChild(actRow);
      side.appendChild(h(`<div class="small muted center">Блэкджек платит ×2.5. Дилер берёт до 17. Удвоение — одна карта и стоп.</div>`));
      let shoe = [], player = [], dealer = [], betAmt = 0, phase = 'idle';
      function newShoe() {
        shoe = [];
        for (let d = 0; d < 6; d++) for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) shoe.push({ r, s });
        const fs = floats(shoe.length);
        for (let i = shoe.length - 1; i > 0; i--) { const j = Math.floor(fs[i] * (i + 1)); [shoe[i], shoe[j]] = [shoe[j], shoe[i]]; }
      }
      newShoe();
      const draw = () => { if (shoe.length < 20) newShoe(); return shoe.pop(); };
      function render(hideDealer) {
        body.querySelector('#bjDealer').innerHTML = dealer.map((c, i) => cardEl(c, hideDealer && i === 1)).join('');
        body.querySelector('#bjPlayer').innerHTML = player.map(c => cardEl(c)).join('');
        body.querySelector('#bjPScore').textContent = player.length ? handVal(player) : '–';
        body.querySelector('#bjDScore').textContent = dealer.length ? (hideDealer ? handVal([dealer[0]]) + ' + ?' : handVal(dealer)) : '–';
      }
      function setActs(on) {
        actRow.classList.toggle('hidden', !on);
        dealBtn.classList.toggle('hidden', on);
        body.querySelector('#bjDouble').disabled = player.length !== 2 || S.balance < betAmt;
      }
      function finish(mult, msg, push) {
        phase = 'idle'; setActs(false); bp.lock(false);
        render(false);
        payout('blackjack', betAmt, mult, { push });
        const res = body.querySelector('#bjResult');
        res.innerHTML = `<div class="result-banner ${push ? 'push' : mult > 0 ? 'win' : 'lose'}">${msg}</div>`;
        dealBtn.textContent = '🃏 Ещё раз';
      }
      function dealerTurn() {
        phase = 'dealer'; setActs(false); render(false);
        sfx.card();
        const step = () => {
          if (handVal(dealer) < 17) { dealer.push(draw()); sfx.card(); render(false); sess.after(550, step); }
          else {
            const pv = handVal(player), dv = handVal(dealer);
            if (dv > 21) finish(2, `Дилер перебрал (${dv})! +${money(betAmt * 2)}`);
            else if (pv > dv) finish(2, `${pv} против ${dv} — победа! +${money(betAmt * 2)}`);
            else if (pv < dv) finish(0, `${pv} против ${dv} — дилер забрал`);
            else finish(1, `Ничья ${pv}:${dv} — ставка возвращена`, true);
          }
        };
        sess.after(600, step);
      }
      dealBtn.onclick = () => {
        if (phase !== 'idle') return;
        const a = bp.amount();
        if (!bet(a)) return;
        betAmt = a; bp.lock(true);
        player = [draw(), draw()]; dealer = [draw(), draw()];
        phase = 'player';
        body.querySelector('#bjResult').innerHTML = '';
        render(true); setActs(true); sfx.card();
        const pv = handVal(player), dv = handVal(dealer);
        if (pv === 21 || dv === 21) {
          sess.after(700, () => {
            if (pv === 21 && dv === 21) finish(1, 'Оба блэкджека — ничья', true);
            else if (pv === 21) finish(2.5, `БЛЭКДЖЕК! 🃏 +${money(betAmt * 2.5)}`);
            else finish(0, 'У дилера блэкджек 🃏');
          });
        }
      };
      body.querySelector('#bjHit').onclick = () => {
        if (phase !== 'player') return;
        player.push(draw()); sfx.card(); render(true);
        body.querySelector('#bjDouble').disabled = true;
        const v = handVal(player);
        if (v > 21) sess.after(450, () => finish(0, `Перебор (${v}) 💥`));
        else if (v === 21) dealerTurn();
      };
      body.querySelector('#bjStand').onclick = () => { if (phase === 'player') dealerTurn(); };
      body.querySelector('#bjDouble').onclick = () => {
        if (phase !== 'player' || player.length !== 2) return;
        if (!bet(betAmt)) return;
        betAmt *= 2;
        player.push(draw()); sfx.card(); render(true);
        const v = handVal(player);
        if (v > 21) sess.after(450, () => finish(0, `Перебор на удвоении (${v}) 💥`));
        else dealerTurn();
      };
    }
  });

  /* ================= DICE ================= */
  RU.GAMES.push({
    id: 'dice', name: 'Кости', icon: '🎲', art: 'dice', players: 167, cat: ['fast'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="dcSide"></div>
  <div class="col">
    <div class="stage" style="padding:26px 20px">
      <div class="center"><div class="storm-num" id="dcNum" style="font-size:46px">50.00</div><div class="small muted" id="dcMsg">Крути кости — попади в свою зону</div></div>
      <div class="dice-track"><div class="dice-marker" id="dcMarker" style="left:50%">50.00</div><input type="range" id="dcSlider" min="2" max="98" value="50" style="position:absolute;left:0;right:0;top:14px"></div>
      <div class="row between tiny muted"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    </div>
    <div class="hist" id="dcHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#dcSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const modeWrap = h(`<div class="betpanel"><div class="lbl">Режим</div><div class="chiprow" id="dcMode"><button class="chip active" data-m="over">Больше</button><button class="chip" data-m="under">Меньше</button></div><div class="statline mt8"><span>Шанс</span><b id="dcCh">50%</b></div><div class="statline"><span>Множитель</span><b class="gold-text" id="dcMult">×1.94</b></div><div class="statline"><span>Выигрыш</span><b class="green-text" id="dcWin">194 ₽</b></div></div>`);
      side.appendChild(modeWrap);
      const go = h(`<button class="btn gold block lg" id="dcGo">🎲 Бросить</button>`);
      side.appendChild(go);
      const slider = body.querySelector('#dcSlider');
      let mode = 'over', busy = false;
      const target = () => +slider.value;
      const chance = () => mode === 'over' ? (100 - target()) / 100 : target() / 100;
      function refresh() {
        const c = chance(), m = .97 / c;
        slider.style.setProperty('--fill', target() + '%');
        slider.style.background = mode === 'over'
          ? `linear-gradient(90deg,var(--red) ${target()}%,var(--green) ${target()}%)`
          : `linear-gradient(90deg,var(--green) ${target()}%,var(--red) ${target()}%)`;
        modeWrap.querySelector('#dcCh').textContent = (c * 100).toFixed(0) + '%';
        modeWrap.querySelector('#dcMult').textContent = '×' + m.toFixed(4);
        modeWrap.querySelector('#dcWin').textContent = money(bp.amount() * m);
      }
      slider.addEventListener('input', refresh);
      bp.input.addEventListener('input', refresh);
      modeWrap.querySelector('#dcMode').addEventListener('click', e => {
        const b = e.target.closest('[data-m]'); if (!b) return;
        mode = b.dataset.m; sfx.click();
        modeWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        refresh();
      });
      go.onclick = () => {
        if (busy) return;
        const a = bp.amount();
        if (!bet(a)) return;
        busy = true; go.disabled = true;
        const r = Math.round(float() * 10000) / 100;
        const c = chance(), m = .97 / c;
        const win = mode === 'over' ? r > target() : r < target();
        const num = body.querySelector('#dcNum'), marker = body.querySelector('#dcMarker');
        marker.classList.remove('win', 'lose');
        sfx.spin();
        const dur = S.settings.fast ? 250 : 650, t0 = performance.now();
        const iv = sess.every(40, () => {
          const p = clamp((performance.now() - t0) / dur, 0, 1);
          const shown = p < 1 ? Math.random() * 100 : r;
          num.textContent = shown.toFixed(2);
          marker.style.left = clamp(shown, 2, 98) + '%';
          marker.textContent = shown.toFixed(2);
          if (p >= 1) {
            clearInterval(iv);
            marker.classList.add(win ? 'win' : 'lose');
            num.style.color = win ? 'var(--green)' : 'var(--red)';
            body.querySelector('#dcMsg').textContent = win ? `Попал! ${r.toFixed(2)} ${mode === 'over' ? '>' : '<'} ${target()}` : `Мимо: ${r.toFixed(2)}`;
            payout('dice', a, win ? m : 0);
            histChip(body.querySelector('#dcHist'), r.toFixed(2), win ? 'g' : 'r');
            busy = false; go.disabled = false;
            sess.after(900, () => { num.style.color = ''; });
          }
        });
      };
      refresh();
    }
  });

  /* ================= WHEEL ================= */
  const WHEEL_CFG = {
    low: { label: 'Низкий', vals: [1.9, 0, 1.9, 0, 1.9, 0, 1.9, 0, 1.9, 0, 1.9, 0] },
    med: { label: 'Средний', vals: [0, 0, 2.9, 0, 0, 0, 8.6, 0, 0, 0, 0, 0] },
    high: { label: 'Высокий', vals: [0, 0, 0, 0, 0, 0, 11.5, 0, 0, 0, 0, 0] }
  };
  RU.GAMES.push({
    id: 'wheel', name: 'Колесо', icon: '🎯', art: 'wheel', players: 121, cat: ['fast'], isNew: true,
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="whSide"></div>
  <div class="col">
    <div class="stage" style="padding:24px">
      <div class="fwheel-wrap"><div class="fwheel-pointer">🔻</div><div class="fwheel" id="whWheel"></div><div class="fwheel-cap">🐮</div></div>
      <div id="whResult" class="mt16" style="min-height:48px"></div>
    </div>
    <div class="hist" id="whHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#whSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      let risk = 'low', rot = 0, busy = false;
      const riskWrap = h(`<div class="betpanel"><div class="lbl">Риск</div><div class="chiprow" id="whRisk">${Object.entries(WHEEL_CFG).map(([k, v]) => `<button class="chip ${k === 'low' ? 'active' : ''}" data-k="${k}">${v.label}</button>`).join('')}</div><div class="statline mt8"><span>Макс. множитель</span><b class="gold-text" id="whMax">×1.9</b></div></div>`);
      side.appendChild(riskWrap);
      const go = h(`<button class="btn gold block lg" id="whGo">🎯 Крутить колесо</button>`);
      side.appendChild(go);
      side.appendChild(h(`<div class="small muted center">Низкий риск — частые мелкие победы. Высокий — один сектор ×11.5 из двенадцати.</div>`));
      const wheel = body.querySelector('#whWheel');
      function segColor(v) { return v === 0 ? '#22224d' : v >= 8 ? '#ff4d6b' : v >= 2 ? '#ff4fd8' : '#ffc93c'; }
      function buildWheel() {
        const vals = WHEEL_CFG[risk].vals;
        wheel.style.background = `conic-gradient(${vals.map((v, i) => `${segColor(v)} ${i * 30}deg ${(i + 1) * 30}deg`).join(',')})`;
        wheel.innerHTML = vals.map((v, i) => `<span class="fwheel-lbl" style="transform:rotate(${i * 30 + 15}deg) translateY(-118px);${v === 0 ? 'opacity:.4' : ''}">${v === 0 ? '0' : '×' + v}</span>`).join('');
        riskWrap.querySelector('#whMax').textContent = '×' + Math.max(...vals);
      }
      riskWrap.querySelector('#whRisk').addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b || busy) return;
        risk = b.dataset.k; sfx.click();
        riskWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        buildWheel();
      });
      go.onclick = () => {
        if (busy) return;
        const a = bp.amount();
        if (!bet(a)) return;
        busy = true; go.disabled = true; bp.lock(true);
        body.querySelector('#whResult').innerHTML = '';
        const vals = WHEEL_CFG[risk].vals;
        const idx = Math.floor(float() * vals.length);
        const v = vals[idx];
        const target = 360 * 5 - (idx * 30 + 15);
        rot += 360 * 5 + ((target - (rot % 360)) + 360) % 360;
        wheel.style.transform = `rotate(${rot}deg)`;
        sfx.spin();
        const tickIv = sess.every(130, () => sfx.tick());
        sess.after(S.settings.fast ? 1000 : 4400, () => {
          clearInterval(tickIv);
          const res = body.querySelector('#whResult');
          if (v > 0) {
            payout('wheel', a, v);
            res.innerHTML = `<div class="result-banner win">🎯 Сектор ×${v}! +${money(a * v)}</div>`;
            histChip(body.querySelector('#whHist'), '×' + v, v >= 5 ? 'y' : 'g');
          } else {
            payout('wheel', a, 0);
            res.innerHTML = `<div class="result-banner lose">Пустой сектор 🐮</div>`;
            histChip(body.querySelector('#whHist'), '0', 'r');
          }
          busy = false; go.disabled = false; bp.lock(false);
        });
      };
      buildWheel();
    }
  });

  /* ================= COINFLIP ================= */
  RU.GAMES.push({
    id: 'coin', name: 'Монетка', icon: '🪙', art: 'coin', players: 98, cat: ['fast'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="cfSide"></div>
  <div class="col">
    <div class="stage center" style="padding:24px">
      <div class="coin3d"><div class="coin-inner" id="cfCoin"><div class="coin-face h">🐮</div><div class="coin-face t">₽</div></div></div>
      <div class="small muted" id="cfMsg">Орёл (корова) или решка (рубль)?</div>
      <div id="cfResult" class="mt12" style="min-height:48px"></div>
    </div>
    <div class="hist" id="cfHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#cfSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      let pick = 'h', rot = 0, busy = false, streak = 0;
      const pickWrap = h(`<div class="betpanel"><div class="lbl">Твой выбор</div><div class="chiprow" id="cfPick"><button class="chip active" data-p="h">🐮 Орёл</button><button class="chip" data-p="t">₽ Решка</button></div><div class="statline mt8"><span>Выигрыш</span><b class="gold-text">×1.94</b></div><div class="statline"><span>Серия побед</span><b id="cfStreak">0</b></div></div>`);
      side.appendChild(pickWrap);
      const go = h(`<button class="btn gold block lg" id="cfGo">🪙 Подбросить</button>`);
      side.appendChild(go);
      pickWrap.querySelector('#cfPick').addEventListener('click', e => {
        const b = e.target.closest('[data-p]'); if (!b || busy) return;
        pick = b.dataset.p; sfx.click();
        pickWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
      });
      go.onclick = () => {
        if (busy) return;
        const a = bp.amount();
        if (!bet(a)) return;
        busy = true; go.disabled = true; bp.lock(true);
        body.querySelector('#cfResult').innerHTML = '';
        const res = float() < .5 ? 'h' : 't';
        const win = res === pick;
        const targetA = res === 'h' ? 0 : 180;
        rot += 1800 + ((targetA - (rot % 360)) + 360) % 360;
        body.querySelector('#cfCoin').style.transform = `rotateY(${rot}deg)`;
        sfx.spin();
        sess.after(S.settings.fast ? 600 : 1850, () => {
          const out = body.querySelector('#cfResult');
          body.querySelector('#cfMsg').textContent = res === 'h' ? 'Выпал орёл 🐮' : 'Выпала решка ₽';
          if (win) {
            streak++;
            payout('coin', a, 1.94);
            out.innerHTML = `<div class="result-banner win">Угадал! +${money(a * 1.94)}</div>`;
            histChip(body.querySelector('#cfHist'), res === 'h' ? '🐮' : '₽', 'g');
          } else {
            streak = 0;
            payout('coin', a, 0);
            out.innerHTML = `<div class="result-banner lose">Не угадал 🐮</div>`;
            histChip(body.querySelector('#cfHist'), res === 'h' ? '🐮' : '₽', 'r');
          }
          pickWrap.querySelector('#cfStreak').textContent = streak;
          busy = false; go.disabled = false; bp.lock(false);
        });
      };
    }
  });

  /* ================= HI-LO ================= */
  RU.GAMES.push({
    id: 'hilo', name: 'Хай-Лоу', icon: '🔺', art: 'hilo', players: 74, tag: 'NEW', cat: ['cards', 'fast'], isNew: true,
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="hlSide"></div>
  <div class="col">
    <div class="stage center" style="padding:24px">
      <div class="hand" style="justify-content:center" id="hlCard"></div>
      <div class="small muted mt12" id="hlMsg">Следующая карта выше или ниже?</div>
      <div class="storm-num mt8" id="hlMult" style="font-size:30px">×1.00</div>
      <div id="hlResult" class="mt12" style="min-height:48px"></div>
    </div>
    <div class="hist" id="hlHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#hlSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const startBtn = h(`<button class="btn gold block lg" id="hlStart">🔺 Начать</button>`);
      const actWrap = h(`<div class="col hidden" id="hlActs"><div class="row"><button class="btn green block" id="hlHi">⬆️ Выше <span id="hlHiM"></span></button><button class="btn red block" id="hlLo">⬇️ Ниже <span id="hlLoM"></span></button></div><div class="row"><button class="btn ghost block" id="hlSkip">⏭️ Пропустить</button><button class="btn violet block" id="hlCash">Забрать</button></div></div>`);
      side.appendChild(startBtn); side.appendChild(actWrap);
      side.appendChild(h(`<div class="small muted center">Угадал направление — множитель растёт. Ничья считается победой. Забирай до ошибки.</div>`));
      let active = false, rank = 0, suit = 0, mult = 1, betAmt = 0, busy = false;
      const hiMult = () => .97 * 13 / (14 - rank);
      const loMult = () => .97 * 13 / rank;
      function showCard() {
        body.querySelector('#hlCard').innerHTML = cardEl({ r: rank, s: suit });
        body.querySelector('#hlMult').textContent = multFmt(mult);
        actWrap.querySelector('#hlHiM').textContent = '×' + hiMult().toFixed(2);
        actWrap.querySelector('#hlLoM').textContent = '×' + loMult().toFixed(2);
        actWrap.querySelector('#hlCash').textContent = `Забрать ${money(betAmt * mult)}`;
      }
      function newCard() { rank = 1 + Math.floor(float() * 13); suit = Math.floor(Math.random() * 4); }
      function end(winMult, msg) {
        active = false;
        actWrap.classList.add('hidden'); startBtn.classList.remove('hidden');
        startBtn.textContent = '🔺 Ещё раз'; bp.lock(false);
        const res = body.querySelector('#hlResult');
        if (winMult > 0) { payout('hilo', betAmt, winMult); res.innerHTML = `<div class="result-banner win">${msg} +${money(betAmt * winMult)}</div>`; }
        else { payout('hilo', betAmt, 0); res.innerHTML = `<div class="result-banner lose">${msg}</div>`; }
      }
      startBtn.onclick = () => {
        if (active) return;
        const a = bp.amount();
        if (!bet(a)) return;
        betAmt = a; mult = 1; active = true;
        newCard(); showCard(); sfx.card();
        bp.lock(true);
        startBtn.classList.add('hidden'); actWrap.classList.remove('hidden');
        body.querySelector('#hlResult').innerHTML = '';
        body.querySelector('#hlMsg').textContent = 'Следующая карта выше или ниже?';
      };
      function guess(dir) {
        if (!active || busy) return;
        busy = true;
        const old = rank;
        newCard(); showCard(); sfx.card();
        const win = dir === 'hi' ? rank >= old : rank <= old;
        sess.after(350, () => {
          busy = false;
          if (win) {
            mult *= dir === 'hi' ? .97 * 13 / (14 - old) : .97 * 13 / old;
            showCard(); sfx.coin();
            histChip(body.querySelector('#hlHist'), RANK_L[rank], 'g');
            body.querySelector('#hlMsg').textContent = `Верно! ${RANK_L[old]} → ${RANK_L[rank]}`;
          } else {
            histChip(body.querySelector('#hlHist'), RANK_L[rank], 'r');
            end(0, `Ошибка: ${RANK_L[old]} → ${RANK_L[rank]} 💥`);
          }
        });
      }
      actWrap.querySelector('#hlHi').onclick = () => guess('hi');
      actWrap.querySelector('#hlLo').onclick = () => guess('lo');
      actWrap.querySelector('#hlSkip').onclick = () => { if (active && !busy) { newCard(); showCard(); sfx.card(); } };
      actWrap.querySelector('#hlCash').onclick = () => { if (active && !busy) end(mult, `Забрал на ${multFmt(mult)}`); };
    }
  });

  RU.boot();
})();