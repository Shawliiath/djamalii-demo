/* djamalii, coeur de la boutique de demo : catalogue, panier, etat du drop · by yanis */
(function (w) {
  'use strict';

  // prix et tailles d'exemple : a remplacer par les vrais avant le drop
  var CATALOG = {
    princess: {
      id: 'princess', no: '01', name: 'Vintage princess dress', price: 4500,
      sizes: ['S/M', 'L/XL'],
      colors: [
        { key: 'rose', label: 'Rose poudré', swatch: '#f8d2da', tint: 'sage', img: 'img/princess-rose.webp', img420: 'img/princess-rose-420.webp', w: 767, h: 1467,
          details: [{ img: 'img/princess-rose-col.webp', alt: 'Col en V bordé de dentelle et grand nœud' }, { img: 'img/princess-rose-volant.webp', alt: 'Volant du bas souligné de dentelle' }] },
        { key: 'blanc', label: 'Blanc ivoire', swatch: '#fbf7f0', tint: 'clay', img: 'img/princess-blanche-hd.webp', img420: 'img/princess-blanche-hd-420.webp', w: 767, h: 1467,
          details: [{ img: 'img/princess-blanche-hd-col.webp', alt: 'Col en V bordé de dentelle et grand nœud' }, { img: 'img/princess-blanche-hd-volant.webp', alt: 'Volant du bas souligné de dentelle' }] }
      ],
      drawn: ['Col en V bordé de dentelle', 'Grand nœud à rubans', 'Manches cloche ornées de dentelle', 'Volant en bas, souligné de dentelle'],
      // reperes de la fiche technique, en % du dessin (seulement ce qui se voit)
      callouts: [['Col en V bordé de dentelle', 57, 6, 'Col en V'], ['Grand nœud à rubans', 47, 13, 'Grand nœud'], ['Empiècement froncé', 70, 15, 'Fronces'], ['Manche cloche, bande de dentelle', 23, 19, 'Manche cloche'], ['Volant, bande de dentelle', 30, 64, 'Volant']]
    },
    mukhawar: {
      id: 'mukhawar', no: '02', name: 'Robe brodée', price: 5200,
      sizes: ['S/M', 'L/XL'],
      colors: [
        { key: 'rose', label: 'Rose', swatch: '#f2b9c8', tint: 'rose', img: 'img/brodee.webp', img420: 'img/brodee-420.webp', w: 767, h: 1441,
          details: [{ img: 'img/brodee-broderie.webp', alt: 'Plastron brodé de fleurs blanches' }, { img: 'img/brodee-manche.webp', alt: 'Manche large bordée d’un galon brodé' }] }
      ],
      drawn: ['Col en V et plastron brodés de fleurs blanches', 'Manches larges bordées d’un galon', 'Fronces sous la poitrine', 'Jupe longue et très ample'],
      callouts: [['Plastron brodé de fleurs blanches', 42, 14, 'Plastron brodé'], ['Manche large, galon brodé', 13, 26, 'Galon brodé'], ['Fronces sous la poitrine', 66, 20, 'Fronces'], ['Jupe longue et ample', 72, 72, 'Jupe ample']]
    },
    arabic: { id: 'arabic', no: '03', name: 'Le troisième modèle', price: null, veiled: true }
  };

  var KEY = 'djamalii-demo-cart', MODE = 'djamalii-demo-mode';
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* navigation privee */ } }

  var items = load(KEY, []);
  if (!Array.isArray(items)) items = [];
  items = items.filter(function (it) { return CATALOG[it.id] && CATALOG[it.id].price && it.qty > 0; });
  var listeners = [];
  function emit(type, detail) { listeners.forEach(function (f) { f(type, detail); }); }

  var cart = {
    items: function () { return items.slice(); },
    count: function () { return items.reduce(function (n, it) { return n + it.qty; }, 0); },
    subtotal: function () { return items.reduce(function (n, it) { return n + it.qty * CATALOG[it.id].price; }, 0); },
    add: function (id, color, size, qty) {
      var p = CATALOG[id]; if (!p || !p.price) return;
      qty = Math.max(1, Math.min(9, qty | 0 || 1));
      var line = items.find(function (it) { return it.id === id && it.color === color && it.size === size; });
      if (line) line.qty = Math.min(9, line.qty + qty); else items.push({ id: id, color: color, size: size, qty: qty });
      save(KEY, items); emit('add', { id: id, color: color, size: size, qty: qty });
    },
    setQty: function (i, qty) {
      if (!items[i]) return;
      qty = qty | 0;
      if (qty <= 0) items.splice(i, 1); else items[i].qty = Math.min(9, qty);
      save(KEY, items); emit('change');
    },
    remove: function (i) { items.splice(i, 1); save(KEY, items); emit('change'); },
    clear: function () { items = []; save(KEY, items); emit('change'); },
    on: function (f) { listeners.push(f); }
  };

  // avant le drop (liste d'attente) ou jour du drop (boutique ouverte)
  // l'apercu s'ouvre toujours sur le jour du drop : « avant le drop » ne dure que le temps de la visite
  var mode = 'drop';
  try { localStorage.removeItem(MODE); } catch (e) { /* navigation privee */ }
  var shop = {
    mode: function () { return mode; },
    setMode: function (m) { mode = m === 'avant' ? 'avant' : 'drop'; emit('mode', mode); }
  };

  function euros(c) { return (c / 100).toFixed(2).replace('.', ',').replace(',00', '') + ' €'; }
  function color(p, key) { return p.colors.find(function (c) { return c.key === key; }) || p.colors[0]; }

  w.DJ = { CATALOG: CATALOG, cart: cart, shop: shop, euros: euros, color: color };
})(window);

