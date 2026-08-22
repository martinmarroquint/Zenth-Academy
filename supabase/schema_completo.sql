-- ============================================================
-- CLASSVAULT EDUCATIVO — SCHEMA COMPLETO PARA SUPABASE
-- Pega TODO este script en: Supabase → SQL Editor → New query → Run
-- Es IDEMPOTENTE: puedes ejecutarlo varias veces sin romper nada
-- (usa CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ============================================================
-- 1) MULTI-TENENCIA (jerarquía: cliente → empresa → personal)
-- ============================================================

-- CLIENTES: organización que agrupa múltiples empresas
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  razon_social VARCHAR(255),
  ruc VARCHAR(20),
  email_contacto VARCHAR(255),
  telefono VARCHAR(50),
  direccion TEXT,
  plan VARCHAR(50) DEFAULT 'basico',
  fecha_vencimiento DATE,
  activo BOOLEAN DEFAULT TRUE,
  configuracion TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USUARIOS: credenciales + rol educativo (admin/docente/estudiante)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR(200) NOT NULL,
  password_hash VARCHAR(200) NOT NULL,
  nombres VARCHAR(200),
  apellidos VARCHAR(200),
  telefono VARCHAR(20),
  foto_url VARCHAR(500),
  empresa_id TEXT,
  rol VARCHAR(20) DEFAULT 'estudiante',
  rol_global VARCHAR(20) DEFAULT 'usuario',
  activo BOOLEAN DEFAULT TRUE,
  email_verificado BOOLEAN DEFAULT FALSE,
  especialidad VARCHAR(200),
  biografia TEXT,
  institucion VARCHAR(200),
  ultimo_acceso TIMESTAMPTZ,
  fecha_registro TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- PILAR CONFIGURACIÓN: preferencias (tema, idioma, notif_email, notif_push)
  preferencias JSONB DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS ix_usuarios_empresa_id ON usuarios(empresa_id);

-- EMPRESAS: subdominio propio por institución
CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  nombre_corto TEXT,
  ruc TEXT,
  subdominio TEXT NOT NULL,
  dominio_email TEXT,
  email_contacto TEXT,
  telefono TEXT,
  direccion TEXT,
  logo_url TEXT,
  color_primario TEXT DEFAULT '#1a365d',
  color_secundario TEXT DEFAULT '#2b6cb0',
  color_fondo TEXT DEFAULT '#f7fafc',
  color_texto TEXT DEFAULT '#1a202c',
  activo BOOLEAN DEFAULT TRUE,
  plan TEXT DEFAULT 'basico',
  max_usuarios INTEGER DEFAULT 50,
  fecha_vencimiento TIMESTAMPTZ,
  cliente_id UUID REFERENCES clientes(id),
  admin_id TEXT REFERENCES usuarios(id),
  configuracion JSONB DEFAULT '{}'::jsonb,
  pie_pagina VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_empresas_subdominio ON empresas(subdominio);

-- PERSONAL: planilla docente/administrativa
CREATE TABLE IF NOT EXISTS personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES empresas(id),
  dni VARCHAR(8) NOT NULL,
  cip VARCHAR(20) NOT NULL,
  grado VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  sexo VARCHAR(20) DEFAULT 'No especificado',
  fecha_nacimiento DATE,
  email VARCHAR(100) NOT NULL,
  telefono VARCHAR(20),
  foto_url VARCHAR(500),
  area VARCHAR(100) NOT NULL,
  especialidad VARCHAR(100),
  numero_colegiatura VARCHAR(50),
  fecha_ingreso DATE,
  condicion VARCHAR(50),
  roles JSONB DEFAULT '["usuario"]'::jsonb,
  areas_que_jefatura JSONB DEFAULT '[]'::jsonb,
  areas_jefatura JSONB DEFAULT '{}'::jsonb,
  activo BOOLEAN DEFAULT TRUE,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_personal_dni ON personal(dni);
CREATE UNIQUE INDEX IF NOT EXISTS ix_personal_cip ON personal(cip);
CREATE UNIQUE INDEX IF NOT EXISTS ix_personal_email ON personal(email);
CREATE INDEX IF NOT EXISTS ix_personal_empresa_id ON personal(empresa_id);
CREATE INDEX IF NOT EXISTS ix_personal_area ON personal(area);

