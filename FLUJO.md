# 📘 CLASSVAULT EDUCATIVO — Documento Maestro de Flujo y Arquitectura

> **Estrella del norte del proyecto.** Este documento define la visión, la estructura, el flujo y el roadmap del ecosistema Zenth Academy Educativo. Es la referencia de arquitectura y producto para todo el equipo.
>
> **Versión:** 1.0 — **Estado:** Activo — **Última actualización:** 2026-08-16

---

## 1. 🎯 Visión del Producto

**Zenth Academy Educativo** es una plataforma de gestión educativa todo-en-uno (LMS + herramientas docentes) que compite — y aspira a superar — a soluciones como Moodle, Canvas, Google Classroom y Edmodo en la experiencia de uso, sin sacrificar potencia.

**Nuestra promesa de valor:**
> Un solo lugar donde el docente **crea cursos profesionales, imparte contenido interactivo, evalúa con exámenes y cuestionarios, califica, certifica y construye comunidad** — y donde el estudiante **aprende, practica, rinde evaluaciones y obtiene certificados verificables** — todo con **materiales compartibles sin fricción (QR)** y una **configuración personal completa**.

### Principios rectores
1. **Curso-centrismo:** el curso es la unidad principal de trabajo del docente y la unidad de aprendizaje del estudiante.
2. **Estructura predecible:** cualquier curso, sin importar el contenido, sigue el mismo esqueleto: Configuración → Contenido → Estudiantes → Solicitudes → Certificados → Foro.
3. **Bajo acoplamiento, alta cohesión:** módulos independientes (Cursos, Materiales, Exámenes, Foro…) con APIs limpias.
4. **Multi-rol y multi-empresa:** admin → docente → estudiante, con contexto empresarial aislado por tenant.
5. **Cero fricción para compartir:** los materiales se comparten con QR y enlaces públicos temporales, sin que el receptor necesite login.
6. **Datos accionables:** todo (progreso, calificaciones, solicitudes, comparticiones) es medible y exportable.

---

## 2. 🏛️ Pilares del Producto

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLASSVAULT EDUCATIVO                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  📚 CURSOS          🗂️ MATERIALES          ⚙️ CONFIGURACIÓN          │
│  (Núcleo LMS)       (Compartición QR)      (Personalización)         │
│  ─────────────      ─────────────────       ───────────────────       │
│  • Mis Cursos       • Subir archivos       • Perfil                 │
│  • Crear Curso      • Generar QR           • Notificaciones         │
│  • Configuración    • Historial            • Preferencias           │
│  • Contenido        • Acceso público       • Seguridad/Contraseña   │
│  • Estudiantes        sin login            • Avatar / Marca         │
│  • Solicitudes      • Estadísticas                                 │
│  • Certificados                                                        │
│  • Foro del curso                                                    │
│                                                                     │
│  ─── Módulos de apoyo transversal ────────────────────────────────  │
│  📝 Exámenes Online · 📋 Cuestionarios Dinámicos · 🎨 Pizarra        │
│  👥 Alumnos (unificado) · 👪 Grupos · 💬 Comunidad/Foro Global      │
│  🗃️ Carpeta Docente · 🔌 Integraciones (Teams/Slack/Zoom)           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. 🧩 Arquitectura Técnica

### 3.1 Vista general

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend** | React 19 + Vite + Tailwind CSS + React Router 7 | SPA por roles; estado local + context; servicios API centralizados |
| **Backend** | FastAPI (Python) + SQLAlchemy 2.x | API REST `/api/v1`, auth JWT, multi-tenant, lógica de negocio |
| **Base de datos** | PostgreSQL (Supabase) | Persistencia; JSONB para estructuras flexibles |
| **Migraciones** | Alembic | Esquema versionado (pendiente: tablas educativas) |
| **Archivos** | Uploads locales + S3 (opcional) | Imágenes, PDFs, videos, recursos |
| **Tiempo real** | WebSocket (plan) | Pizarra colaborativa, notificaciones push |

### 3.2 Estructura de carpetas (estado objetivo)

