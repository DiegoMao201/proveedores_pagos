# Guía de Diseño Visual — Panel Pagos Proveedores Ferreinox

> **Cómo usar este documento**: es el brief de diseño que Claude Code debe seguir cuando implemente el frontend en Fase 3 y 4. Anexo a los prompts anteriores. Autocontenido: incluye tokens CSS, tipografía, componentes clave, signature element y reglas de escritura de copy.

---

## 1. Brief

**Producto**: panel ejecutivo de gestión de pagos a proveedores de Ferreinox S.A.S. BIC.

**Audiencia real**: 4 usuarios internos — Diego (admin/dueño), tesorería, contabilidad, gerencia. Todos toman decisiones financieras diarias sobre montos entre $500K y $50M pesos colombianos. Todos son adultos profesionales que llevan años en el negocio.

**Job to be done**: convertir información dispersa (correos, ERP, cartera, presupuestos de rebate) en decisiones rápidas y confiables — qué pagar hoy, cuánto ahorramos con descuentos por pronto pago, cómo van los rebates de Pintuco/Abracol/Goya, qué facturas están en riesgo de vencer.

**Contexto de la marca**: Ferreinox opera 5 tiendas Pintuco en el eje cafetero desde 1994. No es una startup: es una empresa establecida, familiar, seria. Factura entre 20 y 100 mil millones al año. La app debe verse a la altura del negocio: **cálida pero autoritativa, humana pero exacta**. Como una oficina bien puesta, no como un banco frío ni como una startup con emojis.

**El mundo del sujeto**: pintura, materiales, herramientas de precisión, muestras de color, ferretería. Este vocabulario visual da personalidad distintiva sin caer en clichés.

---

## 2. Design tokens

### 2.1 Colores institucionales (paleta primaria)

```css
:root {
  /* Primarios de marca */
  --color-red-deep:    #B21917;  /* Rojo profundo — acciones críticas, alertas de vencimiento, aging >30d */
  --color-red:         #E73537;  /* Rojo principal Ferreinox — CTAs primarios, estado activo */
  --color-orange:      #F0833A;  /* Naranja transicional — advertencias, aging 15-30d */
  --color-yellow:      #F9B016;  /* Amarillo Ferreinox — highlights, rebate escalones logrados */
  --color-cream:       #FEF4C0;  /* Crema — backgrounds suaves, cards de descuento capturado */

  /* Neutros cálidos (derivados, no fríos grises) */
  --color-ink:         #1A1614;  /* Casi negro con tinte cálido — texto primario */
  --color-graphite:    #4A4340;  /* Texto secundario */
  --color-stone:       #8A827E;  /* Texto terciario, labels */
  --color-parchment:   #FAF7F2;  /* Background principal — cálido, no blanco puro */
  --color-paper:       #FFFFFF;  /* Cards y superficies elevadas */
  --color-line:        #EDE6DA;  /* Bordes suaves */

  /* Semánticos derivados de la paleta */
  --color-success:     #4A7A3F;  /* Verde tierra, no verde electrónico */
  --color-info:        #3B6B8F;  /* Azul apagado, para info neutral */
}
```

**Reglas de uso**:
- Rojo profundo `#B21917`: solo para acciones críticas o urgencias reales (factura vencida, error irrecuperable). No usar como color decorativo — pierde impacto.
- Rojo `#E73537`: color de marca. Botones primarios, indicador de sección activa, badges de estado importante. Máximo un 15% de la superficie visible.
- Amarillo `#F9B016`: highlights positivos (descuento capturado, escalón logrado). No para advertencias — el amarillo aquí es de logro, no de peligro.
- Naranja `#F0833A`: rango medio de aging, tránsitos, advertencias suaves.
- Crema `#FEF4C0`: backgrounds de cards de destaque positivo. Aparece en momentos, no como base.
- Pergamino `#FAF7F2` es el background principal de la app. **No usar blanco puro** — resta calidez y contrasta duro con los rojos.

### 2.2 Tipografía