-- REFRESH TOKENS: rotación y revocación de sesiones
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  token_hash VARCHAR(64) NOT NULL,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_revoked ON refresh_tokens(revoked);

-- ============================================================
-- 2) ALUMNOS Y GRUPOS
-- ============================================================

CREATE TABLE IF NOT EXISTS alumnos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id VARCHAR(100),
  nombres VARCHAR(200) NOT NULL,
  apellidos VARCHAR(200) NOT NULL,
  dni VARCHAR(20),
  email VARCHAR(200),
  telefono VARCHAR(20),
  grado VARCHAR(50),
  grupo VARCHAR(100),
  grupo_id VARCHAR(100),
  nivel VARCHAR(50),
  institucion VARCHAR(200),
  direccion TEXT,
  fecha_nacimiento TIMESTAMPTZ,
  genero VARCHAR(20),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_alumnos_dni ON alumnos(dni);
CREATE INDEX IF NOT EXISTS ix_alumnos_grupo_id ON alumnos(grupo_id);
CREATE INDEX IF NOT EXISTS ix_alumnos_usuario_id ON alumnos(usuario_id);

-- LEGACY (FASE E - unificación de alumnos): ya no se usa en escritura.
-- El catálogo único es `alumnos` (con grupo_id). Se conserva la tabla
-- para no perder datos históricos; el backend la usa solo como fallback
-- de lectura para ids antiguos.
CREATE TABLE IF NOT EXISTS alumnos_examenes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  dni VARCHAR(20) DEFAULT '',
  grado VARCHAR(50) DEFAULT '',
  nombres TEXT NOT NULL,
  apellidos TEXT NOT NULL,
  email VARCHAR(100) DEFAULT '',
  grupo VARCHAR(50) DEFAULT '',
  grupo_id VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grupos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(200) NOT NULL,
  docente_id VARCHAR(100) DEFAULT 'default',
  alumnos JSONB DEFAULT '[]'::jsonb,
  asistencias JSONB DEFAULT '[]'::jsonb,
  recursos JSONB DEFAULT '[]'::jsonb,
  session_activo VARCHAR(100),
  compartir_con_todos BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3) EXÁMENES (módulo de evaluación)
-- ============================================================

CREATE TABLE IF NOT EXISTS examenes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  codigo VARCHAR(50) NOT NULL,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT DEFAULT '',
  tiempo_limite INTEGER NOT NULL DEFAULT 60,
  puntaje_aprobacion DOUBLE PRECISION DEFAULT 60.0,
  estado VARCHAR(20) DEFAULT 'BORRADOR',
  configuracion JSONB DEFAULT '{}'::jsonb,
  intentos_permitidos INTEGER DEFAULT 1,
  grupo_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_examenes_codigo ON examenes(codigo);
CREATE INDEX IF NOT EXISTS idx_examen_grupo_id ON examenes(grupo_id);
CREATE INDEX IF NOT EXISTS idx_examen_estado ON examenes(estado);
CREATE INDEX IF NOT EXISTS idx_examen_created_at ON examenes(created_at);
CREATE INDEX IF NOT EXISTS idx_examen_estado_grupo ON examenes(estado, grupo_id);

CREATE TABLE IF NOT EXISTS preguntas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  examen_id TEXT NOT NULL REFERENCES examenes(id) ON DELETE CASCADE,
  tipo VARCHAR(30) NOT NULL,
  enunciado TEXT NOT NULL,
  puntos DOUBLE PRECISION DEFAULT 1.0,
  orden INTEGER DEFAULT 0,
  opcion_a TEXT,
  opcion_b TEXT,
  opcion_c TEXT,
  opcion_d TEXT,
  opcion_e TEXT,
  respuesta_correcta VARCHAR(10),
  afirmaciones JSONB,
  columna_a JSONB,
  columna_b JSONB,
  elementos JSONB,
  segmentos JSONB,
  frases JSONB,
  respuesta_corta TEXT,
  respuestas_alternativas JSONB,
  longitud_minima INTEGER,
  rubrica JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pregunta_examen_id ON preguntas(examen_id);