```
back/
├── app/
│   ├── api/            # Routers FastAPI por módulo
│   │   ├── cursos.py           # Núcleo: cursos + contenido + estudiantes
│   │   ├── materiales.py       # NUEVO: subir + QR + acceso público
│   │   ├── notificaciones.py   # NUEVO: panel + eventos
│   │   ├── foro.py             # Extender: foro por curso
│   │   └── ... (existentes)
│   ├── models/         # SQLAlchemy (cursos, lecciones, progreso, ...)
│   ├── schemas/        # Pydantic (validación de entrada/salida)
│   ├── services/       # Lógica de negocio reutilizable
│   ├── core/           # Seguridad, middleware, dependencias
│   └── utils/
├── alembic/            # Migraciones versionadas
├── uploads/            # Archivos subidos
└── static/

front/
└── src/
    ├── pages/          # Vistas de alto nivel por rol
    ├── components/     # Componentes por módulo
    │   ├── cursos/     # MisCursos, CursoDetalle, Contenido, Estudiantes...
    │   ├── materiales/ # SubirArchivo, GeneradorQR, Historial...
    │   ├── config/     # Perfil, Notificaciones, Preferencias
    │   └── ...
    ├── services/       # Clientes API (cursosService, materialesService...)
    ├── context/        # Contextos globales
    ├── hooks/          # Hooks reutilizables
    └── utils/
```

---

## 4. 👤 Roles, Permisos y Navegación

### 4.1 Jerarquía de roles

```
super_admin (plataforma) → admin (empresa) → docente → estudiante
```

| Rol | Qué puede hacer |
|---|---|
| **Admin** | Todo lo del docente + gestión de usuarios, empresas, config global, integraciones, promociones, pagos |
| **Docente** | Crear/gestionar cursos, materiales, exámenes, cuestionarios, pizarras, foro, carpeta docente, calificar, certificar, aprobar solicitudes |
| **Estudiante** | Inscribirse, ver catálogo, cursar lecciones, rendir evaluaciones, ver progreso/calificaciones, foro del curso, certificados |

### 4.2 Mapa de navegación por rol (estado objetivo)

```
├── /login · /registro                     [Público]
├── /compartir/:codigo                     [Público — pantalla del aula del docente]
│
├── /admin                                 [Admin]
│   ├── Dashboard                          KPIs globales
│   ├── Usuarios · Pagos · Promociones · Config
│   └── Módulos compartidos (ver abajo)
│
├── /docente                               [Admin + Docente]
│   ├── Dashboard                          KPIs propios
│   └── Módulos compartidos (ver abajo)
│
├── /estudiante                            [Estudiante]
│   ├── Dashboard
│   ├── Mis Cursos / Catálogo
│   ├── Curso /:id  → Config? No → Contenido → Lección /:leccionId
│   ├── Comunidad
│   ├── Certificados
│   └── Notificaciones
│
├── MÓDULOS COMPARTIDOS (admin/docente):
│   📚 Cursos        → /cursos (Mis Cursos) + /cursos/nuevo + /cursos/:id
│       └── Dentro del curso (tabs):
│           ├── Configuración   título·descripción·imagen·precio·bloqueos
│           ├── Contenido       Módulos → Lecciones (video/texto/examen/
│           │                    cuestionario/recurso/pizarra)
│           ├── Estudiantes     lista · progreso · calificaciones · liberar
│           ├── Solicitudes     aprobar/rechazar (cursos pagos)
│           ├── Certificados    generar / ver / cancelar
│           └── Foro            comunidad del curso (NUEVO)
│   🗂️ Materiales   → /materiales (subir + QR + historial)   [NUEVO]
│   📝 Exámenes     → /examenes (grupos, resultados, revisión)
│   📋 Cuestionarios → /cuestionarios (+ análisis) [análisis NUEVO]
│   👥 Alumnos      → /alumnos (+ detalle) [detalle NUEVO]
│   🎨 Pizarra      → /pizarra (+ colaborativa) [colaborativa NUEVO]
│   💬 Comunidad    → /foro
│   🏆 Certificados → /certificados
│   🗃️ Carpeta Docente → /carpeta
│   ⚙️ Configuración → Perfil · Notificaciones · Preferencias  [NUEVO]
```

---

## 5. 📚 PILAR CURSOS — Flujo detallado

### 5.1 Ciclo de vida del curso

```
BORRADOR ──publicar──▶ PUBLICADO ──▶ (estudiantes solicitan / se inscriben)
   ▲                        │
   └────editar──────────────┘
PUBLICADO ──estudiantes cursan──▶ PROGRESO (0→100%) ──completar──▶ CERTIFICADO
                                                                    │
                                            (generación automática o manual)
```

### 5.2 Anatomía interna del curso (esqueleto estándar)

