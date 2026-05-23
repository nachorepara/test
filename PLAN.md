# Plan de implementación — Generador paramétrico de G-code

Producto: web app que genera **G-code directo** (no STL) para piezas paramétricas
imprimibles en 3D, inspirado en FullControl pero con catálogo curado, login Google,
preview 3D y paywall.

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Alcance MVP | Catálogo curado + parámetros avanzados (híbrido) |
| Engine | TypeScript client-side en el browser |
| Impresoras al lanzar | Bambu A1, A1 mini, Elegoo Centauri Carbon, Creality Hi, Ender 3 V3 KE |
| Monetización | $2-3 por descarga (Stripe Checkout one-shot) |
| Output | Solo `.gcode` (sin STL — es el moat) |
| Stack | Next.js + TS + Tailwind + Three.js + `gcode-preview` + Supabase + Stripe + Vercel |
| Repo | GitHub privado |

## Principios de las iteraciones

1. **Cada iteración termina deployada y testeable.** Nada de PRs gigantes sin merge.
2. **Cada iteración entrega valor incremental** (excepto la 0, que es infra).
3. **Validación física obligatoria** en cualquier iteración que toque G-code real.
4. **No se agrega complejidad hasta que la iteración anterior funciona end-to-end.**

---

## Iteración 0 — Bootstrap

**Objetivo:** proyecto Next.js corriendo en Vercel desde commit a producción.

**Entregables:**
- Repo GitHub privado creado
- Next.js (App Router) + TypeScript + Tailwind + ESLint + Prettier
- shadcn/ui instalado (componentes base)
- Página `/` con título placeholder "ParaPrint — Coming soon"
- CI mínimo: lint + typecheck en cada push
- Deploy automático a Vercel desde `main`
- Variables de entorno definidas en `.env.example` (vacías)

**Acceptance:**
- `npm run dev` levanta sin warnings
- Push a `main` → deploy automático en Vercel
- URL pública accesible

**Out of scope:** cualquier funcionalidad real.

**Esfuerzo:** 1-2 días.

---

## Iteración 1 — Jabonera hardcodeada + descarga de G-code

**Objetivo:** alguien puede descargar un `.gcode` de una jabonera **imprimible
en una Bambu A1** desde la web. Sin sliders, sin login, sin pago. Solo el flujo
core de generación.

**Entregables:**
- Módulo `src/gcode/` con primitivas básicas:
  - `moveTo(x, y, z, feedrate)`
  - `extrudeTo(x, y, z, e, feedrate)`
  - `setHotend(temp)`, `setBed(temp)`, `setFan(pct)`
  - `home()`, `purge()`
  - `GcodeBuilder` class con `.toString()`
- Función `generateSoapDish()` con geometría fija (80×80×30mm, paredes 1.2mm,
  layer 0.2mm, vase mode opcional)
- Start/end G-code hardcodeado para Bambu A1 (extraído de un slice real de
  BambuStudio)
- Ruta `/jabonera` con botón **"Descargar G-code"**
- Click genera el `.gcode` en el cliente y dispara descarga

**Acceptance:**
- El `.gcode` descargado **se imprime exitosamente en una A1 física**
- Primer layer pega bien, paredes salen lisas, no hay underextrusion ni crashes
- El archivo abre sin errores en BambuStudio en modo "import G-code"

**Out of scope:** customización, preview 3D, otras impresoras, auth, pagos.

**Esfuerzo:** 1-2 semanas (la mayor parte va a calibrar el start G-code).

**Riesgo principal:** que el start G-code de A1 esté incompleto y la impresora
crashee o no extruya. Mitigación: copiar **exactamente** el start G-code que
BambuStudio genera para un slice de prueba.

---

## Iteración 2 — Sliders + preview 3D en vivo

**Objetivo:** el usuario customiza la jabonera con sliders y ve el resultado
en 3D antes de descargar.

**Entregables:**
- Refactor `generateSoapDish(params: SoapDishParams)` donde params expone:
  - `width`, `depth`, `height` (mm)
  - `wallThickness` (mm, mínimo 0.8)
  - `layerHeight` (0.12 / 0.16 / 0.2 / 0.28)
  - `drainHoles` (boolean)
- UI con sliders (shadcn/ui) + inputs numéricos sincronizados
- Componente `<GcodePreview>` usando lib `gcode-preview` (Three.js)
- Regeneración **debounced** (300ms) al cambiar parámetros
- Validación de rangos (mínimos/máximos) — input nunca puede generar G-code
  que crashee la impresora
- Indicador de "tiempo estimado de impresión" y "gramos de filamento"

**Acceptance:**
- Mover cualquier slider → preview se actualiza en < 500ms
- Descargar genera un `.gcode` que respeta los parámetros elegidos
- Sigue siendo imprimible en A1

**Out of scope:** otras impresoras, auth, pagos, más modelos.

**Esfuerzo:** 1-2 semanas.

---

## Iteración 3 — Sistema de printer profiles

