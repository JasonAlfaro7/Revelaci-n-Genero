# Revelación de Género 🐝 (CORS FIX)

Este zip ya evita el error de CORS con Google Apps Script.

## Cómo funciona
- **RSVP y Votos**: se envían con `navigator.sendBeacon()` (no requiere CORS).
- **Panel admin**: lee con **JSONP**, así que debes agregar `doGet()` en Apps Script.

## 1) Agregar doGet (JSONP) en tu Apps Script
Pega esto en tu Apps Script (además de tu doPost actual):

```js
function doGet(e) {
  const action = e.parameter.action || "";
  const secret = e.parameter.secret || "";
  const callback = e.parameter.callback || "";

  if(secret !== SECRET) {
    return js(callback, { ok:false, message:"Unauthorized" });
  }

  if(action === "getAll") {
    const data = {
      ok: true,
      updatedAt: new Date().toISOString(),
      rsvps: toObjects(SpreadsheetApp.getActive().getSheetByName(SHEET_RSVP)),
      votes: toObjects(SpreadsheetApp.getActive().getSheetByName(SHEET_VOTES))
    };
    return js(callback, data);
  }

  return js(callback, { ok:false, message:"Unknown action" });
}

function js(callback, obj) {
  const out = callback ? `${callback}(${JSON.stringify(obj)});` : JSON.stringify(obj);
  return ContentService.createTextOutput(out)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
```

Luego: **Deploy → Manage deployments → Edit → Deploy** (redeploy).

## 2) Cambios que debes hacer
- En `js/app.js` cambia:
  - `adminKey: "1234"` por tu clave.
  - `API_SECRET` para que sea igual al `SECRET` del Apps Script.

API_URL configurada:
https://script.google.com/macros/s/AKfycbw3ckPoJuO9OkeKL3U_QZ3tmaI03WsWJBDUgfcV5MygoU1JI58fFuLhSpP6Omyl4Uqwjw/exec