CREATE TABLE IF NOT EXISTS resultados_examenes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  examen_id TEXT NOT NULL,
  alumno_id TEXT NOT NULL,
  alumno_id_unificado TEXT,
  alumno_nombre VARCHAR(300) DEFAULT '',
  alumno_grado VARCHAR(50) DEFAULT '',
  alumno_dni VARCHAR(20) DEFAULT '',
  respuestas JSONB NOT NULL,
  calificacion DOUBLE PRECISION DEFAULT 0.0,
  correctas INTEGER DEFAULT 0,
  total_preguntas INTEGER DEFAULT 0,
  puntos_obtenidos DOUBLE PRECISION DEFAULT 0.0,
  total_puntos DOUBLE PRECISION DEFAULT 0.0,
  tiempo_usado INTEGER DEFAULT 0,
  tiempo_restante INTEGER DEFAULT 0,
  violaciones INTEGER DEFAULT 0,
  eventos_seguridad JSONB,
  entregado_por_tiempo BOOLEAN DEFAULT FALSE,
  estado VARCHAR(20) DEFAULT 'COMPLETADO',
  detalle_respuestas JSONB DEFAULT '[]'::jsonb,
  entregado_en TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_resultados_examenes_examen_id ON resultados_examenes(examen_id);
CREATE INDEX IF NOT EXISTS ix_resultados_examenes_alumno_id ON resultados_examenes(alumno_id);

-- ============================================================
-- 4) PILAR CURSOS (núcleo) — 6 tablas
-- ============================================================

CREATE TABLE IF NOT EXISTS cursos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  nivel VARCHAR(50) DEFAULT 'principiante',
  docente_id TEXT,
  docente_nombre VARCHAR(200),
  duracion VARCHAR(100),
  -- Sistema de pagos
  precio_tipo VARCHAR(20) DEFAULT 'gratis',
  precio_monto NUMERIC(10, 2),
  moneda VARCHAR(10) DEFAULT 'PEN',
  metodo_pago VARCHAR(50),
  numero_pago VARCHAR(20),
  instrucciones_pago TEXT,
  -- Configuración de bloqueo de lecciones
  tipo_bloqueo VARCHAR(20) DEFAULT 'ninguno',
  bloqueo_config JSONB DEFAULT '{}'::jsonb,
  -- CERTIFICADO (FASE 1.8)
  certificado_habilitado BOOLEAN DEFAULT TRUE,
  certificado_nota_minima NUMERIC(5, 2),
  imagen_url VARCHAR(500),
  estado VARCHAR(20) DEFAULT 'borrador',
  modulos JSONB DEFAULT '[]'::jsonb,
  estudiantes_count INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  etiquetas JSONB DEFAULT '[]'::jsonb,
  requisitos JSONB DEFAULT '[]'::jsonb,
  objetivos JSONB DEFAULT '[]'::jsonb,
  publico_objetivo VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cursos_docente_id ON cursos(docente_id);

CREATE TABLE IF NOT EXISTS inscripciones_cursos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  curso_id TEXT NOT NULL,
  estudiante_id TEXT NOT NULL,
  estudiante_nombre VARCHAR(200),
  progreso INTEGER DEFAULT 0,
  completado BOOLEAN DEFAULT FALSE,
  lecciones_completadas JSONB DEFAULT '[]'::jsonb,
  fecha_inscripcion TIMESTAMPTZ DEFAULT now(),
  fecha_completado TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_inscripciones_curso_id ON inscripciones_cursos(curso_id);
CREATE INDEX IF NOT EXISTS ix_inscripciones_estudiante_id ON inscripciones_cursos(estudiante_id);