/* djamalii, interface de la boutique : fiche, sac, liste d'attente, apercu · by yanis */
(function () {
  'use strict';
  var DJ = window.DJ, C = DJ.CATALOG, root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* entete */
  var head = $('.head');
  var onScroll = function () { head.classList.toggle('scrolled', scrollY > 10); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  var menuBtn = $('.menu-btn'), nav = $('#menu');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menuBtn.querySelector('use').setAttribute('href', open ? '#i-close' : '#i-menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  function closeMenu(focus) { if (!nav.classList.contains('open')) return; setMenu(false); if (focus) menuBtn.focus(); }
  addEventListener('scroll', function () { closeMenu(false); }, { passive: true });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(false); });
  // le menu du telephone se ferme aussi avec echap ou en touchant a cote
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
  document.addEventListener('click', function (e) { if (!e.target.closest('#menu, .menu-btn')) closeMenu(false); });

  /* apparitions */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    document.querySelectorAll('.sec-head, .grid, .maison-quote, .values li, .strip, .qa > div').forEach(function (el) { el.classList.add('reveal'); io.observe(el); });
  }

  /* apercu avant le drop / jour du drop */
  function applyMode(m) {
    if (m === 'avant') root.dataset.mode = 'avant'; else delete root.dataset.mode;
    document.querySelectorAll('.preview button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.mode === m)); });
  }
  applyMode(DJ.shop.mode());
  $('.preview').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-mode]'); if (!b) return;
    DJ.shop.setMode(b.dataset.mode); applyMode(b.dataset.mode);
  });

  /* toast */
  var toast = $('#toast'), tt;
  function say(t) { toast.textContent = t; toast.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { toast.classList.remove('on'); }, 2600); }

  /* fiche produit */
  var sheet = $('#fiche'), cur = null, colorKey = null, size = null, qty = 1, opener = null;
  function radio(btn, on) { btn.setAttribute('aria-checked', String(on)); btn.tabIndex = on ? 0 : -1; }
  function arrows(group, cb) {
    group.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      var bs = [].slice.call(group.querySelectorAll('[role=radio]'));
      var i = bs.indexOf(document.activeElement); if (i < 0) return;
      var n = bs[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length];
      n.click(); n.focus(); e.preventDefault();
    });
  }
  function setMain(src, w, h, alt, zoom) {
    var m = $('#g-main');
    m.src = src; m.width = w; m.height = h; m.alt = alt || ''; m.classList.toggle('zoom', !!zoom);
  }
  function renderColor() {
    var p = C[cur], c = DJ.color(p, colorKey);
    $('#fiche-coloris').textContent = c.label;
    document.querySelectorAll('#fiche-swatches .sw').forEach(function (b) { radio(b, b.dataset.c === c.key); });
    var gal = $('.gallery'); gal.dataset.tint = c.tint;
    showView(0);
  }
  function showView(v) {
    var p = C[cur], c = DJ.color(p, colorKey), gal = $('.gallery');
    gal.classList.toggle('tech', v === 1);
    setMain(c.img, c.w, c.h, v === 1 ? 'Fiche technique : ' + p.name : p.name + ' ' + c.label.toLowerCase());
    var pins = $('#g-pins'); pins.innerHTML = '';
    if (v === 1) {
      p.callouts.forEach(function (k, i) {
        var d = document.createElement('span'); d.className = 'pin ' + (k[1] < 50 ? 'to-left' : 'to-right');
        d.style.left = k[1] + '%'; d.style.top = k[2] + '%';
        d.innerHTML = '<i>' + (i + 1) + '</i><b></b>'; d.querySelector('b').textContent = k[3] || k[0];
        pins.appendChild(d);
      });
    }
    var th = $('#g-thumbs'); th.innerHTML = '';
    ['La robe', 'Fiche technique'].forEach(function (label, i) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(i === v)); b.textContent = label;
      b.addEventListener('click', function () { showView(i); });
      th.appendChild(b);
    });
  }
  function openSheet(id, from) {
    var p = C[id]; if (!p || !p.colors || typeof sheet.showModal !== 'function') return false;
    cur = id; colorKey = p.colors[0].key; size = null; qty = 1; opener = from || null;
    $('#fiche-no').textContent = 'Modèle n°' + p.no;
    $('#fiche-nom').textContent = p.name;
    $('#fiche-prix').textContent = DJ.euros(p.price);
    var sw = $('#fiche-swatches'); sw.innerHTML = '';
    p.colors.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sw'; b.setAttribute('role', 'radio');
      b.dataset.c = c.key; b.style.setProperty('--c', c.swatch); b.setAttribute('aria-label', c.label);
      b.addEventListener('click', function () { colorKey = c.key; renderColor(); });
      sw.appendChild(b);
    });
    var sz = $('#fiche-tailles'); sz.innerHTML = ''; $('#e-taille').hidden = true; sz.removeAttribute('aria-describedby');
    p.sizes.forEach(function (s) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'sz'; b.setAttribute('role', 'radio'); b.textContent = s;
      radio(b, false);
      b.addEventListener('click', function () { size = s; sz.querySelectorAll('.sz').forEach(function (x) { radio(x, x === b); }); $('#e-taille').hidden = true; sz.removeAttribute('aria-describedby'); });
      sz.appendChild(b);
    });
    sz.firstChild.tabIndex = 0;
    $('#fiche-qte').textContent = '1';
    var ul = $('#fiche-details'); ul.innerHTML = '';
    p.callouts.forEach(function (k) { var li = document.createElement('li'); li.textContent = k[0]; ul.appendChild(li); });
    renderColor();
    sheet.showModal();
    sheet.scrollTop = 0;
    if (location.hash !== '#robe-' + id) history.replaceState(null, '', '#robe-' + id);
    return true;
  }
  arrows($('#fiche-swatches')); arrows($('#fiche-tailles'));
  document.querySelectorAll('.product a[href^="#robe-"]').forEach(function (a) {
    a.addEventListener('click', function (e) { if (openSheet(a.getAttribute('href').slice(6), a)) e.preventDefault(); });
  });
  $('.sheet-close').addEventListener('click', function () { sheet.close(); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
  sheet.addEventListener('close', function () {
    if (/^#robe-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search);
    if (opener) opener.focus();
  });
  $('.qty', sheet).addEventListener('click', function (e) {
    var b = e.target.closest('[data-q]'); if (!b) return;
    qty = Math.max(1, Math.min(9, qty + +b.dataset.q)); $('#fiche-qte').textContent = qty;
  });
  $('#fiche-add').addEventListener('click', function () {
    if (!size) {
      var g = $('#fiche-tailles'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
      $('#e-taille').hidden = false; g.setAttribute('aria-describedby', 'e-taille');
      g.querySelector('.sz').focus(); return;
    }
    DJ.cart.add(cur, colorKey, size, qty);
    opener = null; sheet.close();
    openBag();
  });
  $('#fiche-notify').addEventListener('click', function () {
    var sel = $('#f-modele'); if (sel) sel.value = cur;
    opener = null; sheet.close();
    setTimeout(function () { $('#f-prenom').focus({ preventScroll: true }); }, 0);
  });
  if (/^#robe-/.test(location.hash)) openSheet(location.hash.slice(6));

  /* sac */
  var bag = $('#sac'), bagBtn = $('.bag-btn');
  function thumbClass(c) { return 'line-img ' + c.tint; }
  function renderBag() {
    var n = DJ.cart.count(), items = DJ.cart.items();
    bagBtn.querySelector('.bag-count').textContent = n;
    bagBtn.classList.toggle('has', n > 0);
    bagBtn.setAttribute('aria-label', 'Ouvrir ton sac, ' + n + ' article' + (n > 1 ? 's' : ''));
    var ul = $('#sac-lignes'); ul.innerHTML = '';
    items.forEach(function (it, i) {
      var p = C[it.id], c = DJ.color(p, it.color);
      var li = document.createElement('li'); li.className = 'line';
      li.innerHTML = '<div class="' + thumbClass(c) + '"><img alt=""></div>' +
        '<div><h3></h3><p class="line-meta"></p><div class="qty"><button type="button" data-d="-1" aria-label="Retirer une">−</button><output>' + it.qty + '</output><button type="button" data-d="1" aria-label="Ajouter une">+</button></div></div>' +
        '<div class="line-end"><p class="line-price"></p><button class="line-rm" type="button">Retirer</button></div>';
      li.querySelector('img').src = c.img420;
      li.querySelector('h3').textContent = p.name;
      li.querySelector('.line-meta').textContent = c.label + ' · ' + it.size;
      li.querySelector('.line-price').textContent = DJ.euros(p.price * it.qty);
      li.querySelectorAll('[data-d]').forEach(function (b) { b.addEventListener('click', function () { DJ.cart.setQty(i, it.qty + +b.dataset.d); }); });
      li.querySelector('.line-rm').addEventListener('click', function () { DJ.cart.remove(i); });
      ul.appendChild(li);
    });
    $('#sac-total').textContent = DJ.euros(DJ.cart.subtotal());
    $('#sac-pieces').textContent = n + ' pièce' + (n > 1 ? 's' : '');
    $('.bag-art').style.setProperty('--tissue', (n === 0 ? 10 : n === 1 ? 4 : n === 2 ? -2 : -8) + 'px');
    var empty = n === 0;
    $('#sac-vide').hidden = !empty;
    $('#sac-pied').hidden = empty || !$('#sac-commande').hidden;
    ul.hidden = !$('#sac-commande').hidden;
  }
  function openBag() {
    $('#sac-commande').hidden = true; renderBag();
    if (typeof bag.showModal === 'function' && !bag.open) bag.showModal();
  }
  DJ.cart.on(function (type) {
    renderBag();
    if (type === 'add') { bagBtn.classList.remove('bump'); void bagBtn.offsetWidth; bagBtn.classList.add('bump'); }
  });
  bagBtn.addEventListener('click', openBag);
  bag.addEventListener('click', function (e) {
    if (e.target === bag || e.target.closest('[data-close]')) bag.close();
  });
  $('#sac-go').addEventListener('click', function () { $('#sac-commande').hidden = false; renderBag(); $('#sac-retour').focus(); });
  $('#sac-retour').addEventListener('click', function () { $('#sac-commande').hidden = true; renderBag(); });
  renderBag();

  /* liste d'attente (apercu : rien n'est envoye) */
  var form = $('#waitlist'), done = $('#waitlist-done');
  function setErr(input, id, bad) {
    input.setAttribute('aria-invalid', bad ? 'true' : 'false');
    if (bad) input.setAttribute('aria-describedby', id); else input.removeAttribute('aria-describedby');
    $('#' + id).hidden = !bad;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var badN = form.prenom.value.trim().length < 2, badM = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim());
    setErr(form.prenom, 'e-prenom', badN); setErr(form.email, 'e-mail', badM);
    if (badN) return form.prenom.focus();
    if (badM) return form.email.focus();
    $('#done-name').textContent = ', ' + form.prenom.value.trim().slice(0, 40);
    form.hidden = true; done.hidden = false; done.focus();
  });
  ['prenom', 'email'].forEach(function (n) {
    form[n].addEventListener('input', function () { if (form[n].getAttribute('aria-invalid') === 'true') setErr(form[n], n === 'prenom' ? 'e-prenom' : 'e-mail', false); });
  });
})();