```
CURSO
├── Configuración
│   ├── Título · Descripción · Imagen · Categoría · Nivel
│   ├── Precio: gratis / pago (monto, moneda, método, instrucciones)
│   ├── Bloqueo: ninguno / fecha / secuencial / desempeño / mixto
│   └── Etiquetas · Requisitos · Objetivos · Público objetivo
│
├── Contenido  (Módulos → Lecciones)
│   ├── Módulo 1
│   │   ├── Lección A — tipo: VIDEO      (YouTube/URL)
│   │   ├── Lección B — tipo: TEXTO      (editor enriquecido)
│   │   ├── Lección C — tipo: EXAMEN     (vínculo a examen del sistema)
│   │   ├── Lección D — tipo: CUESTIONARIO (vínculo a cuestionario)
│   │   ├── Lección E — tipo: RECURSO    (PDF, link, archivo)
│   │   └── Lección F — tipo: PIZARRA    (vínculo a pizarra)
│   └── Módulo 2 ...
│
├── Estudiantes
│   ├── Lista (inscritos con acceso activo)
│   ├── Progreso individual (%, lecciones completadas, fechas)
│   └── Calificaciones (nota por lección/evaluación, promedio)
│
├── Solicitudes  (cursos pagos)
│   ├── Pendientes → aprobar (con comentario) / rechazar
│   └── Historial
│
├── Certificados
│   ├── Generar (manual o automático al 100%)
│   ├── Código único CERT-XXXX · Verificación · Cancelación
│   └── Descarga/impresión
│
└── Foro del curso
    ├── Posts con curso_id (visible solo para inscritos)
    └── Comentarios · Likes
```

### 5.3 Flujos de rol

**Flujo docente (crear y administrar):**
1. `Mis Cursos` → lista de cursos propios (o todos si admin) con estado
2. `Crear Curso` → wizard: datos básicos → precio → módulos/lecciones → publicar
3. Dentro del curso, tabs: Configuración / Contenido / Estudiantes / Solicitudes / Certificados / Foro
4. Contenido: crear módulo → añadir lecciones con tipo → reordenar
5. Estudiantes: ver lista → ver progreso → liberar lecciones → calificar
6. Solicitudes: aprobar acceso pagado al confirmar referencia de pago
7. Certificados: generar para quienes completaron (o automático)

**Flujo estudiante (aprender):**
1. Catálogo → ver detalle del curso (precio, contenido, requisitos)
2. Inscribirse (gratis) o Solicitar acceso (pago: método + referencia)
3. Aprobado → cursar: módulos en orden (respetando bloqueos) → lecciones
4. Marcar completadas → progreso % visible → evaluaciones calificadas
5. Curso 100% → certificado disponible → descargar
6. Participar en el foro del curso

---

## 6. 🗂️ PILAR MATERIALES — Flujo detallado

> **REGLA DE ORO (corregida 2026-08-17):** NO existe QR de material para alumnos.
> NADA se comparte con alumnos por QR. Los alumnos ingresan desde su perfil al
> material disponible de sus cursos (cada módulo de curso tiene lo necesario).
> La compartición con QR es **EXCLUSIVA del docente** para clases presenciales.

### 6.1 "Compartir en clase" — sala de proyección del docente (flujo actual)

```
CARPETA DEL DOCENTE (Mi carpeta → /materiales)
│
├── 1. El docente crea su carpeta con el material necesario (enlaces/PDF/PPT/Excel)
│        (MaterialCompartido: tipo enlace | texto | archivo)
│
├── 2. Botón "Compartir en clase" → crea la SALA (HistorialComparticion ACTIVA)
│        • Nace el QR de vinculación: URL pública /compartir/{codigo}
│        • Una sala activa a la vez por docente (como WhatsApp Web)
│
├── 3. La PC del aula abre la URL pública /compartir/{codigo} (SIN login)
│        • Muestra el QR de vinculación + código de la sala
│
├── 4. El docente escanea el QR con su celular (plataforma abierta, sesión propia)
│        • POST /compartir/{codigo}/vincular → solo el DUEÑO puede (403 si no)
│        • La sala pasa de ESPERANDO → ACTIVO
│
├── 5. El docente elige el material desde su panel → aparece en la pantalla del aula
│        • POST /compartir/{codigo}/material  (solo el dueño)
│        • POST /compartir/{codigo}/quitar    (vuelve al QR de espera)
│
└── 6. SALIR cuando quiera → POST /compartir/{codigo}/cerrar
         • Sala CERRADA con fecha_fin + duración (como cerrar WhatsApp Web)
         • Queda registrada en el Historial de Comparticiones
```