CREATE TABLE IF NOT EXISTS solicitudes_acceso_curso (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  curso_id TEXT NOT NULL,
  estudiante_id TEXT NOT NULL,
  estudiante_nombre VARCHAR(200),
  estudiante_email VARCHAR(200),
  estudiante_telefono VARCHAR(20),
  estado VARCHAR(20) DEFAULT 'pendiente',
  mensaje_estudiante TEXT,
  comentario_docente TEXT,
  metodo_pago VARCHAR(20),
  referencia_pago VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_solicitudes_acceso_curso_id ON solicitudes_acceso_curso(curso_id);
CREATE INDEX IF NOT EXISTS ix_solicitudes_acceso_estudiante ON solicitudes_acceso_curso(estudiante_id);

CREATE TABLE IF NOT EXISTS accesos_cursos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  curso_id TEXT NOT NULL,
  estudiante_id TEXT NOT NULL,
  estudiante_nombre VARCHAR(200),
  activo BOOLEAN DEFAULT TRUE,
  tipo_acceso VARCHAR(20) DEFAULT 'vitalicio',
  sesiones_restantes INTEGER,
  fecha_inicio TIMESTAMPTZ DEFAULT now(),
  fecha_expiracion TIMESTAMPTZ,
  ultimo_acceso TIMESTAMPTZ,
  activado_por TEXT,
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_accesos_cursos_curso_id ON accesos_cursos(curso_id);
CREATE INDEX IF NOT EXISTS ix_accesos_cursos_estudiante_id ON accesos_cursos(estudiante_id);

CREATE TABLE IF NOT EXISTS progreso_lecciones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  curso_id TEXT NOT NULL,
  estudiante_id TEXT NOT NULL,
  leccion_id TEXT NOT NULL,
  modulo_id TEXT,
  completado BOOLEAN DEFAULT FALSE,
  fecha_completado TIMESTAMPTZ,
  tiempo_invertido INTEGER DEFAULT 0,
  nota NUMERIC(5, 2),
  aprobado BOOLEAN DEFAULT FALSE,
  intentos INTEGER DEFAULT 0,
  fecha_ultimo_intento TIMESTAMPTZ,
  fecha_liberacion TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_progreso_curso_id ON progreso_lecciones(curso_id);
CREATE INDEX IF NOT EXISTS ix_progreso_estudiante_id ON progreso_lecciones(estudiante_id);

CREATE TABLE IF NOT EXISTS evaluaciones_lecciones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  curso_id TEXT NOT NULL,
  leccion_id TEXT NOT NULL,
  tipo VARCHAR(20) DEFAULT 'examen',
  entidad_id TEXT,
  nota_minima NUMERIC(5, 2) DEFAULT 3.0,
  intentos_maximos INTEGER DEFAULT 3,
  tiempo_limite INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_evaluaciones_curso_id ON evaluaciones_lecciones(curso_id);
CREATE INDEX IF NOT EXISTS ix_evaluaciones_leccion_id ON evaluaciones_lecciones(leccion_id);

-- CERTIFICADOS (emisión automática, FASE 1.8)
CREATE TABLE IF NOT EXISTS certificados (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  codigo VARCHAR(50) NOT NULL,
  alumno_id_unificado TEXT,
  estudiante_id TEXT NOT NULL,
  estudiante_nombre VARCHAR(200) NOT NULL,
  curso_id TEXT NOT NULL,
  curso_titulo VARCHAR(300) NOT NULL,
  docente_id TEXT NOT NULL,
  docente_nombre VARCHAR(200),
  fecha_emision TIMESTAMPTZ DEFAULT now(),
  url VARCHAR(500),
  estado VARCHAR(20) DEFAULT 'emitido',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_certificados_codigo ON certificados(codigo);
CREATE INDEX IF NOT EXISTS ix_certificados_curso_id ON certificados(curso_id);
CREATE INDEX IF NOT EXISTS ix_certificados_estudiante_id ON certificados(estudiante_id);

-- ============================================================
-- 5) COMUNIDAD / FORO (con foro por curso, FASE 1.7)
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo VARCHAR(300) NOT NULL,
  contenido TEXT,
  categoria VARCHAR(100),
  curso_id TEXT,  -- NULL = foro global; valor = foro del curso
  docente_id TEXT NOT NULL,
  docente_nombre VARCHAR(200),
  destacado BOOLEAN DEFAULT FALSE,
  estado VARCHAR(20) DEFAULT 'publicado',
  comentarios_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  vistas_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_posts_curso_id ON posts(curso_id);
CREATE INDEX IF NOT EXISTS ix_posts_docente_id ON posts(docente_id);

CREATE TABLE IF NOT EXISTS comentarios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  docente_id TEXT NOT NULL,
  docente_nombre VARCHAR(200),
  contenido TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_comentarios_post_id ON comentarios(post_id);

CREATE TABLE IF NOT EXISTS likes_posts (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  docente_id TEXT NOT NULL,
  docente_nombre VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_likes_posts_post_id ON likes_posts(post_id);

-- ============================================================
-- 6) CUESTIONARIOS (encuestas/formularios)
-- ============================================================

CREATE TABLE IF NOT EXISTS cuestionarios (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) NOT NULL,
  estado VARCHAR(20) DEFAULT 'BORRADOR',
  configuracion JSONB DEFAULT '{}'::jsonb,
  es_anonimo BOOLEAN DEFAULT FALSE,
  permite_editar BOOLEAN DEFAULT TRUE,
  mostrar_resultados BOOLEAN DEFAULT FALSE,
  limite_respuestas INTEGER DEFAULT 0,
  empresa_id TEXT,
  departamento VARCHAR(100),
  publico_objetivo VARCHAR(50),
  password VARCHAR(100),
  url_publica VARCHAR(200),
  fecha_inicio TIMESTAMPTZ,
  fecha_fin TIMESTAMPTZ,
  creado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_cuestionarios_url_publica ON cuestionarios(url_publica);

CREATE TABLE IF NOT EXISTS preguntas_cuestionario (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cuestionario_id TEXT NOT NULL REFERENCES cuestionarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  orden INTEGER DEFAULT 0,
  seccion VARCHAR(100),
  titulo TEXT NOT NULL,
  descripcion TEXT,
  obligatoria BOOLEAN DEFAULT TRUE,
  visible BOOLEAN DEFAULT TRUE,
  opciones JSONB DEFAULT '[]'::jsonb,
  configuracion JSONB DEFAULT '{}'::jsonb,
  condicion JSONB,
  validaciones JSONB,
  puntaje DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_preguntas_cuestionario_id ON preguntas_cuestionario(cuestionario_id);

CREATE TABLE IF NOT EXISTS respuestas_cuestionario (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cuestionario_id TEXT NOT NULL REFERENCES cuestionarios(id) ON DELETE CASCADE,
  usuario_id TEXT,
  email VARCHAR(200),
  nombre VARCHAR(200),
  empresa VARCHAR(200),
  departamento VARCHAR(100),
  ip VARCHAR(50),
  user_agent TEXT,
  ubicacion JSONB,
  tiempo_total INTEGER DEFAULT 0,
  completado BOOLEAN DEFAULT TRUE,
  puntaje_total DOUBLE PRECISION DEFAULT 0,
  porcentaje DOUBLE PRECISION DEFAULT 0,
  fecha_inicio TIMESTAMPTZ DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_respuestas_cuestionario_id ON respuestas_cuestionario(cuestionario_id);

CREATE TABLE IF NOT EXISTS respuestas_preguntas (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  respuesta_id TEXT NOT NULL REFERENCES respuestas_cuestionario(id) ON DELETE CASCADE,
  pregunta_id TEXT NOT NULL REFERENCES preguntas_cuestionario(id) ON DELETE CASCADE,
  valor_texto TEXT,
  valor_numero DOUBLE PRECISION,
  valor_boolean BOOLEAN,
  valor_fecha TIMESTAMPTZ,
  valor_opcion TEXT,
  valor_opciones JSONB DEFAULT '[]'::jsonb,
  valor_matriz JSONB DEFAULT '{}'::jsonb,
  valor_archivo VARCHAR(500),
  valor_slider DOUBLE PRECISION,
  valor_estrellas INTEGER,
  valor_emocion VARCHAR(50),
  valor_ordenamiento JSONB DEFAULT '[]'::jsonb,
  es_correcta BOOLEAN DEFAULT FALSE,
  puntaje_obtenido DOUBLE PRECISION DEFAULT 0,
  tiempo_respuesta INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_respuestas_preguntas_respuesta_id ON respuestas_preguntas(respuesta_id);
CREATE INDEX IF NOT EXISTS ix_respuestas_preguntas_pregunta_id ON respuestas_preguntas(pregunta_id);

-- ============================================================
-- 7) PIZARRA (colaboración en tiempo real)
-- ============================================================

CREATE TABLE IF NOT EXISTS pizarras (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(50) DEFAULT 'blanca',
  estado VARCHAR(20) DEFAULT 'ACTIVA',
  creado_por TEXT NOT NULL,
  grupo_id TEXT,
  empresa_id TEXT,
  es_publica BOOLEAN DEFAULT FALSE,
  configuracion JSONB DEFAULT '{}'::jsonb,
  elementos JSONB DEFAULT '[]'::jsonb,
  capas JSONB DEFAULT '["principal"]'::jsonb,
  historial JSONB DEFAULT '[]'::jsonb,
  colaboradores_activos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  ultima_actividad TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sesiones_pizarra (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pizarra_id TEXT NOT NULL REFERENCES pizarras(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL,
  rol VARCHAR(20) DEFAULT 'EDITOR',
  cursor_posicion JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  zoom DOUBLE PRECISION DEFAULT 1.0,
  herramientas_activas JSONB DEFAULT '[]'::jsonb,
  seleccion JSONB DEFAULT '{}'::jsonb,
  conectado BOOLEAN DEFAULT TRUE,
  ultimo_latido TIMESTAMPTZ DEFAULT now(),
  ip VARCHAR(50),
  user_agent TEXT,
  fecha_inicio TIMESTAMPTZ DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  duracion INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_sesiones_pizarra_pizarra_id ON sesiones_pizarra(pizarra_id);

-- ============================================================
-- 8) PILAR MATERIALES (FASE 2) — QR público sin login
-- NOTA: fusiona MATERIAL + COMPARTICION del FLUJO.md en una
-- sola tabla con token por material (decisión de implementación)
-- ============================================================

CREATE TABLE IF NOT EXISTS materiales_compartidos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  docente_id TEXT NOT NULL,
  docente_nombre VARCHAR(200),
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo VARCHAR(20) DEFAULT 'enlace',  -- enlace | texto | archivo
  contenido TEXT,                      -- URL (enlace) o texto (texto)
  nombre_archivo VARCHAR(300),
  url_archivo VARCHAR(500),
  token VARCHAR(64) NOT NULL,          -- token público para el QR
  activo BOOLEAN DEFAULT TRUE,
  visitas INTEGER DEFAULT 0,
  grupo_id TEXT,                        -- recurso de un grupo de examen
  curso_id TEXT,                        -- recurso de un curso
  categoria VARCHAR(30),                -- pdf | ppt | video | documento | otro
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ix_materiales_token ON materiales_compartidos(token);
CREATE INDEX IF NOT EXISTS ix_materiales_docente_id ON materiales_compartidos(docente_id);
CREATE INDEX IF NOT EXISTS ix_materiales_grupo_id ON materiales_compartidos(grupo_id);
CREATE INDEX IF NOT EXISTS ix_materiales_curso_id ON materiales_compartidos(curso_id);

-- ============================================================
-- 9) PILAR CONFIGURACIÓN (FASE 3) — notificaciones
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id TEXT NOT NULL,
  tipo VARCHAR(30) DEFAULT 'CURSO',  -- SOLICITUD | CURSO | MENSAJE | CERTIFICADO
  titulo VARCHAR(300) NOT NULL,
  contenido TEXT,
  leida BOOLEAN DEFAULT FALSE,
  leida_en TIMESTAMPTZ,
  link VARCHAR(500),
  creado_en TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notificaciones_usuario_id ON notificaciones(usuario_id);
CREATE INDEX IF NOT EXISTS ix_notificaciones_leida ON notificaciones(leida);

-- ============================================================
-- 10) OTROS MÓDULOS
-- ============================================================

-- Historial de comparticiones (Carpeta Docente)
CREATE TABLE IF NOT EXISTS historial_comparticiones (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  docente_id TEXT NOT NULL,
  grupo_id TEXT,
  grupo_nombre VARCHAR(200),
  recursos_compartidos JSONB DEFAULT '[]'::jsonb,
  cantidad_recursos INTEGER DEFAULT 0,
  alumnos_ids JSONB DEFAULT '[]'::jsonb,
  cantidad_alumnos INTEGER DEFAULT 0,
  session_id TEXT,
  fecha_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_fin TIMESTAMPTZ,
  duracion_segundos INTEGER DEFAULT 0,
  estado VARCHAR(20) DEFAULT 'ACTIVO',
  creado_en TIMESTAMPTZ DEFAULT now(),
  actualizado_en TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_historial_docente_id ON historial_comparticiones(docente_id);
CREATE INDEX IF NOT EXISTS ix_historial_session_id ON historial_comparticiones(session_id);

-- Carpeta Docente
CREATE TABLE IF NOT EXISTS carpetas_docentes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(300) DEFAULT 'Mi Carpeta',
  docente_id TEXT NOT NULL,
  archivos JSONB DEFAULT '[]'::jsonb,
  recursos JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_carpetas_docentes_docente_id ON carpetas_docentes(docente_id);

-- Integración EDM (Webhook educativo)
CREATE TABLE IF NOT EXISTS integraciones_edm (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  descripcion TEXT,
  cliente_id VARCHAR(200),
  cliente_secreto VARCHAR(500),
  access_token VARCHAR(500),
  refresh_token VARCHAR(500),
  token_expiracion TIMESTAMPTZ,
  configuracion JSONB DEFAULT '{}'::jsonb,
  activo BOOLEAN DEFAULT TRUE,
  ultima_sincronizacion TIMESTAMPTZ,
  ultimo_error TEXT,
  webhook_url VARCHAR(500),
  empresa_id TEXT,
  creado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS eventos_integracion (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  integracion_id TEXT NOT NULL REFERENCES integraciones_edm(id) ON DELETE CASCADE,
  tipo_evento VARCHAR(50) NOT NULL,
  datos JSONB DEFAULT '{}'::jsonb,
  prioridad VARCHAR(20) DEFAULT 'normal',
  estado VARCHAR(20) DEFAULT 'PENDIENTE',
  error TEXT,
  intentos INTEGER DEFAULT 0,
  max_intentos INTEGER DEFAULT 3,
  proximo_intento TIMESTAMPTZ,
  tiempo_procesamiento INTEGER DEFAULT 0,
  destino VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  enviado_en TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ix_eventos_integracion_id ON eventos_integracion(integracion_id);

-- ============================================================
-- 11) MIGRACIONES INCREMENTALES PARA TABLAS YA EXISTENTES
-- (columnas que se agregaron en fases recientes)
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS preferencias JSONB DEFAULT '{}'::jsonb;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS curso_id TEXT;
CREATE INDEX IF NOT EXISTS ix_posts_curso_id ON posts(curso_id);
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS certificado_habilitado BOOLEAN DEFAULT TRUE;
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS certificado_nota_minima NUMERIC(5, 2);

-- INTEGRACIÓN RECURSOS UNIFICADOS (módulo exámenes integrado):
-- un material puede pertenecer a un grupo de examen o a un curso
ALTER TABLE materiales_compartidos ADD COLUMN IF NOT EXISTS grupo_id TEXT;
ALTER TABLE materiales_compartidos ADD COLUMN IF NOT EXISTS curso_id TEXT;
ALTER TABLE materiales_compartidos ADD COLUMN IF NOT EXISTS categoria VARCHAR(30);
CREATE INDEX IF NOT EXISTS ix_materiales_grupo_id ON materiales_compartidos(grupo_id);
CREATE INDEX IF NOT EXISTS ix_materiales_curso_id ON materiales_compartidos(curso_id);

-- UNIFICACIÓN DE ALUMNOS (FASE E):
-- la tabla `alumnos` pasa a ser el catálogo único; los alumnos de examen
-- se vinculan a su grupo con grupo_id. `alumnos_examenes` queda como legacy.
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS grupo_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS ix_alumnos_grupo_id ON alumnos(grupo_id);

-- PUENTE ALUMNO <-> USUARIO (FASE F):
-- alumno.id == usuario.id para estudiantes registrados; usuario_id explícito.
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS usuario_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS ix_alumnos_usuario_id ON alumnos(usuario_id);

-- Compatibilidad legacy: si usuarios tenía personal_id NOT NULL
-- (esquema de un proyecto anterior), lo volvemos opcional para
-- no romper los inserts del backend actual.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'usuarios' AND column_name = 'personal_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE usuarios ALTER COLUMN personal_id DROP NOT NULL;
  END IF;
END $$;

-- ============================================================
-- FIN DEL SCRIPT — 33 tablas
-- ============================================================