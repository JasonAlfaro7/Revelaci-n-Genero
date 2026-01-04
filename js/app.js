/* -----------------------------------------
   Revelación de Género 🐝 - app.js (CORS FIX)
   - Guardado (RSVP/Votos): sendBeacon (no requiere CORS)
   - Lectura (admin getAll): JSONP (evita CORS)
------------------------------------------ */

const EVENT = {
  fechaTexto: "Domingo, 22 de febrero",
  horaTexto: "4:00 p. m.",
  lugarTexto: "Casa Alajuela",
  startsAtISO: "2026-02-22T16:00:00-06:00",

  // 🔐 Clave para el panel privado (admin.html)
  adminKey: "1234",

  // ✅ Tu API (Apps Script)
  API_URL: "https://script.google.com/macros/s/AKfycbw3ckPoJuO9OkeKL3U_QZ3tmaI03WsWJBDUgfcV5MygoU1JI58fFuLhSpP6Omyl4Uqwjw/exec",

  // Debe ser igual al SECRET en tu Apps Script
  API_SECRET: "CAMBIAME-SECRET",
};

const LS_KEYS = {
  RSVPS: "gr_rsvps_v2",
  VOTES: "gr_votes_v2",
};

const $ = (sel) => document.querySelector(sel);

function nowISO(){ return new Date().toISOString(); }

function fmtDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
  }catch{ return iso; }
}

function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function setHint(el, msg, kind){
  if(!el) return;
  el.textContent = msg;
  el.classList.remove("ok","bad");
  if(kind) el.classList.add(kind);
}

function loadJson(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return fallback;
    return JSON.parse(raw);
  }catch{
    return fallback;
  }
}