**Objetivo:** soportar las 5 impresoras objetivo, cada una validada
**físicamente** con la jabonera.

**Entregables:**
- Tipo `PrinterProfile`:
  ```ts
  {
    id: string
    name: string
    bedSize: { x, y, z }
    maxAccel: number
    defaultTemps: { hotend, bed }
    startGcode: string
    endGcode: string
    quirks?: { noPlanarOk?: boolean, ... }
  }
  ```
- 5 perfiles hardcodeados: A1, A1 mini, Centauri Carbon, Creality Hi, Ender 3 V3 KE
- Cada start/end G-code copiado del slicer oficial de cada impresora
- Selector de impresora en UI (dropdown con thumbnail)
- Engine inyecta start/end correctos y valida que el objeto entre en la cama
- Mensaje claro si los params elegidos no entran en la impresora seleccionada

**Acceptance:**
- Para **cada una** de las 5 impresoras: jabonera con params default se imprime
  sin crashes, primer layer correcto, sin warnings del firmware
- Si alguna impresora no se puede testear físicamente → **sale del MVP**
  (mejor 3 sólidas que 5 a medias)

**Out of scope:** detección automática, perfiles editables por usuario.

**Esfuerzo:** 1-2 semanas (mayormente testeo físico iterativo).

**Hito de negocio:** después de esta iteración, el producto **ya es útil**.
Cualquier persona con una de las 5 impresoras puede usarlo gratis (sin login).
Buen momento para mostrarlo a 2-3 amigos y recolectar feedback.

---

## Iteración 4 — Auth Google + 1 descarga gratis

**Objetivo:** identificar usuarios y trackear descargas para preparar el paywall.

**Entregables:**
- Setup proyecto Supabase (free tier)
- Auth Google configurado vía Supabase Auth
- Schema DB inicial:
  ```sql
  users (id, email, google_id, free_download_used boolean, created_at)
  downloads (id, user_id, model_id, params_json, printer_id, created_at)
  ```
- Botón "Login con Google" en header
- Lógica de paywall (mock — sin Stripe aún):
  - No logueado → CTA "Login para descargar"
  - Logueado + `free_download_used = false` → descarga gratis, marca flag
  - Logueado + flag true → modal "Necesitás pagar" (botón placeholder)
- Página `/mis-descargas` lista historial del usuario (con params usados)

**Acceptance:**
- Usuario nuevo se loguea con Google → puede descargar 1 vez
- Segundo intento de descarga muestra el paywall mock
- Historial persiste entre sesiones

**Out of scope:** Stripe real, recuperar gratis (es 1 sola vez por user).

**Esfuerzo:** 1 semana.

---

## Iteración 5 — Stripe paywall real

**Objetivo:** generar ingresos reales.

**Entregables:**
- Stripe Checkout en modo "payment" (one-shot)
- Botón "Pagar $2.50 y descargar" → crea Checkout Session con metadata
  `{ user_id, model_id, params_hash, printer_id, expires_at }`
- API route `/api/checkout/create` (genera session)
- Webhook `/api/stripe/webhook`:
  - Verifica firma
  - En `checkout.session.completed` → crea row en `downloads` + sube `.gcode`
    a Supabase Storage + emite signed URL de 24h
- Página `/descarga/[id]` con link al `.gcode`
- Emails de confirmación (Resend free tier)
- Empezar en **modo test** con cards de prueba, después activar live

**Acceptance:**
- Pago con test card (`4242 4242 4242 4242`) → recibís el `.gcode` correcto,
  queda en `/mis-descargas`
- Si el pago falla, no se entrega nada
- Webhook idempotente (no duplica descargas si Stripe reenvía)

**Out of scope:** refunds automáticos, suscripciones, cupones.

**Esfuerzo:** 1 semana.

**Hito de negocio:** después de esta iteración, **se puede facturar**.
Buen momento para hacer el primer pago real (puede ser tuyo, para validar end-to-end).

---

## Iteración 6 — Multi-modelo (refactor) + Jarrón

**Objetivo:** arquitectura limpia para escalar modelos + segundo modelo en producción.

**Entregables:**
- Refactor: cada modelo vive en `src/models/<slug>/` con:
  ```
  models/jabonera/
    index.ts       // export { generate, schema, defaults, name }
    schema.ts      // tipo TS + validación zod
    preview.png    // thumbnail
  ```
- Registry de modelos sincronizado con tabla `models` en DB (seed al deploy)
- Página `/catalogo` con grid de modelos (thumbnail + nombre + precio)
- Páginas `/m/[slug]` reemplazan a `/jabonera`
- **Nuevo modelo: Jarrón**
  - Params: altura, diámetro base, diámetro top, twist (grados), ondulación (amplitud)
  - Modo vase (single wall, spiral)
- Test físico en al menos 2 impresoras

**Acceptance:**
- Catálogo muestra 2 modelos seleccionables
- Ambos generan G-code válido y son comprables
- Agregar un tercer modelo en el futuro requiere solo crear la carpeta nueva