Dos familias, con roles bien definidos:

- **Nunito** (Google Fonts) — display + cuerpo. Cálida, redondeada, humana. Pesos: 400 (regular), 600 (semibold), 700 (bold), 800 (extrabold para display).
- **Inter** (Google Fonts) con `font-feature-settings: "tnum" 1, "cv11" 1` — números y datos tabulares. Garantiza que las columnas de montos, fechas y porcentajes se alineen perfecto.

```css
:root {
  --font-display: 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-body:    'Nunito', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono:    'Inter', ui-monospace, monospace;
  --font-numeric: 'Inter', ui-monospace, monospace;
}

/* Aplicar tabular figures automáticamente donde haya números */
.num, td.num, .amount, .date, .percent {
  font-family: var(--font-numeric);
  font-feature-settings: "tnum" 1;
  font-variant-numeric: tabular-nums;
}
```

**Escala tipográfica** (12pt base, ratio 1.25):

```css
--text-xs:   0.75rem;    /* 12px — captions, metadata */
--text-sm:   0.875rem;   /* 14px — labels, secondary text */
--text-base: 1rem;       /* 16px — body */
--text-lg:   1.125rem;   /* 18px — subtítulos */
--text-xl:   1.375rem;   /* 22px — títulos de card */
--text-2xl:  1.75rem;    /* 28px — títulos de sección */
--text-3xl:  2.25rem;    /* 36px — KPIs principales */
--text-4xl:  3rem;       /* 48px — hero numeric (solo dashboard principal) */
```

**Weights**: 400 para texto de cuerpo, 600 para labels y botones, 700 para títulos y KPIs, 800 solo para el hero del dashboard principal.

### 2.3 Espaciado y layout

Sistema de espaciado en múltiplos de 4px:

```css
--space-1: 0.25rem;  /* 4px  */
--space-2: 0.5rem;   /* 8px  */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
```

Radios: `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`, `--radius-xl: 20px`. **No usar corner-radius 0** (se ve institucional-frío) ni `9999px` decorativo salvo en badges y pills.

Sombras cálidas, no grises:

```css
--shadow-sm: 0 1px 2px 0 rgba(74, 67, 64, 0.06);
--shadow-md: 0 4px 12px -2px rgba(74, 67, 64, 0.10);
--shadow-lg: 0 12px 32px -8px rgba(74, 67, 64, 0.15);
--shadow-glow-red: 0 0 0 3px rgba(231, 53, 55, 0.15);  /* focus states */
```

---

## 3. Voz visual y personalidad

**Palabras clave**: cálido, exacto, tranquilo, confiable, colombiano.

**No debe verse como**: banco frío, startup jugetona, ERP corporativo genérico, dashboard de Bloomberg.

**Sí debe verse como**: oficina bien llevada, papel de calidad, muestras de pintura ordenadas en la pared del taller, un buen libro contable moderno.

**Densidad de información**: media-alta. Los usuarios prefieren ver mucho de un vistazo sin scroll. Pero cada dato debe respirar (padding generoso dentro de cards, líneas base de al menos 1.5x).

**Tono emocional por tipo de pantalla**:
- Dashboard general: sereno, panorámico, invita a leer sin ansiedad.
- Facturas urgentes: enfocado, sin decoración, un solo camino de acción claro.
- Rebates: celebratorio en logros, preciso en gap al siguiente escalón.
- Empty states: invitacionales, no disculpativos.

---

## 4. Signature element — la muestra de pintura

**Elemento distintivo memorable**: la escala de aging visualizada como **muestrario de pintura** — una franja horizontal de swatches de color que representa el estado de una factura o cartera. Cada swatch tiene el color literal de la marca:

```
[crema #FEF4C0]  [amarillo #F9B016]  [naranja #F0833A]  [rojo #E73537]  [rojo profundo #B21917]
 al día              1-14 días vto     15-30 días vto      31-60 días vto     >60 días vto
```

