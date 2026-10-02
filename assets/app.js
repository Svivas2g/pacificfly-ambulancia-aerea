// PacificFly — comportamiento compartido por las páginas de la propuesta (versión 2).
// Cada bloque revisa si su sección existe en la página antes de actuar.
(() => {
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const anio = $('#anio');
  if (anio) anio.textContent = new Date().getFullYear();

  // Cabecera con sombra al desplazarse
  const cabecera = $('.cabecera');
  if (cabecera) {
    const sombra = () => cabecera.classList.toggle('con-sombra', window.scrollY > 8);
    addEventListener('scroll', sombra, { passive: true }); sombra();
  }

  // Menú en celular
  const menuBtn = $('.menu-btn'), menu = $('#menu-movil');
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', () => {
      const abierto = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!abierto));
      menuBtn.setAttribute('aria-label', abierto ? 'Abrir menú' : 'Cerrar menú');
      menu.hidden = abierto;
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => { menuBtn.setAttribute('aria-expanded', 'false'); menu.hidden = true; }));
  }

  // Cifras que cuentan hasta su valor
  const contar = (ambito) => $$('[data-contar]', ambito).forEach(el => {
    const fin = +el.dataset.contar, pre = el.dataset.prefijo || '', suf = el.dataset.sufijo || '';
    const t0 = performance.now(), dur = 1700;
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + Math.round(fin * e).toLocaleString('es-CO') + suf;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });

  // Aparición al entrar en pantalla
  const observados = $$('.revelar, .mapa, .pasos, .indicadores');
  if (reducir || !('IntersectionObserver' in window)) {
    observados.forEach(el => el.classList.add('visible', 'en-vista'));
  } else {
    $$('.indicadores [data-contar]').forEach(el => { el.textContent = (el.dataset.prefijo || '') + '0' + (el.dataset.sufijo || ''); });
    const io = new IntersectionObserver((entradas) => entradas.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('visible', 'en-vista');
      if (e.target.classList.contains('indicadores')) contar(e.target);
      io.unobserve(e.target);
    }), { threshold: .2, rootMargin: '0px 0px -6% 0px' });
    observados.forEach(el => io.observe(el));
  }

  // Tipos de traslado: en celular se deslizan; en escritorio es una cuadrícula y los controles no se ven
  const lista = $('#tipos-lista');
  if (lista) {
    const items = $$('.tipo', lista);
    const contador = $('.tipos__contador');
    const anterior = $('.tipos__btn[data-dir="-1"]'), siguiente = $('.tipos__btn[data-dir="1"]');
    const ancho = () => (items[1] ? items[1].offsetLeft - items[0].offsetLeft : lista.clientWidth);
    const actualizar = () => {
      const desliza = lista.scrollWidth > lista.clientWidth + 2;
      lista.tabIndex = desliza ? 0 : -1;
      if (!desliza) return;
      const i = Math.min(items.length - 1, Math.max(0, Math.round(lista.scrollLeft / ancho())));
      contador.textContent = `${i + 1} de ${items.length}`;
      anterior.disabled = lista.scrollLeft <= 2;
      siguiente.disabled = lista.scrollLeft + lista.clientWidth >= lista.scrollWidth - 2;
    };
    lista.addEventListener('scroll', () => requestAnimationFrame(actualizar), { passive: true });
    [anterior, siguiente].forEach(b => b.addEventListener('click', () => {
      lista.scrollBy({ left: +b.dataset.dir * ancho(), behavior: reducir ? 'auto' : 'smooth' });
    }));
    addEventListener('resize', actualizar);
    actualizar();
  }

  // Flota: al seleccionar un avión cambia la imagen. Sin foto, se muestra el aviso de foto pendiente.
  const pestanas = $$('.flota__tab');
  if (pestanas.length) {
    const panel = $('#flota-panel'), foto = $('#flota-foto'), pendiente = $('#flota-pendiente');
    const pie = $('#flota-pie'), nombrePendiente = $('#flota-pendiente-nombre');
    const elegir = (tab, foco) => {
      pestanas.forEach(t => {
        const si = t === tab;
        t.setAttribute('aria-selected', String(si));
        t.tabIndex = si ? 0 : -1;
      });
      if (foco) tab.focus();
      panel.setAttribute('aria-labelledby', tab.id);
      panel.dataset.marca = tab.dataset.marca;
      pie.textContent = tab.dataset.nombre;
      const src = tab.dataset.imagen;
      pie.hidden = !src; // sin foto, el nombre ya va en el aviso
      if (!src) {
        foto.hidden = true; pendiente.hidden = false;
        nombrePendiente.textContent = tab.dataset.nombre;
        return;
      }
      pendiente.hidden = true; foto.hidden = false;
      if (foto.getAttribute('src') === src) return;
      foto.classList.add('cambiando');
      setTimeout(() => { foto.src = src; foto.alt = tab.dataset.alt || tab.dataset.nombre; foto.classList.remove('cambiando'); }, reducir ? 0 : 180);
    };
    pestanas.forEach((t, i) => {
      t.addEventListener('click', () => elegir(t));
      t.addEventListener('keydown', (e) => {
        const teclas = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (!(e.key in teclas)) return;
        e.preventDefault();
        elegir(pestanas[(i + teclas[e.key] + pestanas.length) % pestanas.length], true);
      });
    });
  }

  // Preguntas frecuentes
  $$('.acordeon__btn').forEach(b => b.addEventListener('click', () => {
    const abierto = b.getAttribute('aria-expanded') === 'true';
    b.setAttribute('aria-expanded', String(!abierto));
    document.getElementById(b.getAttribute('aria-controls')).hidden = abierto;
  }));

  // Mapa de cobertura: todo el país con cobertura, el suroccidente y el Pacífico en rojo
  const datos = window.MAPA_COLOMBIA, svg = $('#mapa-svg');
  if (datos && svg) {
    const NS = 'http://www.w3.org/2000/svg';
    const nodo = (t, a = {}) => { const n = document.createElementNS(NS, t); Object.entries(a).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
    svg.setAttribute('viewBox', datos.viewBox.join(' '));
    const fuerte = { 'CHOCO': 1, 'CAUCA': 1, 'PUTUMAYO': 1, 'SANTANDER': 1, 'VALLE DEL CAUCA': 2, 'NARIÑO': 2, 'HUILA': 2 };
    const gDeptos = nodo('g');
    let k = 0;
    Object.entries(datos.deptos).forEach(([nombre, d]) => {
      const c = fuerte[nombre];
      const p = nodo('path', { d, class: 'depto' + (c === 1 ? ' depto--cob' : c === 2 ? ' depto--cob2' : '') });
      if (c) p.style.transitionDelay = (0.15 + 0.09 * k++) + 's';
      gDeptos.append(p);
    });
    const proyectar = (lon, lat) => [67.441663 * lon + 5510.949961, -67.743605 * lat + 905.537433];
    const [bx, by] = proyectar(-76.3819, 3.5427); // Cali
    // [nombre, lon, lat, lado de la etiqueta, secundaria (se oculta en celular), ajuste vertical]
    const destinos = [
      ['Barranquilla', -74.7808, 10.8896, 'der'],
      ['Bucaramanga', -73.1848, 7.1265, 'der'],
      ['Medellín', -75.4231, 6.1645, 'der'],
      ['Bogotá', -74.1469, 4.7016, 'der'],
      ['Quibdó', -76.6412, 5.6908, 'der', true],
      ['Bahía Solano', -77.3947, 6.2029, 'izq', true],
      ['Buenaventura', -76.9898, 3.8196, 'izq'],
      ['Timbiquí', -77.6680, 2.7786, 'izq', false, -9],
      ['Guapi', -77.8980, 2.5701, 'izq', true, 15],
      ['Popayán', -76.6093, 2.4544, 'der', true],
      ['Neiva', -75.2940, 2.9502, 'der', true],
      ['Tumaco', -78.7492, 1.8144, 'abajo'],
      ['Pasto', -77.2909, 1.3967, 'der'],
      ['Puerto Asís', -76.5008, 0.5051, 'der', true]
    ];
    const gRutas = nodo('g'), gNodos = nodo('g'), gEtiquetas = nodo('g');
    destinos.forEach(([nombre, lon, lat, lado, sec, ajuste = 0], i) => {
      const [x, y] = proyectar(lon, lat);
      const dx = x - bx, dy = y - by, largo = Math.hypot(dx, dy);
      let nx = -dy / largo, ny = dx / largo;
      if (ny > 0) { nx = -nx; ny = -ny; }
      const curva = Math.min(80, largo * .3);
      const cx = (bx + x) / 2 + nx * curva, cy = (by + y) / 2 + ny * curva;
      const ruta = nodo('path', { d: `M${bx},${by} Q${cx},${cy} ${x},${y}`, class: 'ruta', pathLength: '1' });
      ruta.style.transitionDelay = (0.7 + i * 0.09) + 's';
      if (nombre === 'Timbiquí') ruta.id = 'ruta-destacada';
      gRutas.append(ruta);
      gNodos.append(nodo('circle', { cx: x, cy: y, r: 7, class: 'nodo' }));
      const t = nodo('text', {
        class: 'etiqueta' + (sec ? ' etiqueta--sec' : ''),
        x: lado === 'izq' ? x - 13 : lado === 'abajo' ? x : x + 13,
        y: (lado === 'abajo' ? y + 30 : y + 6) + ajuste,
        'text-anchor': lado === 'izq' ? 'end' : lado === 'abajo' ? 'middle' : 'start'
      });
      t.textContent = nombre;
      gEtiquetas.append(t);
    });
    const base = nodo('circle', { cx: bx, cy: by, r: 11, class: 'base-punto' });
    const tBase = nodo('text', { class: 'etiqueta etiqueta--base', x: bx + 20, y: by + 8 });
    tBase.textContent = 'Cali';
    gEtiquetas.append(tBase);
    const avion = nodo('g', { class: 'avioncito movil-anim' });
    const forma = nodo('use', { href: '#i-avion', x: -17, y: -17, width: 34, height: 34, transform: 'rotate(90)' });
    const mov = nodo('animateMotion', { dur: '4.8s', repeatCount: 'indefinite', rotate: 'auto', calcMode: 'spline', keyTimes: '0;1', keyPoints: '0;1', keySplines: '.45 0 .25 1' });
    mov.append(nodo('mpath', { href: '#ruta-destacada' }));
    avion.append(forma, mov);
    svg.append(gDeptos, gRutas, gNodos, base, avion, gEtiquetas);
  }

  if (reducir) $$('svg').forEach(s => s.pauseAnimations && s.pauseAnimations());
})();
