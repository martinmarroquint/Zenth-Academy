-- =============================================
-- TABLA: login_geo_log
-- Registra la geolocalizacion de cada login
-- para analytics de distribucion geografica
-- =============================================

CREATE TABLE IF NOT EXISTS login_geo_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    
    -- Datos del usuario
    user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    
    -- Datos de conexion
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    
    -- Datos geograficos (de ip-api.com)
    pais VARCHAR(100),
    pais_code VARCHAR(5),
    region VARCHAR(200),
    ciudad VARCHAR(200),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    timezone_geo VARCHAR(100),
    isp VARCHAR(200),
    
    -- Timestamps
    resolved_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para analytics rapidos
CREATE INDEX IF NOT EXISTS idx_geo_log_user_id ON login_geo_log(user_id);
CREATE INDEX IF NOT EXISTS idx_geo_log_email ON login_geo_log(email);
CREATE INDEX IF NOT EXISTS idx_geo_log_pais ON login_geo_log(pais);
CREATE INDEX IF NOT EXISTS idx_geo_log_ciudad ON login_geo_log(ciudad);
CREATE INDEX IF NOT EXISTS idx_geo_log_created_at ON login_geo_log(created_at);
CREATE INDEX IF NOT EXISTS idx_geo_log_pais_fecha ON login_geo_log(pais, created_at);