Este componente aparece en:
- El heatmap del cash flow (calendario coloreado por criticidad diaria).
- La barra de aging en el detalle de cada proveedor.
- El indicador visual junto a cada factura en las tablas.
- El "estado del portafolio" en el dashboard ejecutivo.

Es la única metáfora visual que la app se permite. **No agregar otras metáforas visuales** (herramientas, brochas, rodillos como iconos decorativos, etc.) — sería exceso. La metáfora vive solo en el color, no en la iconografía.

### 4.1 Componente: `<AgingSwatch />`

Cinta horizontal con 5 segmentos coloreados. Cada segmento crece proporcionalmente al volumen de facturas en ese bucket. Al hover, tooltip con el conteo y monto exacto de cada bucket. Uso: página de aging, dashboard general, perfil de proveedor.

### 4.2 Componente: `<PaymentCalendarHeatmap />`

Calendario tipo GitHub-contributions pero coloreado con la paleta Ferreinox: días sin actividad en crema clarito, días con pagos programados en escala amarillo→rojo según el volumen y criticidad. Al click en un día, se despliega la lista de facturas de ese día en un side panel.

---

## 5. Layout system

### 5.1 Shell de la app

```
┌───────────────────────────────────────────────────────────────┐
│  [Ferreinox logo]  Pagos Proveedores           [🔔] [Diego G ▾]│
├─────────────────┬─────────────────────────────────────────────┤
│                 │                                             │
│  Inicio         │                                             │
│  Tesorería  ▾   │       CONTENIDO PRINCIPAL                   │
│  Planificador   │                                             │
│  Rebates    ▾   │       (aquí vive cada página)               │
│  Proveedores    │                                             │
│  Usuarios       │                                             │
│                 │                                             │
│  ─────────      │                                             │
│  [rol actual]   │                                             │
│  Cerrar sesión  │                                             │
│                 │                                             │
└─────────────────┴─────────────────────────────────────────────┘
```

- Sidebar: 240px de ancho, background `--color-paper`, borde derecho en `--color-line`.
- Topbar: 64px de alto, background `--color-paper`, sombra sutil hacia abajo.
- Área de contenido: background `--color-parchment`, padding `--space-8`.
- Ancho máximo del contenido: 1440px, centrado.

En mobile (< 768px): sidebar colapsable con botón hamburguesa en topbar. Contenido a ancho completo con padding `--space-4`.

### 5.2 Grillas

- Dashboard general: grilla de 12 columnas, cards fluidos que ocupan 3, 4, 6, 8 o 12 columnas según jerarquía.
- Vistas de detalle (una factura, un proveedor): 2 columnas — 8/12 para contenido primario, 4/12 para metadata lateral.
- Tablas: ancho completo, sticky headers al scroll vertical.

---

## 6. Componentes clave con detalle

### 6.1 KPI Card (`<KPICard />`)

El elemento más repetido. Debe verse impecable.

```
┌─────────────────────────────────┐
│  PENDIENTE POR PAGAR            │ ← label, --text-sm, --color-stone, uppercase, letter-spacing
│                                 │
│  $ 47.320.500                   │ ← --text-3xl, --font-numeric, --color-ink, weight 700
│                                 │
│  ▲ 12% vs mes anterior          │ ← --text-sm, con ícono de tendencia
│                                 │
│  [AgingSwatch para este KPI]    │ ← el signature element aparece aquí cuando aplica
└─────────────────────────────────┘
```

- Background `--color-paper`.
- Borde `1px solid --color-line`.
- Radio `--radius-lg`.
- Padding `--space-6`.
- Sombra `--shadow-sm`.
- Hover: `--shadow-md` + translación de -2px en Y con transición 200ms.

**Variantes**:
- `variant="critical"`: fondo de acento crema `--color-cream`, borde en `--color-red`.
- `variant="success"`: swatch verde tierra `--color-success` como acento a la izquierda.

### 6.2 Tabla de facturas (`<InvoiceTable />`)