function saveJson(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

/* Menú móvil */
(function mobileNav(){
  const btn = $("#menuBtn");
  const nav = $("#mobileNav");
  if(!btn || !nav) return;

  btn.addEventListener("click", () => {
    const open = nav.hasAttribute("hidden") === false;
    if(open){
      nav.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    }else{
      nav.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  nav.addEventListener("click", (e) => {
    if(e.target.matches("a")){
      nav.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    }
  });
})();

/* Info evento */
(function eventInfo(){
  if($("#evtFecha")) $("#evtFecha").textContent = EVENT.fechaTexto;
  if($("#evtHora")) $("#evtHora").textContent = EVENT.horaTexto;
  if($("#evtLugar")) $("#evtLugar").textContent = EVENT.lugarTexto;
})();

/* Cuenta regresiva */
(function countdown(){
  const dEl = $("#cdDays");
  const hEl = $("#cdHours");
  const mEl = $("#cdMins");
  const sEl = $("#cdSecs");
  if(!dEl || !hEl || !mEl || !sEl) return;

  const target = new Date(EVENT.startsAtISO).getTime();

  function tick(){
    const now = Date.now();
    const diff = Math.max(0, target - now);

    const sec = Math.floor(diff/1000);
    const days = Math.floor(sec / 86400);
    const hours = Math.floor((sec % 86400) / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;

    dEl.textContent = String(days);
    hEl.textContent = String(hours).padStart(2,"0");
    mEl.textContent = String(mins).padStart(2,"0");
    sEl.textContent = String(secs).padStart(2,"0");
  }

  tick();
  setInterval(tick, 1000);
})();

/* Confetti */
function confettiBurst(amount = 70){
  const colors = [
    "rgba(255,216,77,.95)",
    "rgba(255,238,166,.95)",
    "rgba(255,255,255,.95)",
    "rgba(35,31,32,.70)"
  ];

  for(let i=0; i<amount; i++){
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = (Math.random() * 100) + "vw";
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = (6 + Math.random()*10) + "px";
    el.style.height = (10 + Math.random()*14) + "px";
    el.style.animationDuration = (1.3 + Math.random()*1.5) + "s";
    el.style.opacity = (0.7 + Math.random()*0.3).toFixed(2);
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
}
$("#confettiBtn")?.addEventListener("click", () => confettiBurst(90));

/* -----------------------------------------
   API: envío sin CORS (POST)
   - Usa sendBeacon para que el navegador no bloquee por CORS.
   - No podemos leer la respuesta, así que mostramos "Enviado" y guardamos local.
------------------------------------------ */
function apiSend(action, payload){
  const bodyObj = { action, secret: EVENT.API_SECRET, ...payload };
  const bodyStr = JSON.stringify(bodyObj);

  // Preferido: sendBeacon
  if(navigator.sendBeacon){
    const blob = new Blob([bodyStr], { type: "text/plain;charset=UTF-8" });
    return navigator.sendBeacon(EVENT.API_URL, blob);
  }

  // Fallback: fetch no-cors (no permite leer respuesta, pero envía)
  fetch(EVENT.API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: bodyStr
  }).catch(()=>{});
  return true;
}

/* -----------------------------------------
   API: lectura sin CORS (JSONP)
   - Requiere que tu Apps Script tenga doGet con callback.
------------------------------------------ */
function apiGetAllJsonp(){
  return new Promise((resolve, reject) => {
    const cbName = "cb_" + Math.random().toString(36).slice(2);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout JSONP"));
    }, 8000);

    function cleanup(){
      clearTimeout(timeout);
      delete window[cbName];
      script.remove();
    }

    window[cbName] = (data) => {
      cleanup();
      if(data?.ok === false) reject(new Error(data?.message || "API error"));
      else resolve(data);
    };

    const url = new URL(EVENT.API_URL);
    url.searchParams.set("action", "getAll");
    url.searchParams.set("secret", EVENT.API_SECRET);
    url.searchParams.set("callback", cbName);

    const script = document.createElement("script");
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Error JSONP"));
    };
    document.head.appendChild(script);
  });
}

/* RSVP */
function normalizePhone(v){
  return (v || "").replace(/[^\d+]/g, "").trim();
}

function renderThanks(rsvp){
  const box = $("#thanksBox");
  if(!box) return;

  if(!rsvp){
    box.innerHTML = `<p class="muted">Cuando envíes tu confirmación, verás un resumen aquí.</p>`;
    return;
  }

  const attendMap = { si: "¡Sí!", talvez: "En duda", no: "No" };
  box.innerHTML = `
    <p><strong>Nombre:</strong> ${escapeHtml(rsvp.name)}</p>
    <p><strong>Teléfono:</strong> ${escapeHtml(rsvp.phone)}</p>
    <p><strong>Asistencia:</strong> ${attendMap[rsvp.attend] || escapeHtml(rsvp.attend)}</p>
    <p><strong>Mensaje:</strong> ${rsvp.message ? escapeHtml(rsvp.message) : "<span class='muted'>(sin mensaje)</span>"}</p>
    <p class="tiny muted">Enviado: ${fmtDate(rsvp.updatedAt || rsvp.createdAt)}</p>
  `;
}

$("#rsvpForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const hint = $("#rsvpHint");

  const name = $("#guestName")?.value.trim();
  const phone = normalizePhone($("#guestPhone")?.value);
  const attend = document.querySelector("input[name='attend']:checked")?.value || "si";
  const message = $("#message")?.value.trim();

  if(!name){
    setHint(hint, "Escribe tu nombre.", "bad");
    return;
  }
  if(!phone || phone.length < 8){
    setHint(hint, "Escribe un número válido.", "bad");
    return;
  }

  const rsvps = loadJson(LS_KEYS.RSVPS, {});
  const prev = rsvps[phone];

  const rsvp = {
    name,
    phone,
    attend,
    message,
    createdAt: prev?.createdAt || nowISO(),
    updatedAt: nowISO(),
  };

  // Enviar (sin CORS)
  const sent = apiSend("saveRsvp", { rsvp });
  setHint(hint, sent ? "Confirmación enviada ✅ ¡Gracias!" : "No se pudo enviar.", sent ? "ok" : "bad");

  // Guardar local (respaldo)
  rsvps[phone] = rsvp;
  saveJson(LS_KEYS.RSVPS, rsvps);

  renderThanks(rsvp);
  confettiBurst(35);
});

/* Votos */
$("#voteForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const hint = $("#voteHint");

  const name = $("#voteName")?.value.trim();
  const vote = document.querySelector("input[name='vote']:checked")?.value;

  if(!name){
    setHint(hint, "Escribe tu nombre.", "bad");
    return;
  }
  if(!vote){
    setHint(hint, "Selecciona una opción.", "bad");
    return;
  }

  const votes = loadJson(LS_KEYS.VOTES, {});
  const v = { name, vote, updatedAt: nowISO() };

  const sent = apiSend("saveVote", { vote: v });
  setHint(hint, sent ? "Voto enviado ✅" : "No se pudo enviar.", sent ? "ok" : "bad");

  votes[name.toLowerCase()] = v;
  saveJson(LS_KEYS.VOTES, votes);

  confettiBurst(25);
});

