// Reformas Badajoz SR · interacción: cabecera, menú, el rodillo de la portada (antes → después con el scroll),
// los oficios alrededor del operario, partes de obra que se marcan solos, antes/después a mano, vídeos en horizontal,
// parallax, cifras y apariciones. Todo en un solo requestAnimationFrame.
(() => {
  const d = document, reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lim = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  // progreso de una sección fijada: 0 al llegar arriba, 1 cuando se acaba su recorrido
  const fijado = (el, vh) => { const r = el.getBoundingClientRect(); return lim(-r.top / Math.max(1, r.height - vh)); };

  // menú del móvil
  const btn = d.querySelector('[data-menu]'), panel = d.querySelector('[data-menu-panel]');
  if (btn && panel) {
    const poner = (abrir) => { btn.setAttribute('aria-expanded', abrir); btn.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú'); panel.hidden = !abrir; d.body.classList.toggle('menu-abierto', abrir); };
    btn.addEventListener('click', () => poner(btn.getAttribute('aria-expanded') !== 'true'));
    panel.addEventListener('click', (e) => { if (e.target.closest('a')) poner(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') poner(false); });
  }

  // antes / después a mano (los partes de obra)
  d.querySelectorAll('[data-ad]').forEach((ad) => {
    const r = ad.querySelector('.ad__rango');
    const fijar = () => { ad.style.setProperty('--x', r.value + '%'); ad.classList.add('tocado'); };
    r.addEventListener('input', fijar); ad.style.setProperty('--x', r.value + '%');
  });

  const cab = d.querySelector('[data-cab]'), flot = d.querySelector('.flotante');
  const rodillo = d.querySelector('[data-rodillo]');
  // dónde empieza el rodillo: justo encima de «Reformas en Badajoz» y por debajo de la cabecera, en cualquier pantalla
  let inicio = rodillo ? +rodillo.dataset.inicio || .14 : 0;
  const medir = () => {
    if (!rodillo) return;
    const fijo = rodillo.querySelector('.rodillo__fijo'), txt = rodillo.querySelector('.rodillo__txt'), ceja = txt.querySelector('.ceja');
    // offsetTop no cuenta la animación de entrada del texto (que lo baja 22 px al principio)
    const H = fijo.clientHeight, y = txt.offsetTop + ceja.offsetTop, cabH = cab ? cab.offsetHeight : 70;
    inicio = lim((y - 46) / H, (cabH + 30) / H, .4);   // 26 px de medio rodillo y 20 de aire
  };
  const oficios = d.querySelector('[data-oficios]'), chips = oficios ? [...oficios.querySelectorAll('.oficio')] : [];
  const partes = [...d.querySelectorAll('[data-parte]')].map((el) => ({ el, tareas: [...el.querySelectorAll('.tarea')], sello: el.querySelector('.sello') }));
  const pista = d.querySelector('[data-pista]'), cinta = pista && pista.querySelector('.videos__cinta');
  const pxs = [...d.querySelectorAll('[data-px]')].map((el) => ({ el, v: parseFloat(el.dataset.px), desde: +(el.dataset.pxDesde || 0), ref: el.parentElement }));

  let pendiente = false;
  const fotograma = () => {
    pendiente = false;
    const y = scrollY, vh = innerHeight, vw = innerWidth;
    cab && cab.classList.toggle('fija', y > 24);
    flot && flot.classList.toggle('ver', y > vh * .8);

    // el rodillo baja con el scroll: arriba queda pintado el después, abajo sigue el antes
    if (rodillo) {
      const p = reducir ? 1 : fijado(rodillo, vh);
      const q = inicio + (1 - inicio) * p;               // la portada empieza con una franja pintada arriba, por encima del título
      rodillo.style.setProperty('--r', q.toFixed(4));
      rodillo.classList.toggle('acabado', q > .985);
    }
    // los oficios aparecen uno a uno alrededor del operario
    if (oficios) {
      const p = reducir ? 1 : fijado(oficios, vh);
      oficios.style.setProperty('--p', p.toFixed(4));
      const k = Math.floor(p * (chips.length + 1.2));
      chips.forEach((c, i) => c.classList.toggle('ver', i < k));
    }
    // cada parte se va marcando según entra en pantalla, y al final cae el sello
    for (const pt of partes) {
      const r = pt.el.getBoundingClientRect();
      if (r.top > vh || r.bottom < 0) continue;
      const p = reducir ? 1 : lim((vh * .85 - r.top) / (vh * .6));
      const k = Math.round(p * pt.tareas.length);
      pt.tareas.forEach((t, i) => t.classList.toggle('hecha', i < k));
      pt.sello && pt.sello.classList.toggle('puesto', k >= pt.tareas.length);
    }
    // los vídeos corren en horizontal mientras se baja
    if (pista && cinta && vw > 700) {
      const p = fijado(pista, vh), sobra = Math.max(0, cinta.scrollWidth - vw + 48);
      cinta.style.transform = `translate3d(${(-p * sobra).toFixed(1)}px, 0, 0)`;
    } else if (cinta) cinta.style.transform = '';
    if (reducir) return;
    for (const o of pxs) {
      if (vw < o.desde) { if (o.el.style.transform) o.el.style.transform = ''; continue; }
      const r = o.ref.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) continue;
      o.el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - vh / 2) * o.v).toFixed(1)}px, 0)`;
    }
  };
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(fotograma); } };
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', () => { medir(); pedir(); });
  medir(); fotograma();
  if (d.fonts) d.fonts.ready.then(() => { medir(); pedir(); });

  // cifras que cuentan hasta su valor al verse
  const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cuentas = [...d.querySelectorAll('[data-cuenta]')];
  if (!reducir && 'IntersectionObserver' in window && cuentas.length) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; io.unobserve(e.target);
      const el = e.target, fin = +el.dataset.cuenta, t0 = performance.now(), T = 1400;
      const paso = (t) => { const p = lim((t - t0) / T); el.textContent = miles(Math.round(fin * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(paso); };
      el.textContent = '0'; requestAnimationFrame(paso);
    }), { threshold: .6 });
    cuentas.forEach((el) => io.observe(el));
  }

  // vídeos: solo se reproducen mientras se ven
  const vids = [...d.querySelectorAll('video[data-auto="vista"]')];
  if (!reducir && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
    }), { rootMargin: '80px', threshold: .3 });
    vids.forEach((v) => io.observe(v));
  }

  // apariciones al hacer scroll
  const revs = [...d.querySelectorAll('[data-rev]')];
  if (reducir || !('IntersectionObserver' in window)) revs.forEach((el) => el.classList.add('visto'));
  else {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    revs.forEach((el, i) => { el.style.transitionDelay = (i % 3) * 70 + 'ms'; io.observe(el); });
  }
})();
