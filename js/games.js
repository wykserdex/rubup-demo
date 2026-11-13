'use strict';
/* Games part 1: crash (Ракетка/Рейс), Апгрейд, Шторм, Коровка, Мины, Плинко */
(() => {
  const { h, esc, fmt, money, multFmt, clamp, float, floats, bet, payout, sfx, toast, betPanel, fitCanvas, histChip, S } = RU;

  /* ================= CRASH ================= */
  function crashMount(theme) {
    return function (body, sess) {
      const id = theme.id;
      body.innerHTML = `
<div class="game-layout rev">
  <div class="col">
    <div class="stage" id="crStage" style="min-height:380px"><canvas id="crCanvas" style="position:absolute;inset:0"></canvas>
      <div class="big-mult"><div class="m" id="crMult">×1.00</div><div class="s" id="crStatus">Ставки открыты</div></div>
    </div>
    <div class="hist" id="crHist"></div>
    <div class="panel"><div class="lbl">Игроки раунда</div><div class="crash-players" id="crPlayers"></div></div>
  </div>
  <div class="col" id="crSide"></div>
</div>`;
      const side = body.querySelector('#crSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const autoWrap = h(`<div class="betpanel"><div class="lbl">Авто-вывод (0 = выкл)</div><input class="inp" id="crAuto" type="number" step="0.1" min="0" value="2.00"><div class="statline mt8"><span>Возможный выигрыш</span><b id="crPot">—</b></div></div>`);
      side.appendChild(autoWrap);
      const action = h(`<button class="btn violet block lg" id="crAction">Поставить</button>`);
      side.appendChild(action);
      const hint = h(`<div class="small muted center">Ставки принимаются до старта. Забери выигрыш до того, как ${theme.verb}!</div>`);
      side.appendChild(hint);

      const canvas = body.querySelector('#crCanvas'), stage = body.querySelector('#crStage');
      const multEl = body.querySelector('#crMult'), statusEl = body.querySelector('#crStatus');
      const playersEl = body.querySelector('#crPlayers'), histEl = body.querySelector('#crHist');
      const autoInp = autoWrap.querySelector('#crAuto'), potEl = autoWrap.querySelector('#crPot');
      let ctx, W, H, stars = [], clouds = [];
      function refit() {
        const f = fitCanvas(canvas); ctx = f.ctx; W = f.w; H = f.h;
        stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + .5, p: Math.random() * 6 }));
        clouds = Array.from({ length: 6 }, () => ({ x: Math.random() * W, y: Math.random() * H * .7, s: Math.random() * 40 + 30, v: Math.random() * .3 + .1 }));
      }
      refit();
      const onRes = () => refit();
      addEventListener('resize', onRes); sess.onCleanup(() => removeEventListener('resize', onRes));

      let phase = 'betting', phaseEnd = performance.now() + 6000, flightStart = 0, crashAt = 2, m = 1;
      let placed = false, betAmt = 0, cashed = false, simPlayers = [], boomParts = [];

      function genPlayers() {
        const n = 4 + Math.floor(Math.random() * 4);
        simPlayers = Array.from({ length: n }, () => ({
          name: RU.NAMES[Math.floor(Math.random() * RU.NAMES.length)],
          ava: RU.AVAS[Math.floor(Math.random() * RU.AVAS.length)],
          bet: [50, 100, 200, 500, 1000][Math.floor(Math.random() * 5)],
          target: Math.round((1.2 + Math.exp(Math.random() * 2.2)) * 100) / 100,
          done: false, lost: false
        }));
        renderPlayers();
      }
      function renderPlayers() {
        playersEl.innerHTML = simPlayers.map(p => `<div class="cp-row"><span>${p.ava}</span><span class="n">${esc(p.name)}</span><span class="muted">${fmt(p.bet)} ₽</span>${p.done ? `<span class="w">×${p.target.toFixed(2)} ✓</span>` : p.lost ? '<span class="l">💥</span>' : '<span class="muted">…</span>'}</div>`).join('');
      }
      function potUpdate() {
        const a = parseFloat(autoInp.value) || 0;
        potEl.textContent = placed && a > 1 ? money(betAmt * a) : '—';
      }
      autoInp.addEventListener('input', potUpdate);
      function setAction() {
        if (phase === 'betting') {
          action.disabled = false;
          if (!placed) { action.className = 'btn violet block lg'; action.textContent = `🚀 Поставить ${fmt(bp.amount())} ₽`; }
          else { action.className = 'btn ghost block lg'; action.textContent = 'Отменить ставку'; }
        } else if (phase === 'flying') {
          if (placed && !cashed) { action.disabled = false; action.className = 'btn green block lg'; action.textContent = `Забрать ${multFmt(m)} • ${money(betAmt * m)}`; }
          else { action.disabled = true; action.className = 'btn ghost block lg'; action.textContent = cashed ? 'Забрано ✓' : 'Ждём следующий раунд'; }
        } else { action.disabled = true; action.className = 'btn ghost block lg'; action.textContent = 'Раунд завершён'; }
      }
      bp.input.addEventListener('input', () => { if (phase === 'betting' && !placed) setAction(); });
      function place() {
        const a = bp.amount();
        if (!bet(a)) return;
        placed = true; betAmt = a; bp.lock(true); potUpdate(); setAction();
      }
      function cancel() {
        S.balance = Math.round((S.balance + betAmt) * 100) / 100;
        S.stats.bets--; S.stats.wagered -= betAmt; RU.save(); RU.$('#balVal').textContent = fmt(S.balance);
        placed = false; betAmt = 0; bp.lock(false); potUpdate(); setAction(); sfx.click();
      }
      function cashout(atM) {
        if (!placed || cashed || phase !== 'flying') return;
        cashed = true;
        payout(id, betAmt, atM);
        sfx.cash(); setAction();
      }
      action.onclick = () => {
        if (phase === 'betting') { placed ? cancel() : place(); }
        else if (phase === 'flying' && placed && !cashed) cashout(m);
      };
      function startFlight(now) {
        const r = float();
        crashAt = r < .03 ? 1.00 : Math.max(1.01, Math.min(1000, Math.floor(.97 / (1 - r) * 100) / 100));
        flightStart = now; phase = 'flying'; m = 1;
        multEl.style.color = ''; statusEl.textContent = theme.flyWord;
        sfx.spin(); toneTakeoff();
      }
      function toneTakeoff() { sfx.hop(); }
      function doCrash(now) {
        phase = 'crashed'; phaseEnd = now + 3200; m = crashAt;
        multEl.style.color = 'var(--red)'; multEl.textContent = multFmt(crashAt);
        statusEl.textContent = theme.crashWord;
        histChip(histEl, multFmt(crashAt), crashAt >= 2 ? 'g' : 'r');
        simPlayers.forEach(p => { if (!p.done) p.lost = true; }); renderPlayers();
        if (placed && !cashed) { payout(id, betAmt, 0); }
        sfx.boom();
        stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake');
        const head = rocketPos();
        boomParts = Array.from({ length: 30 }, () => ({ x: head.x, y: head.y, vx: (Math.random() - .5) * 9, vy: (Math.random() - .5) * 9 - 2, l: 1, c: ['#ffc93c', '#ff9f1c', '#ff4d6b', '#fff'][Math.floor(Math.random() * 4)] }));
        setAction();
      }
      function resetRound(now) {
        phase = 'betting'; phaseEnd = now + 6000; placed = false; cashed = false; betAmt = 0; m = 1;
        bp.lock(false); multEl.style.color = ''; multEl.textContent = '×1.00';
        genPlayers(); potUpdate(); setAction();
      }
      function rocketPos() {
        const pad = 44;
        if (phase === 'betting') return { x: pad, y: H - pad - Math.sin(performance.now() / 400) * 5, a: -.5 };
        const el = (performance.now() - flightStart) / 1000;
        const maxT = Math.max(el, Math.log(2) / .12);
        const maxM = Math.max(2, m * 1.12);
        const x = pad + (el / maxT) * (W - pad * 1.6);
        const y = H - pad - (Math.log(Math.max(1, m)) / Math.log(maxM)) * (H - pad * 1.8);
        const a = Math.atan2(-Math.log(Math.max(1.01, m)) * .9, el + .5);
        return { x: clamp(x, pad, W - 30), y: clamp(y, 40, H - pad), a: clamp(a, -1.1, 0) };
      }
      function draw(now) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        if (theme.sky) { g.addColorStop(0, '#2b1f60'); g.addColorStop(.6, '#7c3aed'); g.addColorStop(1, '#ff9f1c'); }
        else { g.addColorStop(0, '#0a0a20'); g.addColorStop(1, '#1a1245'); }
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        if (theme.sky) {
          ctx.fillStyle = 'rgba(255,233,214,.8)';
          clouds.forEach(c => { c.x -= c.v; if (c.x < -c.s * 2) c.x = W + c.s; ctx.beginPath(); ctx.ellipse(c.x, c.y, c.s, c.s * .38, 0, 0, 7); ctx.ellipse(c.x + c.s * .7, c.y + 6, c.s * .7, c.s * .3, 0, 0, 7); ctx.fill(); });
          ctx.fillStyle = 'rgba(255,240,189,.9)'; ctx.beginPath(); ctx.arc(W * .78, H * .3, 34, 0, 7); ctx.fill();
        } else {
          stars.forEach(s => { ctx.globalAlpha = .4 + .6 * Math.abs(Math.sin(now / 500 + s.p)); ctx.fillStyle = '#fff'; ctx.fillRect(s.x, s.y, s.r, s.r); });
          ctx.globalAlpha = 1;
        }
        // grid
        ctx.strokeStyle = 'rgba(124,92,255,.12)'; ctx.lineWidth = 1;
        for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, H * i / 5); ctx.lineTo(W, H * i / 5); ctx.stroke(); }
        const pos = rocketPos();
        if (phase !== 'betting') {
          const el = (now - flightStart) / 1000;
          ctx.beginPath();
          const pad = 44, maxT = Math.max(el, Math.log(2) / .12), maxM = Math.max(2, m * 1.12);
          for (let i = 0; i <= 40; i++) {
            const tt = el * i / 40, mm = Math.exp(.12 * tt);
            const x = pad + (tt / maxT) * (W - pad * 1.6);
            const y = H - pad - (Math.log(mm) / Math.log(maxM)) * (H - pad * 1.8);
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.strokeStyle = theme.accent; ctx.lineWidth = 3.5; ctx.shadowColor = theme.accent; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0;
          ctx.lineTo(pos.x, H - pad); ctx.lineTo(pad, H - pad); ctx.closePath();
          ctx.fillStyle = theme.accent + '22'; ctx.fill();
        }
        // rocket / plane
        ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(phase === 'crashed' ? 0 : pos.a);
        ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (phase === 'crashed') { ctx.globalAlpha = Math.max(0, (phaseEnd - now) / 3200); ctx.fillText('💥', 0, 0); }
        else { ctx.fillText(theme.emoji, 0, 0); if (theme.rider) { ctx.font = '24px serif'; ctx.fillText(theme.rider, -2, -26); } }
        ctx.restore(); ctx.globalAlpha = 1;
        boomParts = boomParts.filter(p => p.l > 0);
        boomParts.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .18; p.l -= .025; ctx.globalAlpha = Math.max(0, p.l); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4); });
        ctx.globalAlpha = 1;
      }
      genPlayers(); setAction(); potUpdate();
      sess.loop(now => {
        if (phase === 'betting') {
          statusEl.textContent = `Старт через ${Math.max(0, (phaseEnd - now) / 1000).toFixed(1)} с`;
          if (now >= phaseEnd) startFlight(now);
        } else if (phase === 'flying') {
          m = Math.exp(.12 * (now - flightStart) / 1000);
          if (m >= crashAt) { doCrash(now); }
          else {
            multEl.textContent = multFmt(m);
            const a = parseFloat(autoInp.value) || 0;
            if (placed && !cashed && a > 1 && m >= a) cashout(a);
            let changed = false;
            simPlayers.forEach(p => { if (!p.done && m >= p.target) { p.done = true; changed = true; } });
            if (changed) renderPlayers();
            if (placed && !cashed) setAction();
          }
        } else if (phase === 'crashed' && now >= phaseEnd) resetRound(now);
        draw(now);
      });
    };
  }
  RU.GAMES.push(
    { id: 'rocket', name: 'Ракетка', icon: '🚀', art: 'rocket', players: 425, tag: 'HOT', cat: ['hot'], mount: crashMount({ id: 'rocket', emoji: '🚀', rider: '🐮', accent: '#7c5cff', sky: false, verb: 'ракета взорвётся', flyWord: 'Летим! Забирай вовремя', crashWord: 'Ракета взорвалась 💥' }) },
    { id: 'flight', name: 'Рейс', icon: '✈️', art: 'flight', players: 88, cat: [], mount: crashMount({ id: 'flight', emoji: '✈️', rider: '🎁', accent: '#ff9f1c', sky: true, verb: 'самолет улетит', flyWord: 'Рейс выполняется!', crashWord: 'Самолёт скрылся в облаках ☁️' }) }
  );

  /* ================= UPGRADE (money + items/skins) ================= */
  const upRar = v => v < 50 ? 0 : v < 200 ? 1 : v < 1000 ? 2 : v < 10000 ? 3 : 4;
  const upCat = list => list.map(([name, emoji, value]) => ({ name, emoji, value, rar: upRar(value) }));
  const UP_GIFTS = upCat([['Сено', '🌾', 15], ['Молоко', '🥛', 30], ['Колокольчик', '🔔', 70], ['Клевер', '🍀', 180], ['Подарок', '🎁', 450], ['Кубок', '🏆', 900], ['Кольцо', '💍', 2000], ['Алмаз', '💎', 5000], ['Корона', '👑', 15000], ['Ракета', '🚀', 40000]]);
  const UP_SKINS = upCat([['USP-S', '🔫', 60], ['Glock-18', '🔫', 90], ['P250', '🔫', 140], ['MP9', '🔫', 220], ['UMP-45', '🔫', 350], ['AK-47', '🔫', 700], ['M4A4', '🔫', 1100], ['AWP', '🔫', 2200], ['Нож-бабочка', '🦋', 5200], ['Керамбит', '🗡️', 9000], ['Перчатки', '🧤', 15000], ['Драгон Лор', '🐉', 40000], ['Вой-хаул', '🐺', 90000]]);
  RU.GAMES.push({
    id: 'upgrade', name: 'Апгрейд', icon: '🛡️', art: 'upgrade', players: 331, cat: ['fast'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="upSide"></div>
  <div class="col">
    <div class="stage upg-wrap">
      <div class="upg-wheel">
        <svg viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="130" fill="none" stroke="#22224d" stroke-width="20"/>
          <circle id="upArc" cx="150" cy="150" r="130" fill="none" stroke="#2fe6a7" stroke-width="20" stroke-linecap="round" transform="rotate(-90 150 150)" style="filter:drop-shadow(0 0 8px rgba(47,230,167,.7))"/>
          <circle cx="150" cy="150" r="104" fill="none" stroke="rgba(124,92,255,.25)" stroke-width="2" stroke-dasharray="3 9"/>
        </svg>
        <div class="upg-pointer" id="upPtr" style="position:absolute;inset:0"><div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:13px solid transparent;border-right:13px solid transparent;border-top:24px solid #ffc93c;filter:drop-shadow(0 0 8px rgba(255,201,60,.8))"></div></div>
        <div class="upg-center"><div class="x" id="upX">×2.00</div><div class="c" id="upChance">шанс 48%</div></div>
      </div>
      <div class="upg-chance-line">Шанс улучшения <b id="upChLine">48%</b></div>
      <div class="upg-slots" id="upSlots">
        <div class="upg-slot-panel"><div class="lbl">Ваш подарок</div><button class="upg-slot" id="upStake"><span class="em">＋</span><span class="nm">Выбрать</span><span class="vl">предмет или ₽</span></button></div>
        <div class="upg-arrow">→</div>
        <div class="upg-slot-panel"><div class="lbl">Хочу получить</div><button class="upg-slot" id="upTarget"><span class="em">＋</span><span class="nm">Выбрать</span><span class="vl">из каталога</span></button></div>
      </div>
      <div class="row between wrap mt12" id="upItemMults">
        <div class="chiprow" id="upQuick"><button class="chip" data-m="2">×2</button><button class="chip" data-m="4">×4</button><button class="chip" data-m="8">×8</button></div>
        <button class="btn ghost sm" id="upAll">Все предметы →</button>
      </div>
      <button class="btn gold block lg mt16" id="upGo">⬆️ Улучшить</button>
      <div id="upResult" style="min-height:48px;width:100%"></div>
    </div>
    <div class="hist" id="upHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#upSide');
      const modeWrap = h(`<div class="betpanel"><div class="lbl">Режим апгрейда</div><div class="chiprow" id="upMode"><button class="chip active" data-mode="money">₽ Деньги</button><button class="chip" data-mode="gift">🎁 Подарки</button><button class="chip" data-mode="skin">🔫 Скины</button></div></div>`);
      side.appendChild(modeWrap);
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const srcWrap = h(`<div class="betpanel" id="upSrcWrap"><div class="lbl">Источник ставки</div><div class="chiprow" id="upStakeSrc"><button class="chip active" data-s="inv">🎒 Инвентарь</button><button class="chip" data-s="bal">₽ Баланс</button></div></div>`);
      side.appendChild(srcWrap);
      const targets = [1.5, 2, 3, 5, 10, 20, 50, 100];
      const tWrap = h(`<div class="betpanel" id="upMoneyWrap"><div class="lbl">Цель (множитель)</div><div class="chiprow" id="upTargets">${targets.map(t => `<button class="chip ${t === 2 ? 'active' : ''}" data-t="${t}">×${t}</button>`).join('')}</div></div>`);
      side.appendChild(tWrap);
      const statWrap = h(`<div class="betpanel"><div class="statline"><span>Шанс успеха</span><b id="upCh">48%</b></div><div class="statline"><span>Множитель</span><b class="gold-text" id="upMult">×2.00</b></div><div class="statline"><span>Цель стоит</span><b class="green-text" id="upWin">200 ₽</b></div></div>`);
      side.appendChild(statWrap);
      side.appendChild(h(`<div class="small muted center">Шанс = 96% × (ставка / цель). Апгрейд предмета сжигает его при неудаче.</div>`));

      let mode = 'money', stakeSrc = 'inv', stakeItem = null, targetItem = null, moneyTarget = 2, spinning = false, rot = 0;
      const arc = body.querySelector('#upArc'), ptr = body.querySelector('#upPtr');
      const C = 2 * Math.PI * 130;
      const go = body.querySelector('#upGo');
      const catOf = () => mode === 'skin' ? UP_SKINS : UP_GIFTS;
      const stakeVal = () => {
        if (mode !== 'money' && stakeSrc === 'inv') return stakeItem ? stakeItem.value : 0;
        return bp.amount();
      };
      function calc() {
        if (mode === 'money') return { mult: moneyTarget, chance: clamp(.96 / moneyTarget, .01, .96), tv: stakeVal() * moneyTarget };
        const sv = stakeVal();
        if (!targetItem || sv <= 0) return { mult: 0, chance: 0, tv: targetItem ? targetItem.value : 0 };
        const m = targetItem.value / sv;
        return { mult: m, chance: clamp(.96 / m, .01, .96), tv: targetItem.value };
      }
      function slotHTML(it, fallbackEm, fallbackNm, fallbackVl) {
        return it ? `<span class="em">${it.emoji}</span><span class="nm">${esc(it.name)}</span><span class="vl" style="color:${RU.RAR_COLS[it.rar]}">${money(it.value)}</span>`
          : `<span class="em">${fallbackEm}</span><span class="nm">${fallbackNm}</span><span class="vl">${fallbackVl}</span>`;
      }
      function layout() {
        const item = mode !== 'money';
        body.querySelector('#upSlots').style.display = item ? '' : 'none';
        body.querySelector('#upItemMults').style.display = item ? '' : 'none';
        srcWrap.style.display = item ? '' : 'none';
        tWrap.style.display = item ? 'none' : '';
        bp.el.style.display = (item && stakeSrc === 'inv') ? 'none' : '';
      }
      function refresh() {
        const { mult, chance, tv } = calc();
        const chTxt = mult ? (chance * 100).toFixed(1) + '%' : '—';
        arc.setAttribute('stroke-dasharray', `${chance * C} ${C}`);
        body.querySelector('#upX').textContent = mult ? multFmt(mult) : '—';
        body.querySelector('#upChance').textContent = 'шанс ' + chTxt;
        body.querySelector('#upChLine').textContent = chTxt;
        statWrap.querySelector('#upCh').textContent = chTxt;
        statWrap.querySelector('#upMult').textContent = mult ? multFmt(mult) : '—';
        statWrap.querySelector('#upWin').textContent = tv ? money(tv) : '—';
        if (mode !== 'money') {
          const sBtn = body.querySelector('#upStake'), tBtn = body.querySelector('#upTarget');
          sBtn.innerHTML = stakeSrc === 'bal'
            ? `<span class="em">₽</span><span class="nm">С баланса</span><span class="vl">${money(bp.amount())}</span>`
            : slotHTML(stakeItem, '＋', 'Выбрать', 'предмет');
          tBtn.innerHTML = slotHTML(targetItem, '＋', 'Выбрать', 'из каталога');
          sBtn.classList.toggle('filled', stakeSrc === 'bal' || !!stakeItem);
          sBtn.style.setProperty('--rar', stakeSrc === 'bal' ? 'var(--gold)' : stakeItem ? RU.RAR_COLS[stakeItem.rar] : '');
          tBtn.classList.toggle('filled', !!targetItem);
          tBtn.style.setProperty('--rar', targetItem ? RU.RAR_COLS[targetItem.rar] : '');
          const ok = targetItem && (stakeSrc === 'bal' ? bp.amount() > 0 : !!stakeItem);
          go.disabled = spinning || !ok;
          go.innerHTML = ok ? '⬆️ Улучшить' : !targetItem ? '⬆️ Выберите цель' : '⬆️ Выберите ставку';
        } else {
          go.disabled = spinning;
          go.innerHTML = `⬆️ Апгрейднуть ${fmt(bp.amount())} ₽`;
        }
      }
      function openPicker(kind) {
        const list = kind === 'stake' ? S.inventory.filter(i => (i.type || 'gift') === mode) : catOf();
        const title = kind === 'stake' ? '🎒 Твой инвентарь' : (mode === 'skin' ? '🔫 Каталог скинов' : '🎁 Каталог подарков');
        const balOpt = kind === 'stake' ? `<button class="btn ghost sm block mt12" data-bal>₽ Ставить с баланса вместо предмета</button>` : '';
        const m = RU.modal(`<div class="modal-head"><div class="modal-title">${title}</div><button class="x-btn" data-x>✕</button></div>
${list.length ? `<div class="upg-picker">${list.map((it, i) => `<button class="pick-item rar-${it.rar}" style="--rar:${RU.RAR_COLS[it.rar]}" data-pick="${i}"><span class="em">${it.emoji}</span><span class="nm">${esc(it.name)}</span><span class="vl">${money(it.value)}</span></button>`).join('')}</div>${balOpt}`
            : `<div class="empty"><span class="e-ic">🎒</span>В инвентаре нет ${mode === 'skin' ? 'скинов' : 'подарков'}. Открой кейсы или ставь с баланса.<br><button class="btn violet sm mt12" data-bal>₽ Ставить с баланса</button></div>`}`);
        m.querySelectorAll('[data-x]').forEach(b => b.onclick = RU.closeModal);
        m.querySelectorAll('[data-bal]').forEach(b => b.onclick = () => {
          stakeSrc = 'bal'; sfx.click();
          srcWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.s === 'bal'));
          RU.closeModal(); layout(); refresh();
        });
        m.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
          const it = list[+b.dataset.pick];
          if (kind === 'stake') stakeItem = it; else targetItem = it;
          sfx.click(); RU.closeModal(); refresh();
        });
      }
      modeWrap.querySelector('#upMode').addEventListener('click', e => {
        const b = e.target.closest('[data-mode]'); if (!b || spinning) return;
        mode = b.dataset.mode; stakeItem = null; targetItem = null; sfx.click();
        modeWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        layout(); refresh();
      });
      srcWrap.querySelector('#upStakeSrc').addEventListener('click', e => {
        const b = e.target.closest('[data-s]'); if (!b || spinning) return;
        stakeSrc = b.dataset.s; sfx.click();
        srcWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        layout(); refresh();
      });
      tWrap.querySelector('#upTargets').addEventListener('click', e => {
        const b = e.target.closest('[data-t]'); if (!b || spinning) return;
        moneyTarget = parseFloat(b.dataset.t); sfx.click();
        tWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        refresh();
      });
      body.querySelector('#upStake').onclick = () => { if (spinning) return; if (mode === 'money') return; if (stakeSrc === 'inv') openPicker('stake'); else bp.input.focus(); };
      body.querySelector('#upTarget').onclick = () => { if (!spinning && mode !== 'money') openPicker('target'); };
      body.querySelector('#upAll').onclick = () => { if (!spinning) openPicker('target'); };
      body.querySelector('#upQuick').addEventListener('click', e => {
        const b = e.target.closest('[data-m]'); if (!b || spinning) return;
        const sv = stakeVal(); if (!sv) { toast('Сначала укажи ставку', 'error'); return; }
        const want = sv * parseFloat(b.dataset.m); let best = catOf()[0];
        for (const it of catOf()) if (Math.abs(it.value - want) < Math.abs(best.value - want)) best = it;
        targetItem = best; sfx.click(); refresh();
      });
      bp.input.addEventListener('input', refresh);
      go.onclick = () => {
        if (spinning) return;
        const { mult, chance, tv } = calc();
        if (mode !== 'money') {
          if (!targetItem) { toast('Выбери цель', 'error'); return; }
          if (stakeSrc === 'inv' && !stakeItem) { toast('Выбери предмет', 'error'); return; }
        }
        const sv = stakeVal(); if (sv <= 0) { toast('Укажи ставку', 'error'); return; }
        const useItem = mode !== 'money' && stakeSrc === 'inv' && stakeItem;
        if (useItem) { S.inventory = S.inventory.filter(i => i.id !== stakeItem.id); RU.save(); }
        else if (!bet(sv)) return;
        if (useItem) { S.stats.bets++; S.stats.wagered += sv; S.jackpot += sv * .005; RU.ensureQuestDate(); RU.questProg('bets'); RU.questProg('wager', sv); RU.gainXP(sv / 10); RU.save(); sfx.bet(); }
        spinning = true; go.disabled = true; bp.lock(true);
        body.querySelector('#upResult').innerHTML = '';
        const win = float() < chance;
        const arcDeg = chance * 360;
        const land = win ? 4 + Math.random() * Math.max(1, arcDeg - 8) : arcDeg + 4 + Math.random() * Math.max(1, 360 - arcDeg - 8);
        rot += 360 * (S.settings.fast ? 2 : 5) + ((land - (rot % 360)) + 360) % 360;
        ptr.style.transitionDuration = S.settings.fast ? '.85s' : '3.4s';
        ptr.style.transform = `rotate(${rot}deg)`;
        sfx.spin();
        const tickIv = sess.every(120, () => sfx.tick());
        sess.after(S.settings.fast ? 900 : 3500, () => {
          clearInterval(tickIv);
          const res = body.querySelector('#upResult');
          let wonItem = null;
          if (win) {
            if (mode === 'money') {
              payout('upgrade', sv, moneyTarget);
              res.innerHTML = `<div class="result-banner win">АПГРЕЙД УДАЛСЯ! ${multFmt(moneyTarget)} • +${money(sv * moneyTarget)}</div>`;
            } else {
              const it = { id: 'it' + Date.now() + Math.floor(Math.random() * 999), name: targetItem.name, emoji: targetItem.emoji, value: targetItem.value, rar: targetItem.rar, type: mode, ts: Date.now() };
              S.inventory.unshift(it); wonItem = it; S.stats.wins++; S.stats.won += tv; S.stats.best = Math.max(S.stats.best, tv);
              RU.ensureQuestDate(); RU.questProg('wins'); RU.save();
              if (it.rar >= 3) { RU.confetti(120); sfx.big(); } else sfx.win();
              RU.pushLive({ name: S.name, ava: S.avatar, game: 'Апгрейд', amount: Math.round(tv) });
              res.innerHTML = `<div class="result-banner win">${it.emoji} ${esc(it.name)} получен! ${multFmt(mult)} • ${money(tv)}</div>`;
            }
            histChip(body.querySelector('#upHist'), multFmt(mult), 'g');
          } else {
            if (mode === 'money') payout('upgrade', sv, 0);
            else { S.bonus.lossPool += sv; RU.save(); sfx.lose(); }
            res.innerHTML = `<div class="result-banner lose">Неудача. ${useItem ? 'Предмет' : 'Ставка'} сгорел${useItem ? '' : 'а'} 🔥</div>`;
            histChip(body.querySelector('#upHist'), '✕', 'r');
          }
          if (useItem) stakeItem = wonItem;
          spinning = false; bp.lock(false); refresh();
        });
      };
      layout(); refresh();
    }
  });

  /* ================= STORM (limbo) ================= */
  RU.GAMES.push({
    id: 'storm', name: 'Шторм', icon: '💎', art: 'storm', players: 96, tag: 'NEW', cat: ['fast'], isNew: true,
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="stSide"></div>
  <div class="col">
    <div class="stage storm-stage" id="stStage">
      <div class="storm-flash" id="stFlash"></div>
      <div class="storm-crystal">💎</div>
      <div class="storm-num" id="stNum">×1.00</div>
      <div class="small muted" id="stMsg">Задай цель и поймай молнию</div>
    </div>
    <div class="hist" id="stHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#stSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const tWrap = h(`<div class="betpanel"><div class="lbl">Целевой множитель</div><input class="inp" id="stTarget" type="number" step="0.1" min="1.01" max="600" value="2.00"><div class="chiprow mt8" id="stChips">${[1.5, 2, 5, 10, 50, 100, 600].map(v => `<button class="chip" data-t="${v}">×${v}</button>`).join('')}</div><div class="statline mt8"><span>Шанс</span><b id="stCh">48.5%</b></div><div class="statline"><span>Выигрыш</span><b class="gold-text" id="stWin">200 ₽</b></div></div>`);
      side.appendChild(tWrap);
      const go = h(`<button class="btn violet block lg" id="stGo">⚡ Ударить молнией</button>`);
      side.appendChild(go);
      side.appendChild(h(`<div class="small muted center">Кристалл выдаёт случайный множитель до ×600. Совпал с целью или выше — победа.</div>`));
      const targetInp = tWrap.querySelector('#stTarget');
      let busy = false;
      const getTarget = () => clamp(parseFloat(targetInp.value) || 2, 1.01, 600);
      function refresh() {
        const t = getTarget();
        tWrap.querySelector('#stCh').textContent = (.97 / t * 100).toFixed(2) + '%';
        tWrap.querySelector('#stWin').textContent = money(bp.amount() * t);
      }
      targetInp.addEventListener('input', refresh);
      bp.input.addEventListener('input', refresh);
      tWrap.querySelector('#stChips').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { targetInp.value = b.dataset.t; sfx.click(); refresh(); } });
      go.onclick = () => {
        if (busy) return;
        const a = bp.amount(), t = getTarget();
        if (!bet(a)) return;
        busy = true; go.disabled = true; bp.lock(true);
        const R = Math.min(600, Math.max(1, .97 / (1 - float())));
        const win = R >= t;
        const flash = body.querySelector('#stFlash'), num = body.querySelector('#stNum'), msg = body.querySelector('#stMsg');
        flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');
        sfx.boom();
        const dur = S.settings.fast ? 350 : 1150, t0 = performance.now();
        const iv = sess.every(30, () => {
          const p = clamp((performance.now() - t0) / dur, 0, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const cur = 1 + (R - 1) * eased;
          num.textContent = multFmt(cur);
          num.style.color = p < 1 ? '' : win ? 'var(--green)' : 'var(--red)';
          if (p >= 1) {
            clearInterval(iv);
            num.textContent = multFmt(R);
            if (win) {
              payout('storm', a, t);
              msg.textContent = `Молния попала! Цель ×${t} пробита`;
              if (t >= 10) { body.querySelector('#stStage').classList.add('shake'); sess.after(500, () => body.querySelector('#stStage').classList.remove('shake')); }
              histChip(body.querySelector('#stHist'), multFmt(R), R >= 10 ? 'y' : 'g');
            } else {
              payout('storm', a, 0);
              msg.textContent = `Не добил до ×${t}. Кристалл погас`;
              histChip(body.querySelector('#stHist'), multFmt(R), 'r');
            }
            busy = false; go.disabled = false; bp.lock(false);
          }
        });
      };
      refresh();
    }
  });

  /* ================= COW ROAD ================= */
  RU.GAMES.push({
    id: 'cow', name: 'Коровка', icon: '🐮', art: 'cow', players: 155, cat: ['fast'],
    mount(body, sess) {
      const DIFFS = {
        easy: { label: 'Лёгкий', covers: 5, cars: 1, steps: 15 },
        medium: { label: 'Средний', covers: 3, cars: 1, steps: 12 },
        hard: { label: 'Хард', covers: 2, cars: 1, steps: 10 }
      };
      let diff = 'easy';
      body.innerHTML = `
<div class="game-layout rev">
  <div class="col">
    <div class="stage" style="min-height:300px"><div class="cow-road" id="cowRoad"></div></div>
    <div class="row between mt8"><span class="small muted" id="cowInfo">Выбери сложность и веди корову через дорогу</span><b class="gold-text" id="cowMult">×1.00</b></div>
    <div id="cowResult"></div>
  </div>
  <div class="col" id="cowSide"></div>
</div>`;
      const side = body.querySelector('#cowSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const dWrap = h(`<div class="betpanel"><div class="lbl">Сложность</div><div class="chiprow" id="cowDiffs">${Object.entries(DIFFS).map(([k, v]) => `<button class="chip ${k === 'easy' ? 'active' : ''}" data-d="${k}">${v.label}</button>`).join('')}</div><div class="statline mt8"><span>Люков в полосе</span><b id="cowCovers">5</b></div><div class="statline"><span>Машин</span><b class="red-text" id="cowCars">1</b></div></div>`);
      side.appendChild(dWrap);
      const startBtn = h(`<button class="btn gold block lg" id="cowStart">🐮 Вывести корову</button>`);
      const cashBtn = h(`<button class="btn green block lg hidden" id="cowCash">Забрать</button>`);
      side.appendChild(startBtn); side.appendChild(cashBtn);
      side.appendChild(h(`<div class="small muted center">Каждый безопасный люк повышает множитель. Машина собьёт — ставка сгорит. Забирай вовремя!</div>`));
      const road = body.querySelector('#cowRoad');
      let active = false, step = 0, betAmt = 0, lanes = [], mult = 1;
      const cfg = () => DIFFS[diff];
      const pSafe = () => (cfg().covers - cfg().cars) / cfg().covers;
      const multAt = n => .96 / Math.pow(pSafe(), n);
      dWrap.querySelector('#cowDiffs').addEventListener('click', e => {
        const b = e.target.closest('[data-d]'); if (!b || active) return;
        diff = b.dataset.d; sfx.click();
        dWrap.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c === b));
        dWrap.querySelector('#cowCovers').textContent = cfg().covers;
        dWrap.querySelector('#cowCars').textContent = cfg().cars;
        buildIdle();
      });
      function buildIdle() {
        road.innerHTML = `<div class="cow-start">🐮<div class="tiny muted" style="position:absolute;bottom:6px">старт</div></div>` + Array.from({ length: cfg().steps }, (_, i) => `<div class="cow-lane"><span class="lm">×${multAt(i + 1).toFixed(2)}</span>${Array.from({ length: cfg().covers }, () => `<div class="cow-cover"></div>`).join('')}</div>`).join('');
      }
      function buildRound() {
        const c = cfg();
        lanes = Array.from({ length: c.steps }, () => {
          const idxs = [...Array(c.covers).keys()];
          const cars = new Set();
          const fs = floats(c.cars);
          fs.forEach(f => { let k = Math.floor(f * idxs.length); cars.add(idxs.splice(k, 1)[0]); });
          return cars;
        });
        road.innerHTML = `<div class="cow-start" id="cowHome">🐮</div>` + lanes.map((cars, i) => `<div class="cow-lane ${i === 0 ? 'current' : ''}" data-lane="${i}"><span class="lm">×${multAt(i + 1).toFixed(2)}</span>${Array.from({ length: c.covers }, (_, j) => `<button class="cow-cover" data-cover="${j}" ${i === 0 ? '' : 'disabled'}></button>`).join('')}</div>`).join('');
      }
      function scrollLane(i) {
        const lane = road.querySelector(`[data-lane="${i}"]`);
        if (lane) road.scrollTo({ left: lane.offsetLeft - road.clientWidth / 2 + 60, behavior: 'smooth' });
      }
      function updateHud() {
        body.querySelector('#cowMult').textContent = multFmt(mult);
        cashBtn.textContent = `Забрать ${money(betAmt * mult)}`;
        body.querySelector('#cowInfo').textContent = `Полоса ${step} / ${cfg().steps} • следующий люк: ×${multAt(step + 1).toFixed(2)}`;
      }
      startBtn.onclick = () => {
        if (active) return;
        const a = bp.amount();
        if (!bet(a)) return;
        betAmt = a; active = true; step = 0; mult = 1;
        bp.lock(true); dWrap.querySelectorAll('.chip').forEach(c => c.disabled = true);
        startBtn.classList.add('hidden'); cashBtn.classList.remove('hidden');
        body.querySelector('#cowResult').innerHTML = '';
        buildRound(); updateHud(); scrollLane(0);
      };
      function endRound(winMult, msg) {
        active = false;
        bp.lock(false); dWrap.querySelectorAll('.chip').forEach(c => c.disabled = false);
        cashBtn.classList.add('hidden'); startBtn.classList.remove('hidden');
        startBtn.textContent = '🐮 Ещё раз';
        road.querySelectorAll('.cow-cover').forEach(b => b.disabled = true);
        const res = body.querySelector('#cowResult');
        if (winMult > 0) {
          payout('cow', betAmt, winMult);
          res.innerHTML = `<div class="result-banner win mt8">${msg} +${money(betAmt * winMult)}</div>`;
        } else {
          payout('cow', betAmt, 0);
          res.innerHTML = `<div class="result-banner lose mt8">${msg}</div>`;
        }
      }
      cashBtn.onclick = () => { if (active && step > 0) endRound(mult, `Корова дома! ${multFmt(mult)}`); };
      road.addEventListener('click', e => {
        const b = e.target.closest('[data-cover]');
        if (!b || !active || b.disabled) return;
        const laneEl = b.closest('.cow-lane'), i = +laneEl.dataset.lane;
        if (i !== step) return;
        const j = +b.dataset.cover;
        laneEl.querySelectorAll('.cow-cover').forEach(x => x.disabled = true);
        if (lanes[i].has(j)) {
          b.classList.add('car'); b.textContent = '🚗';
          const cow = road.querySelector('.cow-mascot'); if (cow) { cow.textContent = '💫'; cow.classList.add('hop'); }
          sfx.boom();
          laneEl.classList.add('shake');
          sess.after(600, () => endRound(0, 'Корову сбила машина! 🚗💨'));
          return;
        }
        b.classList.add('safe'); b.textContent = '🐮';
        sfx.hop();
        laneEl.classList.remove('current'); laneEl.classList.add('done');
        step++; mult = multAt(step);
        const mascot = h(`<div class="cow-mascot hop">🐮</div>`);
        laneEl.appendChild(mascot);
        if (step >= cfg().steps) { updateHud(); sess.after(450, () => endRound(mult, 'Дорога пройдена полностью! 🏁')); return; }
        const next = road.querySelector(`[data-lane="${step}"]`);
        next.classList.add('current');
        next.querySelectorAll('.cow-cover').forEach(x => x.disabled = false);
        updateHud(); scrollLane(step);
      });
      buildIdle();
    }
  });

  /* ================= MINES ================= */
  RU.GAMES.push({
    id: 'mines', name: 'Мины', icon: '💣', art: 'mines', players: 240, cat: ['fast'],
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="mnSide"></div>
  <div class="col">
    <div class="stage"><div class="mines-grid" id="mnGrid"></div></div>
    <div class="row between mt8"><span class="small muted" id="mnInfo">Открой все безопасные клетки или забирай раньше</span><b class="gold-text" id="mnMult">×1.00</b></div>
    <div id="mnResult"></div>
  </div>
</div>`;
      const side = body.querySelector('#mnSide');
      const bp = betPanel({ bet: 100 });
      side.appendChild(bp.el);
      const cfgWrap = h(`<div class="betpanel"><div class="lbl">Мин на поле</div><select class="inp" id="mnCount">${[1, 3, 5, 10, 24].map(n => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select><div class="statline mt8"><span>Следующая клетка</span><b id="mnNext">×1.09</b></div><div class="statline"><span>Текущий выигрыш</span><b class="gold-text" id="mnWin">—</b></div></div>`);
      side.appendChild(cfgWrap);
      const startBtn = h(`<button class="btn gold block lg" id="mnStart">💎 Начать игру</button>`);
      const cashBtn = h(`<button class="btn green block lg hidden" id="mnCash">Забрать</button>`);
      const randBtn = h(`<button class="btn ghost block hidden" id="mnRand">🎲 Случайная клетка</button>`);
      side.appendChild(startBtn); side.appendChild(cashBtn); side.appendChild(randBtn);
      const grid = body.querySelector('#mnGrid');
      let active = false, mines = new Set(), revealed = [], betAmt = 0, mult = 1, mCount = 3;
      function buildGrid() {
        grid.innerHTML = Array.from({ length: 25 }, (_, i) => `<button class="mtile" data-tile="${i}" disabled></button>`).join('');
      }
      function calcMult(k) { let m = .97; for (let i = 0; i < k; i++) m *= (25 - i) / (25 - mCount - i); return m; }
      function refresh() {
        body.querySelector('#mnMult').textContent = multFmt(mult);
        body.querySelector('#mnWin').textContent = active ? money(betAmt * mult) : '—';
        const k = revealed.length;
        body.querySelector('#mnNext').textContent = k < 25 - mCount ? multFmt(calcMult(k + 1)) : '—';
        cashBtn.textContent = `Забрать ${money(betAmt * mult)}`;
      }
      cfgWrap.querySelector('#mnCount').addEventListener('change', e => { mCount = +e.target.value; refresh(); });
      startBtn.onclick = () => {
        if (active) return;
        const a = bp.amount();
        if (!bet(a)) return;
        betAmt = a; active = true; revealed = []; mult = 1;
        const idxs = [...Array(25).keys()];
        mines = new Set();
        floats(mCount).forEach(f => mines.add(idxs.splice(Math.floor(f * idxs.length), 1)[0]));
        buildGrid();
        grid.querySelectorAll('.mtile').forEach(t => t.disabled = false);
        bp.lock(true); cfgWrap.querySelector('select').disabled = true;
        startBtn.classList.add('hidden'); cashBtn.classList.remove('hidden'); randBtn.classList.remove('hidden');
        body.querySelector('#mnResult').innerHTML = '';
        refresh();
      };
      function revealAll(hitIdx) {
        grid.querySelectorAll('.mtile').forEach(t => {
          const i = +t.dataset.tile; t.disabled = true;
          if (mines.has(i)) { t.classList.add(i === hitIdx ? 'bomb' : 'dim'); t.textContent = '💣'; }
          else if (!t.classList.contains('gem')) t.classList.add('dim');
        });
      }
      function finish(winMult, msg) {
        active = false;
        bp.lock(false); cfgWrap.querySelector('select').disabled = false;
        cashBtn.classList.add('hidden'); randBtn.classList.add('hidden'); startBtn.classList.remove('hidden');
        startBtn.textContent = '💎 Ещё раз';
        const res = body.querySelector('#mnResult');
        if (winMult > 0) { payout('mines', betAmt, winMult); res.innerHTML = `<div class="result-banner win mt8">${msg} +${money(betAmt * winMult)}</div>`; }
        else { payout('mines', betAmt, 0); res.innerHTML = `<div class="result-banner lose mt8">${msg}</div>`; }
        refresh();
      }
      function pick(i) {
        if (!active || revealed.includes(i)) return;
        const t = grid.querySelector(`[data-tile="${i}"]`);
        if (mines.has(i)) {
          t.classList.add('bomb'); t.textContent = '💣';
          sfx.boom(); revealAll(i);
          sess.after(500, () => finish(0, 'Бум! Мина 💣'));
          return;
        }
        revealed.push(i);
        t.classList.add('gem'); t.textContent = '💎'; t.disabled = true;
        mult = calcMult(revealed.length);
        sfx.coin(); refresh();
        if (revealed.length === 25 - mCount) sess.after(400, () => finish(mult, 'Поле очищено полностью! 🏆'));
      }
      grid.addEventListener('click', e => { const t = e.target.closest('[data-tile]'); if (t && !t.disabled) pick(+t.dataset.tile); });
      randBtn.onclick = () => {
        if (!active) return;
        const free = [...Array(25).keys()].filter(i => !revealed.includes(i));
        pick(free[Math.floor(Math.random() * free.length)]);
      };
      cashBtn.onclick = () => { if (active && revealed.length) { revealAll(-1); finish(mult, `Забрал на ${multFmt(mult)}`); } };
      buildGrid(); refresh();
    }
  });

  /* ================= PLINKO ================= */
  const PL_TABLES = {
    8: { low: [5.6, 2.1, 1.1, 1, .5, 1, 1.1, 2.1, 5.6], med: [13, 3, 1.3, .7, .4, .7, 1.3, 3, 13], high: [29, 4, 1.5, .3, .2, .3, 1.5, 4, 29] },
    12: { low: [10, 3, 1.6, 1.4, 1.1, 1, .5, 1, 1.1, 1.4, 1.6, 3, 10], med: [33, 11, 4, 2, 1.1, .6, .3, .6, 1.1, 2, 4, 11, 33], high: [170, 24, 8.1, 2, .7, .2, .2, .2, .7, 2, 8.1, 24, 170] },
    16: { low: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, .5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16], med: [110, 41, 10, 5, 3, 1.5, 1, .5, .3, .5, 1, 1.5, 3, 5, 10, 41, 110], high: [1000, 130, 26, 9, 4, 2, .2, .2, .2, .2, .2, 2, 4, 9, 26, 130, 1000] }
  };
  function binom(n, k) { let r = 1; for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1); return r; }
  function normTable(rows, risk) {
    const t = PL_TABLES[rows][risk];
    let ev = 0; for (let k = 0; k <= rows; k++) ev += binom(rows, k) / Math.pow(2, rows) * t[k];
    return t.map(v => Math.max(.1, Math.round(v * .97 / ev * 10) / 10));
  }
  RU.GAMES.push({
    id: 'plinko', name: 'Плинко', icon: '🔮', art: 'plinko', players: 178, tag: 'NEW', cat: ['fast'], isNew: true,
    mount(body, sess) {
      body.innerHTML = `
<div class="game-layout">
  <div class="col" id="plSide"></div>
  <div class="col">
    <div class="stage plinko-wrap"><canvas id="plCanvas" style="width:100%;max-width:520px;height:380px"></canvas><div class="plinko-slots" id="plSlots"></div></div>
    <div class="hist" id="plHist"></div>
  </div>
</div>`;
      const side = body.querySelector('#plSide');
      const bp = betPanel({ bet: 50 });
      side.appendChild(bp.el);
      let rows = 12, risk = 'med', table = normTable(rows, risk), balls = [];
      const cfgWrap = h(`<div class="betpanel"><div class="lbl">Ряды</div><div class="chiprow" id="plRows">${[8, 12, 16].map(n => `<button class="chip ${n === 12 ? 'active' : ''}" data-r="${n}">${n}</button>`).join('')}</div><div class="lbl mt8">Риск</div><div class="chiprow" id="plRisk">${[['low', 'Низкий'], ['med', 'Средний'], ['high', 'Высокий']].map(([k, l]) => `<button class="chip ${k === 'med' ? 'active' : ''}" data-k="${k}">${l}</button>`).join('')}</div></div>`);
      side.appendChild(cfgWrap);
      const drop = h(`<button class="btn gold block lg" id="plDrop">🔮 Сбросить шар</button>`);
      const drop5 = h(`<button class="btn ghost block" id="plDrop5">Сбросить 5 шаров</button>`);
      side.appendChild(drop); side.appendChild(drop5);
      side.appendChild(h(`<div class="small muted center">Шар сам решает, куда отскочить. Края — жирные множители, центр — мелочь.</div>`));
      const canvas = body.querySelector('#plCanvas'), slotsEl = body.querySelector('#plSlots');
      let ctx, W, H;
      function refit() { const f = fitCanvas(canvas); ctx = f.ctx; W = f.w; H = f.h; }
      refit();
      const onRes = () => refit();
      addEventListener('resize', onRes); sess.onCleanup(() => removeEventListener('resize', onRes));
      function slotColor(v) { return v >= 20 ? '#ff4d6b' : v >= 5 ? '#ff9f1c' : v >= 1.5 ? '#ffc93c' : v >= 1 ? '#2fe6a7' : '#5d5a8a'; }
      function renderSlots() {
        slotsEl.innerHTML = table.map(v => `<div class="pslot" style="background:${slotColor(v)}">${v}</div>`).join('');
      }
      function pegXY(r, i) {
        const n = r + 3, sx = W / (rows + 3), sy = (H - 70) / rows;
        return { x: W / 2 + (i - (n - 1) / 2) * sx, y: 34 + r * sy };
      }
      function dropBall() {
        if (balls.length > 14) { toast('Слишком много шаров в полёте', 'error'); return; }
        const a = bp.amount();
        if (!bet(a)) return;
        const bits = floats(rows).map(f => f < .5 ? 0 : 1);
        balls.push({ bits, bet: a, row: 0, t: 0, x: W / 2, y: 12 });
      }
      drop.onclick = dropBall;
      drop5.onclick = () => { for (let i = 0; i < 5; i++) sess.after(i * 180, dropBall); };
      cfgWrap.querySelector('#plRows').addEventListener('click', e => {
        const b = e.target.closest('[data-r]'); if (!b || balls.length) return;
        rows = +b.dataset.r; table = normTable(rows, risk); sfx.click();
        cfgWrap.querySelectorAll('#plRows .chip').forEach(c => c.classList.toggle('active', c === b));
        renderSlots();
      });
      cfgWrap.querySelector('#plRisk').addEventListener('click', e => {
        const b = e.target.closest('[data-k]'); if (!b || balls.length) return;
        risk = b.dataset.k; table = normTable(rows, risk); sfx.click();
        cfgWrap.querySelectorAll('#plRisk .chip').forEach(c => c.classList.toggle('active', c === b));
        renderSlots();
      });
      renderSlots();
      let last = performance.now();
      sess.loop(now => {
        const dt = Math.min(50, now - last); last = now;
        ctx.clearRect(0, 0, W, H);
        for (let r = 0; r < rows; r++) for (let i = 0; i < r + 3; i++) {
          const p = pegXY(r, i);
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7);
          ctx.fillStyle = '#ffc93c'; ctx.shadowColor = '#ffc93c'; ctx.shadowBlur = 6; ctx.fill(); ctx.shadowBlur = 0;
        }
        const sy = (H - 70) / rows, sx = W / (rows + 3);
        balls = balls.filter(b => !b.dead);
        for (const b of balls) {
          b.t += dt / 105;
          while (b.t >= 1 && b.row < rows) { b.t -= 1; b.row++; sfx.tick(); }
          if (b.row >= rows) {
            const idx = b.bits.reduce((a, x) => a + x, 0);
            const v = table[idx];
            payout('plinko', b.bet, v, { silent: v < 1 });
            if (v >= 1) sfx.coin();
            histChip(body.querySelector('#plHist'), '×' + v, v >= 5 ? 'y' : v >= 1 ? 'g' : 'r');
            const sl = slotsEl.children[idx];
            if (sl) { sl.classList.add('hit'); sess.after(350, () => sl.classList.remove('hit')); }
            b.dead = true; continue;
          }
          const dirSum = b.bits.slice(0, b.row).reduce((a, x) => a + (x ? 1 : -1), 0);
          const nextDir = b.bits[b.row] ? 1 : -1;
          const x0 = W / 2 + dirSum * sx / 2, x1 = x0 + nextDir * sx / 2;
          const y0 = 12 + b.row * sy, y1 = y0 + sy;
          const tt = b.t;
          b.x = x0 + (x1 - x0) * tt;
          b.y = y0 + (y1 - y0) * tt - Math.sin(tt * Math.PI) * sy * .35;
          ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, 7);
          ctx.fillStyle = '#ffd76a'; ctx.shadowColor = '#ffc93c'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0;
          ctx.beginPath(); ctx.arc(b.x - 2.5, b.y - 2.5, 2.5, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
        }
      });
    }
  });
})();