### 6.2 Reglas de privacidad (no negociables)

1. **El QR es SOLO del docente** — no existe ningún QR de material para alumnos.
2. **Nada se comparte con alumnos por QR** — los alumnos entran desde su perfil
   al material disponible de sus cursos.
3. **Solo el docente dueño de la sala controla** (vinculación, materiales, cierre).
4. El estado público (`GET /compartir/{codigo}`) **NO expone datos del docente**
   ni tokens internos: solo estado + material activo (titulo/tipo/contenido).
5. Al terminar, la sala se cierra: la pantalla del aula deja de mostrar contenido.

### 6.3 Endpoints — Compartir en clase

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/compartir/salas` | docente | Crear/reanudar sala activa del docente |
| GET | `/compartir/salas/activa` | docente | Sala activa del docente (reanudar) |
| GET | `/compartir/{codigo}` | **público** | Estado de la sala (pantalla del aula) |
| POST | `/compartir/{codigo}/vincular` | opcional | Vincula la sesión del docente dueño |
| POST | `/compartir/{codigo}/material` | docente dueño | Envía material a la pantalla |
| POST | `/compartir/{codigo}/quitar` | docente dueño | Quita el material de la pantalla |
| POST | `/compartir/{codigo}/cerrar` | docente dueño | Termina la sesión (CERRADO + duración) |

La sala reutiliza `HistorialComparticion` (tabla `historial_comparticiones`):
estado ESPERANDO/ACTIVO/CERRADO, `session_id` = código de sala, `recursos_compartidos`
JSON = materiales mostrados, `fecha_inicio/fecha_fin/duracion_segundos` para el historial.

### 6.4 Historial de Comparticiones

- Reutiliza `HistorialComparticion` + API `/historial/comparticiones` (listar/cerrar).
- UI: `HistorialComparticiones.jsx` (stats total/activas/cerradas, filtros, duración).
- Cada sala cerrada queda registrada con su duración (como sesiones de WhatsApp Web).

---

## 7. ⚙️ PILAR CONFIGURACIÓN — Flujo detallado

| Sección | Contenido | Backend |
|---|---|---|
| **Perfil** | Nombres, apellidos, teléfono, foto/avatar (upload), especialidad, biografía, institución | `PUT /auth/me` + upload avatar |
| **Seguridad** | Cambiar contraseña (valida actual) | `POST /auth/me/cambiar-password` |
| **Notificaciones** | Panel con lista de eventos (solicitudes, publicaciones, mensajes, certificados), marcar leída, preferencias on/off por tipo | **NUEVO**: modelo `notificaciones`, endpoints CRUD + `no_leidas` + `marcar_leida` |
| **Preferencias** | Tema (claro/oscuro), idioma, notificaciones por email/push, privacidad | **NUEVO**: `PUT /auth/me/preferencias` (JSON en usuario) |

---

## 8. 🗄️ Modelo de Datos (estado objetivo)

### 8.1 Núcleo cursos

```
CURSO
├── id, titulo, descripcion, categoria, nivel, imagen_url
├── docente_id, docente_nombre, estado (BORRADOR/PUBLICADO)
├── precio_tipo (GRATIS/PAGO), precio_monto, moneda, metodo_pago, instrucciones_pago
├── tipo_bloqueo (NINGUNO/FECHA/SECUENCIAL/DESEMPEÑO/MIXTO), bloqueo_config JSON
├── modulos JSON  →  [ { id, titulo, lecciones: [ { id, titulo, tipo, contenido, evaluacion? } ] } ]
├── rating, rating_count, etiquetas, requisitos, objetivos, publico_objetivo
└── timestamps

INSCRIPCION_CURSO   curso_id, estudiante_id, progreso (0-100), completado,
                    lecciones_completadas JSON, fechas
SOLICITUD_ACCESO    curso_id, estudiante_id/nombre/email/telefono, estado
                    (PENDIENTE/APROBADO/RECHAZADO), mensaje, metodo_pago, referencia_pago
ACCESO_CURSO        curso_id, estudiante_id, activo, tipo_acceso, sesiones_restantes, fechas
PROGRESO_LECCION    curso_id, estudiante_id, leccion_id, modulo_id, completado,
                    tiempo_invertido, nota, aprobado, intentos, fechas