- Header sticky con background `--color-parchment` (se distingue del fondo blanco de las filas).
- Row hover: background `--color-cream` con opacidad 30%.
- Row selected: background `--color-cream` opacidad 60%, borde izquierdo 3px sólido `--color-red`.
- Zebra striping: NO. Usar líneas divisorias en `--color-line`.
- Números alineados a la derecha, con `font-variant-numeric: tabular-nums`.
- Fechas en formato `dd MMM yyyy` (ej. "15 jul 2026"), no numérico.
- Estado como badge inline (ver 6.3).
- Filtros y búsqueda en toolbar superior de la tabla.
- Paginación en toolbar inferior, con selector de "50 / 100 / 200 por página".
- Selección múltiple con checkboxes solo cuando hay acción bulk disponible.

### 6.3 Badges de estado (`<StatusBadge />`)

Pills pequeñas con radio `9999px`, padding `--space-1 --space-3`, `--text-xs`, weight 600.

- Al día: background `--color-cream`, texto `--color-graphite`.
- Por vencer (1-14d): background `#FEF4C0` con borde `--color-yellow`, texto `--color-graphite`.
- Vence pronto (15-30d): background `--color-yellow` con opacidad 20%, texto oscurecido del amarillo.
- Vencida (31-60d): background `--color-orange` con opacidad 15%, texto `--color-orange`.
- Muy vencida (>60d): background `--color-red-deep` con opacidad 12%, texto `--color-red-deep`, con ícono de alerta.
- Pagada: background `#EAEFEA`, texto `--color-success`, con ícono check.
- Excluida: background gris warm, texto tachado.

### 6.4 Botones

- **Primario**: background `--color-red`, texto blanco, hover `--color-red-deep`.
- **Secundario**: background `--color-paper`, borde `--color-line`, texto `--color-ink`, hover con background `--color-parchment`.
- **Terciario/link**: sin fondo, texto `--color-red`, underline al hover.
- **Destructivo**: solo para acciones irreversibles (eliminar exclusión activa, cancelar lote enviado). Background `--color-red-deep`. Confirmación modal obligatoria antes de ejecutar.
- **Success**: para acciones de captura positiva (marcar descuento aplicado). Background `--color-success`.

Todos con radio `--radius-md`, padding `--space-3 --space-6`, weight 600, transición 150ms.

Focus visible obligatorio con `--shadow-glow-red` de 3px alrededor.

### 6.5 Modales y drawers

- Modales para confirmaciones de acciones irreversibles y para formularios cortos (< 8 campos).
- Drawers laterales (desde la derecha, 480px de ancho) para detalles de factura, edición de proveedor, formularios largos.
- Overlay con `rgba(26, 22, 20, 0.4)`.
- Cerrar con click en overlay + tecla Escape + botón X en esquina superior derecha.

### 6.6 Formularios

- Labels arriba del input, no al lado.
- Label en `--text-sm`, weight 600, `--color-graphite`.
- Input con borde `--color-line`, hover borde `--color-stone`, focus borde `--color-red` con glow.
- Placeholder en `--color-stone` con opacidad 60%.
- Mensajes de error debajo del input en `--color-red-deep`, `--text-sm`, con ícono a la izquierda.
- Espaciado entre campos: `--space-4`.
- Botón submit al final, alineado a la derecha en modales, al inicio (izquierda) en formularios de página completa.

---

## 7. El dashboard ejecutivo (pantalla principal, la más importante)

Esta es la primera pantalla que Diego, tesorería, contabilidad y gerencia ven cada mañana. Debe ser la más lograda visualmente.

**Layout propuesto** (grilla de 12 columnas):

