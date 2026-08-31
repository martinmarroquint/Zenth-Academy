-- SQL: Agregar columna instructor a la tabla cursos
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columna instructor
ALTER TABLE cursos ADD COLUMN IF NOT EXISTS instructor VARCHAR(200);

-- 2. Migrar datos existentes: copiar docente_nombre a instructor donde instructor esta vacio
UPDATE cursos SET instructor = docente_nombre WHERE instructor IS NULL AND docente_nombre IS NOT NULL;

-- Verificar resultado
SELECT id, titulo, instructor, docente_nombre FROM cursos;