EVALUACION_LECCION  curso_id, leccion_id, tipo (EXAMEN/CUESTIONARIO), entidad_id,
                    nota_minima, intentos_maximos, tiempo_limite

CERTIFICADO         codigo (único), estudiante_id, curso_id, docente_id, fecha,
                    url, estado (EMITIDO/CANCELADO), metadata JSON

POST (foro)         + curso_id  ← NUEVO (foro por curso; NULL = foro global)
```

### 8.2 Materiales (NUEVO)

```
MATERIAL            id, docente_id, nombre, tipo (PDF/IMAGEN/VIDEO/LINK),
                    archivo_url, link_url, tamaño, timestamps
COMPARTICION        id, material_id, token (único), url_publica, expira_en,
                    estado (ACTIVO/EXPIRADO), creado_en, accesos_count
```

### 8.3 Configuración (NUEVO)

```
NOTIFICACION        id, usuario_id, tipo (SOLICITUD/CURSO/MENSAJE/CERTIFICADO),
                    titulo, contenido, leida, leida_en, creado_en, link
USUARIO             + preferencias JSON (tema, idioma, notif_email, notif_push)
```

---

## 9. 🛣️ Roadmap de Implementación

### FASE 1 — Consolidar CURSOS (núcleo) 🎯 Prioridad máxima
| # | Tarea | Tipo |
|---|---|---|
| 1.1 | 🔧 Fix bug: `_verificar_bloqueo_leccion_internal` inexistente → 500 en progreso-detallado | Bugfix |
| 1.2 | 🔧 Activar `completarLeccion`: endpoint POST que escribe `ProgresoLeccion` y recalcula `InscripcionCurso.progreso` (usar `_actualizar_progreso_curso`) | Feature |
| 1.3 | 🔧 Fix ruta rota `/estudiante/cursos/:id` en App.jsx | Bugfix |
| 1.4 | Validar tipos de lección con enum (VIDEO/TEXTO/EXAMEN/CUESTIONARIO/RECURSO/PIZARRA) en schema | Mejora |
| 1.5 | UI **Estudiantes del curso** (docente): lista accesos, progreso individual, liberar lección, desinscribir | Feature |
| 1.6 | UI **Calificaciones** por curso: ver notas por lección/estudiante + asignar nota manual | Feature |
| 1.7 | **Foro por curso**: `curso_id` en Post + endpoints filtrados + UI de foro dentro del curso | Feature |
| 1.8 | **Certificados automáticos**: al llegar a 100% de progreso, generar certificado (o botón) | Feature |
| 1.9 | Tabs de detalle de curso en frontend (Configuración/Contenido/Estudiantes/Solicitudes/Certificados/Foro) | Feature |
| 1.10 | Pantalla **Configuración de curso** dedicada | Feature |
| 1.11 | Exportar estudiantes/calificaciones a CSV | Feature |

### FASE 2 — MATERIALES: "Compartir en clase" (sala del docente)
| # | Tarea |
|---|---|
| 2.1 | ✅ Router `/compartir` — salas (crear, activa, estado público, vincular, material, quitar, cerrar) |
| 2.2 | ✅ Página pública `CompartirSala.jsx` (`/compartir/:codigo`) — pantalla del aula con QR de vinculación + polling |
| 2.3 | ✅ Botón "Compartir en clase" en `MaterialesPage` (Mi carpeta) — QR + elegir material + terminar sesión |
| 2.4 | ✅ Historial de comparticiones integrado (reutiliza `HistorialComparticion`) |
| 2.5 | ✅ Menú "Mi carpeta" para admin/docente |
| 2.6 | ⏳ Probar el flujo completo en navegador (PC del aula + celular del docente) |

### FASE 3 — CONFIGURACIÓN
| # | Tarea |
|---|---|
| 3.1 | Modelo `Notificacion` + endpoints (listar, no-leídas, marcar-leída, preferencias) |
| 3.2 | Emisión de notificaciones en eventos clave (solicitud creada/aprobada, curso publicado, certificado emitido) |
| 3.3 | UI Perfil (avatar + datos + contraseña) |
| 3.4 | UI Notificaciones (campana global + panel) |
| 3.5 | UI Preferencias (tema, idioma, notif on/off) |
| 3.6 | Badge global de notificaciones en el layout |

### FASE 4 — Pulido y deuda técnica
| # | Tarea |
|---|---|
| 4.1 | Llenar archivos vacíos: `AnalisisCuestionario`, `PizarraColaborativa`, `DetalleAlumno`, `useExamenes`, `ConfiguracionIntegracion` |
| 4.2 | Migraciones Alembic para TODAS las tablas educativas |
| 4.3 | Unificar doble sistema de alumnos (Alumno + AlumnoExamen) |
| 4.4 | Rating de cursos (endpoint valorar + UI) |
| 4.5 | Pagos: integrar pasarela real (Stripe/MercadoPago) — opcional |
| 4.6 | Limpiar legacy: `ExamenesOnline.jsx` huérfano, `PanelIntegraciones.jsx` mock, `crypto.js` simulado |
| 4.7 | Aplicar rate limiting a endpoints sensibles |
| 4.8 | Tests (pytest backend, vitest frontend) y CI |

---

## 10. 📐 Estándares y Convenciones

### Backend
- Routers en `app/api/{modulo}.py`, prefijo `/api/v1/{modulo}`
- Modelos sin relaciones innecesarias: **JSON embebido cuando el acceso es siempre conjunto** (como `Curso.modulos`)
- Validación con Pydantic en `app/schemas/`
- Lógica reutilizable en `app/services/` (hoy vacío — mover ahí la lógica de progreso)
- Respuestas uniformes: `{ "data": ..., "message": ... }`
- Errores: `{ "detail": "..." }` con códigos HTTP correctos
- Fechas en ISO 8601 UTC

### Frontend
- Páginas en `src/pages/`, componentes de módulo en `src/components/{modulo}/`
- **Todo acceso a API a través de `src/services/`** (nunca `fetch` directo — ver `pizarraService.js` que lo viola)
- Estado global solo con Context (ExamenContext); lo demás local
- Nombres de archivos: PascalCase para componentes, camelCase para servicios/hooks
- UI en español, códigos/IDs en inglés

---

## 11. 🐛 Deuda Técnica y Bugs Conocidos

| Severidad | Descripción | Estado |
|---|---|---|
| 🔴 Crítica | `GET /cursos/{id}/progreso-detallado` → `NameError` por `_verificar_bloqueo_leccion_internal` inexistente (cursos con bloqueo) | Pendiente |
| 🔴 Crítica | Ruta `/estudiante/cursos/:id` no definida en App.jsx (dashboard navega a ella) | Pendiente |
| 🟠 Alta | `_actualizar_progreso_curso()` definida pero nunca invocada → progreso no se recalcula | Pendiente |
| 🟠 Alta | Schema `LeccionCompletarRequest` importado pero sin endpoint | Pendiente |
| 🟡 Media | `pizarraService.js` usa `fetch` directo sin token/refresh automático | Pendiente |
| 🟡 Media | `config/cliente/publico` hardcodeado (no lee BD) | Pendiente |
| 🟡 Media | Sin migraciones Alembic para tablas educativas | Pendiente |
| 🟡 Media | Doble sistema de alumnos (unificado + legacy) | Pendiente |
| 🟢 Baja | Archivos vacíos: AnalisisCuestionario, PizarraColaborativa, useExamenes, DetalleAlumno, ConfiguracionIntegracion | Pendiente |
| 🟢 Baja | Legacy: `ExamenesOnline.jsx` huérfano, `PanelIntegraciones.jsx` mock, `crypto.js` no-AES | Pendiente |

---

## 12. 📈 Métricas de Éxito (KPIs del producto)

| Métrica | Objetivo |
|---|---|
| Tiempo para crear un curso completo desde cero | < 5 min |
| Cursos con estructura completa (contenido + evaluación + certificado) | > 70% |
| Estudiantes que completan ≥ 1 curso | > 60% |
| Materiales compartidos por QR sin fricción | > 80% de adopción docente |
| Solicitudes de acceso aprobadas en < 24h | > 90% |
| Certificados generados automáticamente | > 50% de cursos completados |

---

## 13. 🧭 Siguientes Pasos

1. ✅ **Este documento** (FLUJO.md) — aprobado como referencia
2. ▶️ Ejecutar **Fase 1** — empezando por los bugs críticos (1.1, 1.2, 1.3)
3. Verificar cada entregable contra esta guía antes de darlo por terminado
4. Actualizar este documento conforme evolucione el producto (versionar)

> *"Un buen plan ejecutado hoy es mejor que un plan perfecto ejecutado mañana."*