```
┌─────────────────────────────────────────────────────────────┐
│  Buenos días, {nombre}. Hoy es {fecha}                      │  ← greeting, sereno
│                                                             │
├──────────────┬──────────────┬──────────────┬───────────────┤
│  KPI:        │  KPI:        │  KPI:        │  KPI:         │
│  Por pagar   │  Ahorro      │  Vencidas    │  Rebate mes   │
│  esta semana │  capturable  │  (críticas)  │  proyectado   │
│              │              │              │               │
│  $ 12.4M     │  $ 340K      │  4 facturas  │  Escala 2 ✓   │
│  con AgingSw │  hasta 15/jul│  $ 890K      │  con progress │
├──────────────┴──────────────┴──────────────┴───────────────┤
│                                                             │
│   CALENDARIO DE PAGOS — próximos 30 días                    │
│                                                             │
│   [PaymentCalendarHeatmap — el signature element]           │
│                                                             │
├─────────────────────────────┬───────────────────────────────┤
│  Facturas urgentes          │  Top proveedores por volumen  │
│  (top 5 por criticidad)     │  (últimos 30 días)            │
│                             │                               │
│  [InvoiceTable compacta]    │  [ProviderList con muestras]  │
│                             │                               │
├─────────────────────────────┴───────────────────────────────┤
│                                                             │
│   PROGRESO DE REBATES — Pintuco / Abracol / Goya           │
│                                                             │
│   [3 cards horizontales con periodo actual, escala,        │
│    gap al siguiente escalón, y viabilidad estimada]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Detalle del greeting**: `--text-2xl`, weight 700, `--color-ink`. Fecha en `--text-lg`, weight 400, `--color-graphite`. Sin subtítulos motivacionales tipo "let's make it happen" — se ve infantil en app financiera.

**Adaptación por rol** (mismo layout, distinto énfasis):
- **Gerencia**: KPIs de resumen ejecutivo, sin tabla de facturas urgentes ni acciones. Solo lectura panorámica.
- **Tesorería**: incluye tabla de facturas urgentes con acciones inline (armar lote rápido).
- **Contabilidad**: incluye card adicional de "descuentos por resolver" y "retenciones a revisar".
- **Admin (Diego)**: ve todo lo anterior + card de "salud del sistema" con estados de IMAP, Dropbox, worker, backups.

---

## 8. Estilo de gráficas

Usar **Recharts** con paleta Ferreinox. Nunca usar los defaults de Recharts (azul-morado electrónico), siempre pasar `stroke` y `fill` custom.

**Reglas generales**:
- Fondo del gráfico: transparente (deja ver el card).
- Grid lines: `--color-line` con opacidad 60%.
- Ejes: `--color-stone`, sin ticks decorativos.
- Etiquetas: `--font-numeric`, `--text-xs`, `--color-graphite`.
- Tooltip custom: card blanco con `--shadow-md`, radio `--radius-md`, padding `--space-3`.

**Colores por tipo de gráfico**:
- Series de tiempo: gradient de `--color-red` a `--color-orange`.
- Comparación (bars): `--color-red` como serie principal, `--color-yellow` como serie de referencia/comparación.
- Distribución (pie/donut): usar toda la paleta en orden (cream → yellow → orange → red → red-deep).
- Progreso a meta: barra rellena con `--color-yellow` cuando incompleta, `--color-success` cuando 100%.

---

## 9. Estados: empty, loading, error, success

### 9.1 Empty states

**Nunca** decir "No hay datos". En su lugar, texto invitacional específico:
- Empty en facturas urgentes: "Ninguna factura urgente hoy. Todo bajo control."
- Empty en lotes de pago: "No has armado lotes todavía este mes. **Arma el primero →**"
- Empty en trazabilidad: "La trazabilidad aparece cuando ejecutes tu primera acción."

Cada empty state incluye un icono ilustrativo simple (line-icon 48px, en `--color-stone`) y opcionalmente un CTA.

### 9.2 Loading

- Skeletons con animación shimmer sutil (no spinners).
- Fondo del skeleton: `--color-line` con animación gradient.
- Nunca bloquear toda la pantalla con overlay — cargar sección por sección.
- Para acciones (guardar, enviar), botón en estado disabled con spinner inline y texto que cambia ("Guardando…").

### 9.3 Errores

- Errores de campo: debajo del input, específicos ("El correo debe tener formato válido, sin espacios").
- Errores de red o servidor: toast en esquina inferior derecha, background `--color-red-deep`, con opción "Reintentar".
- Errores catastróficos (500, worker caído): página completa con explicación en lenguaje humano y contacto para escalar.

**Copy de errores**: nunca disculpativo ("Perdón, algo salió mal"), siempre directo ("No pudimos guardar el lote. Verifica tu conexión y reintenta.")

### 9.4 Success

- Toasts en esquina inferior derecha, background `--color-success`, duración 4 segundos.
- Confirmaciones de acción usan mismo verbo que el botón que las disparó: botón "Enviar correo" → toast "Correo enviado a Pintuco".

---

## 10. Accesibilidad

**Contraste**: WCAG AA mínimo (4.5:1 para texto, 3:1 para elementos gráficos). Validar cada combinación color-fondo. Los rojos sobre crema pasan, los amarillos sobre blanco no — usar amarillo solo como fondo, texto encima siempre en `--color-ink`.

**Focus visible**: obligatorio en todos los elementos interactivos, con `--shadow-glow-red`. Nunca `outline: none` sin reemplazo.

**Keyboard navigation**: toda la app operable sin mouse. Tab order lógico. Enter dispara acción primaria en cada contexto. Escape cierra modales y drawers.

**Screen reader**: labels ARIA en todos los iconos-solo, alt text en imágenes de datos (gráficos), roles semánticos apropiados.

**Reduced motion**: respetar `prefers-reduced-motion` — deshabilitar transiciones no esenciales cuando el usuario lo tiene activo.

**Zoom hasta 200%**: layout no debe romperse. Testear.

---

## 11. Motion y animación

Restraint total. La app **no baila**. Animaciones solo cuando aportan información o feedback:

- Transiciones de página: 200ms fade-in del contenido principal, no del layout.
- Hover en cards: 200ms, translate -2px + sombra suave.
- Focus: instantáneo, sin transición.
- Modales/drawers: 250ms ease-out para aparecer, 200ms ease-in para desaparecer.
- Skeletons loading: shimmer sutil 1.5s loop.
- Toasts: slide-in desde abajo, 300ms, ease-out.
- Números que cambian (KPIs): tween sutil de 400ms al valor nuevo cuando hay actualización live.

**Prohibidas**: animaciones decorativas de fondo, elementos que se mueven sin razón, parallax, gradientes animados, cursors trail, confetti, easter eggs.

---

## 12. Copy y escritura

**Idioma**: español colombiano. "Tú" no "vos" ni "usted". Cercano pero profesional.

**Términos consistentes** (glosario mínimo):
- "Factura" no "documento" ni "invoice".
- "Proveedor" no "supplier".
- "Lote de pago" no "batch" ni "grupo".
- "Descuento por pronto pago" no "PP discount".
- "Rebate" (anglicismo pero es como lo llama el negocio).
- "Aging" (anglicismo pero universal en tesorería).
- "Cartera pendiente" no "outstanding".

**Verbos en botones**: exactos, activos, sin ambigüedad.
- "Armar lote" no "Crear grupo".
- "Enviar correo" no "Confirmar envío".
- "Marcar excluida" no "Cambiar estado".
- "Programar pago" no "Guardar".

**Labels de campos**: nombres que la gente reconoce del día a día.
- "Fecha de vencimiento" no "due_date".
- "Correo del contacto de pagos" no "payment_email".

**Empty states**: invitacionales, específicas al contexto.

**Confirmaciones**: siempre incluir qué se va a hacer y consecuencia.
- ✅ "Vas a enviar 12 facturas por $18.4M a pago programado el 15/jul. Se enviarán 4 correos a proveedores. ¿Continuar?"
- ❌ "¿Estás seguro?"

**Errores**: qué pasó, cómo resolverlo. Sin disculpas performativas.

---

## 13. Login

Pantalla dedicada, no shell de app. Fondo `--color-parchment`. Layout centrado, card único de 400px de ancho.

```
┌───────────────────────────────┐
│                               │
│      [Logo Ferreinox]         │
│                               │
│      Pagos Proveedores        │  ← --text-xl, weight 600, --color-graphite
│                               │
│      ─────────────────        │  ← divisor sutil
│                               │
│      Correo                   │
│      [_______________]        │
│                               │
│      Contraseña               │
│      [_______________]        │
│                               │
│      [    Ingresar    ]       │  ← botón primario, ancho completo del card
│                               │
│      ¿Olvidaste tu clave? →   │  ← link secundario, o pedir a admin en v1
│                               │
└───────────────────────────────┘
      Ferreinox S.A.S. BIC
      Uso interno · v1.0
