/* Panel del lecho empacado. Los campos se precalculan con precompute.py;
   este archivo solo dibuja y advecta. Funciona con los datos incrustados
   (artefacto autocontenido) o leyéndolos de casos.json (sitio). */
(function () {
  "use strict";
  const raiz = document.currentScript && document.currentScript.dataset.base
             ? document.currentScript.dataset.base : "";
  const incrustado = document.getElementById("datos");
  const i18nEl = document.getElementById("sim-i18n");
  const T = Object.assign({
    niveles: ["ninguna", "leve", "media", "alta", "muy alta"],
    empaques: ["suelto", "medio", "denso"],
    deLaInicial: "de la inicial", laMedia: "\u00d7 la media", deLaRTD: "de la RTD",
    acumulando: "acumulando trazador\u2026",
    notaNormal: "Se construye en vivo con las part\u00edculas que van saliendo.",
    notaColmatado: "Sin percolaci\u00f3n: no hay trazador que salga.",
    dec: ","
  }, i18nEl ? JSON.parse(i18nEl.textContent) : {});
  let D = null, NX = 0, NY = 0, NC = 0;
  const PE = [60, 150, 300, 800, 3000];

  // ---------------------------------------------------------- decodificar --
  const cache = new Map();
  function clave(e, b) { return e + "-" + b; }
  function buscarCaso(e, b) { return D.casos.find(c => c.empaque === e && c.biofilm === b); }

  function decodificar(caso) {
    const k = clave(caso.empaque, caso.biofilm);
    if (cache.has(k)) return Promise.resolve(cache.get(k));
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = NX; cv.height = NY;
        const cx = cv.getContext("2d", { willReadFrequently: true });
        cx.drawImage(img, 0, 0);
        const px = cx.getImageData(0, 0, NX, NY).data;
        const u = new Float32Array(NC), v = new Float32Array(NC);
        const sol = new Uint8Array(NC), sp = new Float32Array(NC);
        const vm = caso.vmax;
        let smax = 0;
        for (let i = 0; i < NC; i++) {
          const du = (px[i * 4] - 128) / 127, dv = (px[i * 4 + 1] - 128) / 127;
          u[i] = Math.sign(du) * du * du * vm;
          v[i] = Math.sign(dv) * dv * dv * vm;
          sol[i] = px[i * 4 + 2] > 127 ? 1 : 0;
          const s = Math.hypot(u[i], v[i]);
          sp[i] = s;
          if (!sol[i] && s > smax) smax = s;
        }
        const campo = { u, v, sol, sp, smax, caso };
        cache.set(k, campo);
        res(campo);
      };
      img.src = caso.png ? "data:image/png;base64," + caso.png : raiz + caso.file;
    });
  }

  // ------------------------------------------------------ mapa de colores --
  const RAMPA = [[59,76,192],[104,138,222],[157,182,236],[220,220,220],
                 [238,182,154],[221,122,95],[180,4,38]];
  function color(t) {
    t = Math.max(0, Math.min(1, t)) * (RAMPA.length - 1);
    const i = Math.min(RAMPA.length - 2, Math.floor(t)), f = t - i;
    const a = RAMPA[i], b = RAMPA[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function css(nombre) {
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }
  function hex(h) {
    h = h.replace("#", "");
    return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
  }

  // ------------------------------------------------------------- escenario --
  const bed = document.getElementById("bed");
  const bctx = bed.getContext("2d");
  const fondo = document.createElement("canvas");
  const fctx = fondo.getContext("2d");

  function pintarFondo(campo) {
    const grano = hex(css("--grain")), borde = hex(css("--grain-edge"));
    const img = fctx.createImageData(NX, NY);
    const d = img.data, esc = campo.smax > 0 ? campo.smax : 1;
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const p = j * NX + i, o = p * 4;
        if (campo.sol[p]) {
          const frontera =
            (i > 0 && !campo.sol[p - 1]) || (i < NX - 1 && !campo.sol[p + 1]) ||
            (j > 0 && !campo.sol[p - NX]) || (j < NY - 1 && !campo.sol[p + NX]);
          const c = frontera ? borde : grano;
          d[o] = c[0]; d[o+1] = c[1]; d[o+2] = c[2]; d[o+3] = 255;
        } else {
          const c = color(Math.sqrt(campo.sp[p] / esc));
          d[o] = c[0]; d[o+1] = c[1]; d[o+2] = c[2]; d[o+3] = 255;
        }
      }
    }
    fctx.putImageData(img, 0, 0);
  }

  // ------------------------------------------------------------ partículas --
  const NP = 1500;
  const pxs = new Float32Array(NP), pys = new Float32Array(NP), pt = new Float32Array(NP);
  let campo = null, pesos = null, dt = 0, pasoDif = 0, salidas = [], sumT = 0;

  function prepararEntrada() {
    const w = new Float32Array(NY);
    let s = 0;
    for (let j = 0; j < NY; j++) { const q = Math.max(0, campo.u[j * NX + 1]); w[j] = q; s += q; }
    if (s <= 0) { pesos = null; return; }
    let a = 0;
    for (let j = 0; j < NY; j++) { a += w[j] / s; w[j] = a; }
    pesos = w;
  }
  function sembrar(i) {
    if (!pesos) { pxs[i] = -1; return; }
    const r = Math.random();
    let lo = 0, hi = NY - 1;
    while (lo < hi) { const m = (lo + hi) >> 1; if (pesos[m] < r) lo = m + 1; else hi = m; }
    pxs[i] = 1 + Math.random() * 2;
    pys[i] = lo + Math.random();
    pt[i] = 0;
  }
  let mu = 0, mv = 0;                       // salida de muestrear(), sin asignar
  function muestrear(x, y) {
    const i = Math.max(0, Math.min(NX - 2, Math.floor(x)));
    const j = Math.max(0, Math.min(NY - 2, Math.floor(y)));
    const fx = x - i, fy = y - j, p = j * NX + i;
    const w00 = (1-fx)*(1-fy), w10 = fx*(1-fy), w01 = (1-fx)*fy, w11 = fx*fy;
    mu = campo.u[p]*w00 + campo.u[p+1]*w10 + campo.u[p+NX]*w01 + campo.u[p+NX+1]*w11;
    mv = campo.v[p]*w00 + campo.v[p+1]*w10 + campo.v[p+NX]*w01 + campo.v[p+NX+1]*w11;
  }
  function solido(x, y) {
    const i = Math.max(0, Math.min(NX - 1, x | 0)), j = Math.max(0, Math.min(NY - 1, y | 0));
    return campo.sol[j * NX + i] === 1;
  }
  function gauss() {
    let a = 0; for (let i = 0; i < 3; i++) a += Math.random() * 2 - 1;
    return a * 0.8165;
  }

  function avanzar() {
    if (!pesos) return;
    for (let i = 0; i < NP; i++) {
      if (pxs[i] < 0) { sembrar(i); continue; }
      muestrear(pxs[i], pys[i]);
      const ux = mu, uy = mv;
      const mx = pxs[i] + 0.5 * dt * ux;
      const my = Math.max(0.01, Math.min(NY - 0.01, pys[i] + 0.5 * dt * uy));
      muestrear(mx, my);
      const ux2 = mu, uy2 = mv;
      let nx = pxs[i] + dt * ux2;
      let ny = Math.max(0.01, Math.min(NY - 0.01, pys[i] + dt * uy2));
      const cx = nx + pasoDif * gauss();
      const cy = Math.max(0.01, Math.min(NY - 0.01, ny + pasoDif * gauss()));
      if (!solido(cx, cy)) { nx = cx; ny = cy; }
      pxs[i] = nx; pys[i] = ny; pt[i] += dt;
      if (nx >= NX - 1.5) {
        salidas.push(pt[i]); sumT += pt[i];
        if (salidas.length > 4000) { sumT -= salidas.shift(); }
        sembrar(i);
      } else if (pt[i] > 900) { sembrar(i); }
    }
  }

  const cabezas = new Float32Array(NP * 4);
  function dibujar() {
    const W = bed.width, H = bed.height;
    bctx.imageSmoothingEnabled = true;
    bctx.drawImage(fondo, 0, 0, W, H);
    if (!pesos) return;
    const ex = W / NX, ey = H / NY;
    const esc = campo.smax > 0 ? campo.smax : 1;
    const tinta = css("--flecha");
    let nc = 0;

    // los astiles, en un solo trazo
    bctx.strokeStyle = tinta; bctx.lineWidth = 1.7; bctx.lineCap = "round";
    bctx.globalAlpha = 0.88;
    bctx.beginPath();
    for (let i = 0; i < NP; i++) {
      if (pxs[i] < 0) continue;
      muestrear(pxs[i], pys[i]);
      const s = Math.hypot(mu, mv);
      if (s < 1e-9) continue;
      const dx = mu / s, dy = mv / s;
      const L = 7 + 15 * Math.sqrt(s / esc);        // largo según la velocidad
      const x = pxs[i] * ex, y = pys[i] * ey;
      const hx = x + dx * L * 0.5, hy = y + dy * L * 0.5;
      bctx.moveTo(x - dx * L * 0.5, y - dy * L * 0.5);
      bctx.lineTo(hx - dx * 2.4, hy - dy * 2.4);
      cabezas[nc] = hx; cabezas[nc+1] = hy;
      cabezas[nc+2] = dx; cabezas[nc+3] = dy; nc += 4;
    }
    bctx.stroke();

    // y las puntas, en un solo relleno
    bctx.fillStyle = tinta;
    bctx.beginPath();
    for (let k = 0; k < nc; k += 4) {
      const hx = cabezas[k], hy = cabezas[k+1], dx = cabezas[k+2], dy = cabezas[k+3];
      const nx = -dy, ny = dx, w = 2.7, l = 5.4;
      bctx.moveTo(hx, hy);
      bctx.lineTo(hx - dx * l + nx * w, hy - dy * l + ny * w);
      bctx.lineTo(hx - dx * l - nx * w, hy - dy * l - ny * w);
      bctx.closePath();
    }
    bctx.fill();
    bctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ RTD --
  const chart = document.getElementById("chart");
  const cctx = chart.getContext("2d");
  function dibujarRTD() {
    const W = chart.width, H = chart.height;
    const ml = 44, mr = 12, mt = 12, mb = 34;
    cctx.clearRect(0, 0, W, H);
    const linea = css("--line-soft"), muted = css("--muted"), acc = css("--accent");
    cctx.strokeStyle = linea; cctx.lineWidth = 1;
    cctx.beginPath(); cctx.moveTo(ml, mt); cctx.lineTo(ml, H - mb); cctx.lineTo(W - mr, H - mb); cctx.stroke();
    cctx.fillStyle = muted; cctx.font = "13px Inter, sans-serif";
    cctx.textAlign = "center";
    for (let k = 0; k <= 3; k++) {
      const x = ml + (W - ml - mr) * k / 3;
      cctx.fillText(k.toString(), x, H - mb + 18);
    }
    cctx.fillText("t / t̄", (ml + W - mr) / 2, H - 6);
    cctx.save(); cctx.translate(14, (mt + H - mb) / 2); cctx.rotate(-Math.PI / 2);
    cctx.textAlign = "center"; cctx.fillText("E(t)", 0, 0); cctx.restore();

    if (salidas.length < 200) {
      cctx.fillStyle = css("--faint"); cctx.textAlign = "center";
      cctx.fillText(T.acumulando, (ml + W - mr) / 2, (mt + H - mb) / 2);
      return;
    }
    const med = sumT / salidas.length;
    const NB = 64, hist = new Float32Array(NB);
    for (const t of salidas) {
      const b = Math.floor((t / med) / 3 * NB);
      if (b >= 0 && b < NB) hist[b]++;
    }
    const sm = new Float32Array(NB);
    for (let i = 0; i < NB; i++) {
      let s = 0, n = 0;
      for (let k = -2; k <= 2; k++) {
        const j = i + k;
        if (j >= 0 && j < NB) { const w = 3 - Math.abs(k); s += hist[j] * w; n += w; }
      }
      sm[i] = s / n;
    }
    hist.set(sm);
    let mx = 0; for (let i = 0; i < NB; i++) if (hist[i] > mx) mx = hist[i];
    if (mx <= 0) return;
    const px = i => ml + (W - ml - mr) * (i + 0.5) / NB;
    const py = h => (H - mb) - (H - mb - mt) * (h / mx) * 0.94;
    cctx.beginPath(); cctx.moveTo(ml, H - mb);
    for (let i = 0; i < NB; i++) cctx.lineTo(px(i), py(hist[i]));
    cctx.lineTo(W - mr, H - mb); cctx.closePath();
    cctx.fillStyle = acc; cctx.globalAlpha = 0.22; cctx.fill(); cctx.globalAlpha = 1;
    cctx.beginPath();
    for (let i = 0; i < NB; i++) (i ? cctx.lineTo : cctx.moveTo).call(cctx, px(i), py(hist[i]));
    cctx.strokeStyle = acc; cctx.lineWidth = 2.2; cctx.stroke();
    const xm = ml + (W - ml - mr) / 3;
    cctx.strokeStyle = muted; cctx.setLineDash([4, 4]); cctx.lineWidth = 1;
    cctx.beginPath(); cctx.moveTo(xm, mt); cctx.lineTo(xm, H - mb); cctx.stroke();
    cctx.setLineDash([]);

    let s2 = 0; for (const t of salidas) { const d = t / med - 1; s2 += d * d; }
    s2 /= salidas.length;
    document.getElementById("d-n").innerHTML =
      (s2 > 0 ? (1 / s2).toFixed(1).replace(".", T.dec) : "—") + "<small>" + T.deLaRTD + "</small>";
  }

  // -------------------------------------------------------------- estado ---
  const sBio = document.getElementById("s-bio"), sEmp = document.getElementById("s-emp"),
        sPe = document.getElementById("s-pe");
  const aviso = document.getElementById("aviso");

  function fmt(x, n) { return x.toFixed(n).replace(".", T.dec); }

  async function aplicar() {
    const e = +sEmp.value, b = +sBio.value, ip = +sPe.value;
    const caso = buscarCaso(e, b);
    document.getElementById("o-bio").textContent = T.niveles[b];
    document.getElementById("o-emp").textContent = T.empaques[e];
    document.getElementById("o-pe").textContent = "Pe " + PE[ip];

    campo = await decodificar(caso);
    pintarFondo(campo);
    prepararEntrada();
    salidas = []; sumT = 0;
    for (let i = 0; i < NP; i++) sembrar(i);

    const colmatado = caso.Krel < 0.004;
    aviso.classList.toggle("on", colmatado);

    document.getElementById("d-poro").textContent = fmt(caso.poro, 2);
    document.getElementById("d-perm").innerHTML =
      (colmatado ? "0" : fmt(caso.Krel * 100, 0)) + "%<small>" + T.deLaInicial + "</small>";
    document.getElementById("d-pico").innerHTML =
      fmt(caso.pico, 0) + "\u00d7<small>" + T.laMedia + "</small>";
    document.getElementById("c-perm").classList.toggle("alto", caso.Krel < 0.25);
    document.getElementById("c-pico").classList.toggle("alto", caso.pico > 20);
    document.getElementById("d-n").innerHTML = "—<small>" + T.deLaRTD + "</small>";
    document.getElementById("rtd-nota").textContent =
      colmatado ? T.notaColmatado : T.notaNormal;

    if (campo.smax > 0) {
      dt = 0.9 / campo.smax;
      const umed = caso.umed / (D.lx / NX);      // a celdas por unidad de tiempo
      pasoDif = Math.sqrt(2 * (umed * NX / PE[ip]) * dt);
      for (let k = 0; k < 900; k++) avanzar();   // ceba la RTD antes de mostrarla
    }
    dibujar(); dibujarRTD();
  }

  let ultimo = 0;
  function bucle(ts) {
    if (campo) {
      avanzar(); avanzar();
      dibujar();
      if (ts - ultimo > 420) { dibujarRTD(); ultimo = ts; }
    }
    requestAnimationFrame(bucle);
  }

  [sBio, sEmp, sPe].forEach(s => s.addEventListener("input", aplicar));
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (campo) { pintarFondo(campo); dibujar(); dibujarRTD(); }
  });

  const cargar = incrustado
    ? Promise.resolve(JSON.parse(incrustado.textContent))
    : fetch(raiz + "casos.json").then(r => r.json());
  cargar.then(d => {
    D = d;
    NX = D.nx; NY = D.ny; NC = NX * NY;
    fondo.width = NX; fondo.height = NY;
    return aplicar();
  }).then(() => {
    requestAnimationFrame(bucle);
    D.casos.forEach(c => decodificar(c));   // precarga el resto en segundo plano
  });
})();