**Out of scope:** contenido user-generated, ratings, comentarios.

**Esfuerzo:** 1-2 semanas.

---

## Iteración 7 — Pantalla de lámpara + modo experimental

**Objetivo:** mostrar el **moat real** — efectos que ningún slicer hace.

**Entregables:**
- **Nuevo modelo: Pantalla de lámpara**
  - Params básicos: altura, diámetro, grosor pared, patrón de perforaciones
- Toggle "Modo experimental" que habilita 1-2 presets:
  - **Salto Z entre layers** (movimiento Z no monotónico para texturas raras)
  - **Fuzzy skin programático** (perturbación XY en cada extrude)
- Disclaimer claro: "Modo experimental: puede no funcionar en todas las impresoras"
- En el `PrinterProfile`, flag `quirks.experimentalOk` para saber dónde habilitarlo
- Test físico del modo estándar en las 5; experimental en al menos A1 y Centauri

**Acceptance:**
- Lámpara estándar imprimible en las 5 impresoras soportadas
- Modo experimental imprimible al menos en A1 y Centauri Carbon
- Disclaimer visible y bloqueo en impresoras sin `experimentalOk`

**Out of scope:** editor de G-code custom, presets ilimitados.

**Esfuerzo:** 1-2 semanas.

**Hito de negocio:** ahora tenés una historia de marketing real
("hacé cosas que tu slicer no puede").

---

## Iteración 8 — Launch

**Objetivo:** producto lanzado públicamente con primer usuario externo pagando.

**Entregables:**
- Landing real (no placeholder):
  - Hero con render/video de los 3 modelos
  - Sección "cómo funciona" en 3 pasos
  - Pricing claro
  - Galería de impresiones reales (sacar fotos vos)
  - FAQ corto
- SEO básico: meta tags, sitemap.xml, robots.txt, og:image por modelo
- Analytics (Plausible o PostHog free tier)
- Política de privacidad + términos (templates de termsfeed.com adaptados)
- Dominio custom configurado
- Stripe activado en **modo live**
- Posts de lanzamiento en:
  - r/3Dprinting
  - r/BambuLab
  - Discord oficial de Elegoo
  - Discord oficial de Bambu
- Pedir feedback explícito en cada post

**Acceptance:**
- Producto live en dominio custom
- Primer pago real procesado (puede ser tuyo)
- Al menos 1 usuario externo loguea y descarga (gratis o pago)

**Out of scope:** paid ads, programa de afiliados, traducciones.

**Esfuerzo:** 1 semana.

---

## Resumen de timeline

| Iteración | Tiempo | Hito acumulado |
|---|---|---|
| 0 | 1-2 días | Deploy automático funciona |
| 1 | 1-2 sem | Primera jabonera imprime en A1 |
| 2 | 1-2 sem | Usuario customiza con sliders |
| 3 | 1-2 sem | 5 impresoras soportadas |
| 4 | 1 sem | Login + 1 free download |
| 5 | 1 sem | **Primer ingreso posible** |
| 6 | 1-2 sem | 2 modelos en catálogo |
| 7 | 1-2 sem | Moat real (no-planar) |
| 8 | 1 sem | **Producto lanzado** |

**Total estimado:** 8-12 semanas part-time.

---

## Post-MVP (no priorizado, para roadmap futuro)

- Más modelos (porta-velas, organizadores, macetas, juguetes articulados)
- Más impresoras (K1/K2, P1S, X1C, Prusa)
- Suscripción mensual ($5 = 10 descargas)
- Compartir diseños (URL pública con params)
- Modificar y re-descargar diseño ya comprado (sin pagar de nuevo)
- Editor de start/end G-code custom (para power users)
- API pública (B2B para makerspaces)
- Programa de afiliados
- Versión local self-hosted (open source de un subset?)

---

## Riesgos transversales

| Riesgo | Mitigación |
|---|---|
| Start G-code incorrecto crashea impresoras de usuarios | Validación física obligatoria + disclaimer "test en tu impresora antes de imprimir grande" |
| Costos de Supabase/Vercel se disparan con tráfico | Free tier alcanza para primeros 1000 users; monitorear y migrar a paid tier si hace falta |
| FullControl o similar lanza producto idéntico | Moat = curaduría + impresoras testeadas + UX, no la tecnología |
| Fee de Stripe come el margen | $2.50 - $0.38 (Stripe) = $2.12 netos. Si baja la conversión, subir precio a $3 |
| Bambu/Elegoo cambian el firmware y rompen start G-code | Versionar profiles, mantener `profile_version` en cada descarga, regenerar si el user pide |

---

## Próximos 3 pasos para arrancar Iteración 0

1. Crear repo GitHub privado `paraprint` (o como termine llamándose)
2. Crear cuentas en: Supabase, Stripe (test mode), Vercel
3. Scaffolding Next.js + Tailwind + shadcn/ui + push a main → primer deploy