/* Panel privado */
function isAdminPage(){
  return location.pathname.toLowerCase().endsWith("admin.html");
}

function fillTable(tableSel, rowsHtml){
  const tb = document.querySelector(`${tableSel} tbody`);
  if(!tb) return;
  tb.innerHTML = rowsHtml;
}

function renderAdmin(data){
  const rsvps = data?.rsvps || [];
  const votes = data?.votes || [];
  const updatedAt = data?.updatedAt || nowISO();

  if($("#kRsvps")) $("#kRsvps").textContent = String(rsvps.length);
  if($("#kVotes")) $("#kVotes").textContent = String(votes.length);
  if($("#kUpdated")) $("#kUpdated").textContent = fmtDate(updatedAt);

  const attendMap = { si:"¡Sí!", talvez:"En duda", no:"No" };

  fillTable("#rsvpTable",
    rsvps.map(r => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.phone)}</td>
        <td>${escapeHtml(attendMap[r.attend] || r.attend)}</td>
        <td>${r.message ? escapeHtml(r.message) : ""}</td>
        <td>${escapeHtml(fmtDate(r.updatedAt || r.createdAt))}</td>
      </tr>
    `).join("")
  );

  fillTable("#votesTable",
    votes.map(v => `
      <tr>
        <td>${escapeHtml(v.name)}</td>
        <td>${escapeHtml(v.vote)}</td>
        <td>${escapeHtml(fmtDate(v.updatedAt))}</td>
      </tr>
    `).join("")
  );
}

async function unlockAndRender(){
  const hint = $("#adminHint");
  const key = $("#adminKey")?.value.trim();
  if(key !== EVENT.adminKey){
    setHint(hint, "Clave incorrecta.", "bad");
    return;
  }
  setHint(hint, "Acceso concedido ✅ (cargando...)", "ok");

  try{
    const data = await apiGetAllJsonp();
    renderAdmin(data);
    setHint(hint, "Listo ✅", "ok");
  }catch(err){
    setHint(hint, "No se pudieron cargar datos. Falta doGet JSONP en Apps Script.", "bad");
    console.error(err);
  }
}

if(isAdminPage()){
  $("#unlockBtn")?.addEventListener("click", unlockAndRender);
  $("#refreshBtn")?.addEventListener("click", unlockAndRender);

  $("#exportBtn")?.addEventListener("click", async () => {
    try{
      const data = await apiGetAllJsonp();
      const payload = { exportedAt: nowISO(), ...data };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "revelacion_genero_export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }catch{
      alert("No se pudo exportar.");
    }
  });

  $("#clearLocalBtn")?.addEventListener("click", () => {
    localStorage.removeItem(LS_KEYS.RSVPS);
    localStorage.removeItem(LS_KEYS.VOTES);
    alert("Listo: se borró el demo local de este navegador.");
  });
}