```

- Sin decoración de fondo (nada de degradados llamativos, patrones, imágenes stock).
- Focus automático en el campo de correo al cargar.
- Enter en cualquier campo dispara login.
- Error de credenciales inline en la parte superior del card, `--color-red-deep`, sin dramatismos.

---

## 14. Referencias visuales conceptuales (para inspiración, no para copiar)

Cuando implementes, considera el espíritu de estas referencias, sin imitar detalles:

- **Linear**: densidad de información, exactitud tipográfica, restraint. Adaptado a paleta cálida.
- **Ramp**: dashboard financiero con calor humano, tablas claras, jerarquía visual disciplinada.
- **Craft**: tipografía cálida y layout editorial en herramienta de trabajo.
- **Notion en modo compacto**: densidad + calidez cream, sin ser desordenado.
- **Muestrarios de Pintuco físicos**: la disciplina del color como información. Buscar imágenes de "muestrario Pintuco" para inspiración del signature element.

**No inspirarse en**:
- Bloomberg terminal (frío, oscuro, denso al extremo).
- Bancos digitales estilo Nubank (paletas violeta/rosa saturadas).
- Dashboards genéricos de Metabase/Retool con defaults.
- Landing pages de startups con hero enormes y frases motivacionales.

---

## 15. Checklist antes de dar por buena una pantalla

Al implementar cada vista, verificar contra este checklist:

- [ ] Contraste WCAG AA en todos los textos e íconos.
- [ ] Focus visible en todos los interactivos.
- [ ] Números tabulares donde hay tablas y KPIs.
- [ ] Sin blanco puro `#FFFFFF` en el fondo principal (usar `--color-parchment`).
- [ ] Todos los estados (empty, loading, error) diseñados, no solo el "happy path".
- [ ] Copy en español colombiano, sin anglicismos innecesarios ni disculpas.
- [ ] Botones con verbos exactos y consistentes en toda la app.
- [ ] Responsive hasta 768px (mobile) sin romperse.
- [ ] `prefers-reduced-motion` respetado.
- [ ] Screenshots del resultado real (no del diseño teórico) para comparar contra este brief.
- [ ] Test con `--text-3xl` en 200% zoom — layout no colapsa.

---

## 16. Referencias técnicas de implementación

- **Stack**: Next.js 15 + Tailwind CSS + shadcn/ui.
- **Tailwind config**: extender con los tokens de color, fuentes y espaciado de este brief. NO usar los defaults de Tailwind para color (`red-500`, `yellow-400`) — usar solo los tokens custom.
- **Fuentes**: cargar Nunito e Inter desde Google Fonts con `next/font/google`, con `display: 'swap'` y subsets `['latin', 'latin-ext']`.
- **Iconos**: **Lucide React** exclusivamente, tamaños 16, 20, 24. Nunca mezclar sets de iconos.
- **Componentes base**: shadcn/ui como punto de partida (Button, Card, Table, Dialog, Sheet), pero override completo de estilos para respetar este brief. Nunca dejar los defaults.
- **Modo oscuro**: no en v1. Solo modo claro. Añadir dark mode es fast-follow post-MVP si el negocio lo pide.

---

**Fin de la guía.** Este documento es contrato visual — cualquier desviación debe documentarse explícitamente y justificarse contra un principio de este brief, no contra "creo que se ve mejor así".
