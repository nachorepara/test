# ParaPrint — Contexto para Claude Code

## Estado actual
- **Iteración 0 completa y deployada en Vercel** (rama `master`)
- URL en Vercel: página "ParaPrint — Coming soon"
- Stack: Next.js 15 + TypeScript + Tailwind v4 + shadcn/ui + ESLint + Prettier

## Errores cometidos en sesiones anteriores — NO repetir

### 1. No mergear a `master` antes de cerrar la sesión
- Todo el trabajo quedó en una rama de Claude (`claude/...`) sin mergearse a `master`
- Vercel deployea desde `master` — si no se mergea, el deploy no se actualiza
- **Regla:** antes de terminar cualquier sesión, asegurarse de que el trabajo esté en `master`

### 2. Pedir al usuario que cambie configuraciones en el dashboard de Vercel — CRÍTICO
- En una sesión anterior le pedí al usuario que cambiara el Output Directory en el dashboard de Vercel (de `public` a `.next`). Eso rompió el deploy completamente y generó un error 404.
- **El usuario no sabe programar.** Pedirle que toque configuraciones técnicas en dashboards externos es inaceptable — no tiene forma de saber qué está haciendo ni cómo revertirlo si algo sale mal. Tuvo que arreglarlo a mano sin entender qué estaba pasando, y estuvo a punto de abandonar el proyecto por esa frustración.
- La solución correcta siempre es arreglarlo desde el código (en este caso, `vercel.json` con `"framework": "nextjs"`), commitear y pushear. Nunca delegar configuraciones técnicas al usuario.
- **Regla absoluta:** NUNCA pedirle al usuario que cambie algo en el dashboard de Vercel, Supabase, Stripe, GitHub o cualquier otra herramienta. Si algo necesita configuración externa, o lo hace Claude con las herramientas disponibles, o se le da al usuario un paso a paso con capturas exactas y reversión clara. Preferir siempre la solución por código.

### 3. Entrar en loop modificando archivos CSS/config
- Una sesión anterior entró en un loop cambiando `globals.css` múltiples veces (de `@tailwind` directives a `@import "tailwindcss"` y viceversa), dejando el archivo roto y obligando al usuario a arreglarlo manualmente
- **El CSS correcto para Tailwind v4 + Next.js 15 es:**
  ```css
  @import "tailwindcss";

  @theme {
    --color-border: hsl(214.3 31.8% 91.4%);
    --color-background: hsl(0 0% 100%);
    --color-foreground: hsl(222.2 84% 4.9%);
    --color-muted-foreground: hsl(215.4 16.3% 46.9%);
  }

  @layer base {
    * {
      border-color: var(--color-border);
    }
    body {
      background-color: var(--color-background);
      color: var(--color-foreground);
    }
  }
  ```
- **Regla:** no tocar `globals.css` ni la config de Tailwind sin una razón muy clara. El setup actual funciona.

### 4. Hacer cambios destructivos sin confirmar con el usuario
- **Regla:** ante cualquier acción que afecte `master`, ramas principales, o configuraciones de Vercel/Supabase/Stripe, confirmar con el usuario antes de proceder

## Convenciones del proyecto

- Rama de producción: `master` (no `main`)
- Deploy automático: Vercel desde `master`
- CI: GitHub Actions en cada push (lint + typecheck)
- Las sesiones de Claude trabajan en ramas `claude/...` y **deben mergearse a `master` antes de terminar**

## Stack y decisiones cerradas (ver PLAN.md para detalle completo)

- Engine de G-code: TypeScript client-side en el browser
- Output: solo `.gcode` (sin STL)
- Monetización: Stripe Checkout one-shot ($2-3 por descarga)
- Auth: Supabase + Google OAuth
- Impresoras al lanzar: Bambu A1, A1 mini, Elegoo Centauri Carbon, Creality Hi, Ender 3 V3 KE

## Próximo paso: Iteración 1

Ver `PLAN.md` — sección "Iteración 1 — Jabonera hardcodeada + descarga de G-code"
