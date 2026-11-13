'use strict';
/* LootUP × Telegram Mini App: init, haptics, signed referral snapshots. */
(() => {
  const PUB = { kty: 'RSA', alg: 'RS256', ext: true, key_ops: ['verify'], n: 'rTt5FSZI_S8AA_VcyyAzA1oh2UtTD5Bwk5SfxeLCnqAN47Cczvvla9JBCGxm7OiXCl28mqLlqlbKBcHlTKx3NoFlBDrutsDPthbP-CM67muviZyfKemu1-gff52P16kax3Tqk--yLKSSMGtI7F6jPPTaCKoAjaU2K6_bBCqnVkQilJRn44IaF6Qa3ihxuRs3LT5dsMXkuluVJA60SD5AHvZu48iBLiUcTP52bdIk7XJsdxMScGtIn49Z04paD4F5xqstc-sWKl_kVpVYxAMM94B8YDuEBk-o3ILzVEfMkwnP6wnEfSdR4NkjHIR362DOMwpfN-q-S7ZvsAUqYLMgcQ', e: 'AQAB' };
  const tg = () => { const w = window.Telegram && window.Telegram.WebApp; return w && w.initData ? w : null; };

  const t = tg();
  if (t) {
    t.ready(); t.expand();
    if (t.isVersionAtLeast('6.1')) { t.setHeaderColor('#07071a'); t.setBackgroundColor('#07071a'); }
    t.enableClosingConfirmation();
    if (t.isVersionAtLeast('7.7') && t.disableVerticalSwipes) t.disableVerticalSwipes();
    const applyVh = () => document.documentElement.style.setProperty('--tg-vh', t.viewportStableHeight + 'px');
    applyVh(); t.onEvent('viewportChanged', applyVh);
    const u = t.initDataUnsafe && t.initDataUnsafe.user;
    if (u && u.first_name && /^Игрок\d+$/.test(RU.S.name) && RU.S.stats.bets === 0 && RU.S.tx.length === 0) {
      RU.S.name = String(u.first_name).slice(0, 24); RU.save();
    }
  }

  const hap = kind => {
    const x = tg(), hf = x && x.HapticFeedback;
    if (!x || !hf || !x.isVersionAtLeast('6.1')) return;
    try {
      if (kind === 'win') hf.notificationOccurred('success');
      else if (kind === 'lose') hf.notificationOccurred('error');
      else if (kind === 'spin') hf.impactOccurred('medium');
      else hf.impactOccurred('light');
    } catch (e) { }
  };
  const HAP_MAP = { click: 'tap', bet: 'tap', win: 'win', big: 'win', lose: 'lose', spin: 'spin', coin: 'win', cash: 'win', boom: 'lose', hop: 'tap' };
  Object.keys(HAP_MAP).forEach(k => {
    const orig = RU.sfx[k];
    RU.sfx[k] = (...a) => { orig(...a); hap(HAP_MAP[k]); };
  });

  const bytes = v => Uint8Array.from(atob(v.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function verify(token) {
    if (token.length > 2048) throw new Error('Invalid token');
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra !== undefined) throw new Error('Invalid token');
    const key = await crypto.subtle.importKey('jwk', PUB, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(signature), new TextEncoder().encode(payload))) throw new Error('Invalid signature');
    const data = JSON.parse(new TextDecoder().decode(bytes(payload)));
    if (data.v !== 1 || data.bot !== RU.botName || !Number.isSafeInteger(data.uid) || data.uid <= 0 ||
      !Number.isSafeInteger(data.count) || data.count < 0 ||
      !Number.isSafeInteger(data.issued) || data.issued <= 0 || data.issued > Date.now() / 1000 + 60 ||
      typeof data.code !== 'string' || !/^[A-Za-z0-9_-]{16}$/.test(data.code)) throw new Error('Invalid data');
    const cur = tg() && tg().initDataUnsafe && tg().initDataUnsafe.user && tg().initDataUnsafe.user.id;
    if (cur && cur !== data.uid) throw new Error('Different account');
    return data;
  }

  const params = new URLSearchParams(location.hash.slice(1));
  let token = params.get('ref');
  if (!token) { try { token = sessionStorage.getItem('lootup-referral'); } catch (e) { } }
  const wantFriends = params.get('view') === 'friends';
  if (token) {
    const saved = token;
    verify(token).then(data => {
      RU.referral = data; RU.refError = '';
      try { sessionStorage.setItem('lootup-referral', saved); } catch (e) { }
      const cur = new URLSearchParams(location.hash.slice(1));
      if (cur.get('ref') === saved) {
        cur.delete('ref');
        history.replaceState(null, '', location.pathname + location.search + (cur.size ? '#' + cur : ''));
      }
      if (RU.page === 'friends' || RU.page === 'profile') RU.nav(RU.page);
    }).catch(() => {
      RU.referral = null;
      RU.refError = 'Не удалось проверить данные. Открой свежую статистику через бота.';
      try { if (sessionStorage.getItem('lootup-referral') === saved) sessionStorage.removeItem('lootup-referral'); } catch (e) { }
      if (wantFriends || RU.page === 'friends') RU.nav('friends');
    });
  }
  if (wantFriends) RU.nav('friends');
})();