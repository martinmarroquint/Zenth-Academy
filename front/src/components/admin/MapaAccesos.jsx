// front/src/components/admin/MapaAccesos.jsx
// MAPA MUNDIAL DE ACCESOS AL SISTEMA
// Proyección equirectangular con d3-geo sobre un mapa local (world-atlas):
// no depende de ningún servicio externo ni de tiles por internet.
// ✅ Incluye zoom por ciudad (clic en el punto), botones y arrastre para mover.

import React, { useMemo, useRef, useState } from 'react';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { Globe2, MapPin, Minus, Move, Plus, RotateCcw } from 'lucide-react';

const ANCHO = 960;
const ALTO = 480;
const ZOOM_MAX = 24;

// ✅ Agrupa los logins por ciudad (promediando coordenadas) para no dibujar
// cientos de puntos superpuestos.
const agruparPuntos = (puntos = []) => {
  const mapa = new Map();
  puntos.forEach((p) => {
    const lat = Number(p.lat);
    const lon = Number(p.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
    const clave = `${p.pais || '—'}|${p.ciudad || '—'}`;
    const actual = mapa.get(clave);
    if (actual) {
      actual.total += 1;
      actual.lat = (actual.lat * (actual.total - 1) + lat) / actual.total;
      actual.lon = (actual.lon * (actual.total - 1) + lon) / actual.total;
    } else {
      mapa.set(clave, {
        pais: p.pais || '—',
        ciudad: p.ciudad || '—',
        lat,
        lon,
        total: 1,
      });
    }
  });
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
};

const MapaAccesos = ({ puntos = [], cargando = false }) => {
  const [hover, setHover] = useState(null);
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 });
  const arrastre = useRef(null);

  const { paises, proyeccion, graticula } = useMemo(() => {
    const proy = geoEquirectangular()
      .scale(ANCHO / (2 * Math.PI))
      .translate([ANCHO / 2, ALTO / 2]);
    const generador = geoPath(proy);
    const geojson = feature(worldData, worldData.objects.countries);
    return {
      proyeccion: proy,
      graticula: generador(geoGraticule10()),
      paises: geojson.features.map((f, i) => ({ id: i, d: generador(f) })),
    };
  }, []);

  const grupos = useMemo(() => agruparPuntos(puntos), [puntos]);
  const maxTotal = grupos.length ? grupos[0].total : 1;

  // ✅ Centra el mapa en un punto (para acercarse a una ciudad)
  const centrar = (punto, k = 6) => {
    const kk = Math.max(1, Math.min(ZOOM_MAX, k));
    setZoom({
      k: kk,
      x: ANCHO / 2 - punto[0] * kk,
      y: ALTO / 2 - punto[1] * kk,
    });
  };

  const zoomEn = (factor) => {
    setZoom((prev) => {
      const k = Math.max(1, Math.min(ZOOM_MAX, prev.k * factor));
      // Mantiene el centro del viewport fijo
      const cx = ANCHO / 2;
      const cy = ALTO / 2;
      const mx = (cx - prev.x) / prev.k;
      const my = (cy - prev.y) / prev.k;
      return { k, x: cx - mx * k, y: cy - my * k };
    });
  };

  const reiniciar = () => setZoom({ k: 1, x: 0, y: 0 });

  const onMouseDown = (e) => {
    arrastre.current = { x: e.clientX, y: e.clientY, ox: zoom.x, oy: zoom.y };
  };

  const onMouseMove = (e) => {
    if (!arrastre.current) return;
    const anchoPx = e.currentTarget.clientWidth || ANCHO;
    const escala = ANCHO / anchoPx; // px de pantalla → unidades del viewBox
    setZoom((prev) => ({
      ...prev,
      x: arrastre.current.ox + (e.clientX - arrastre.current.x) * escala,
      y: arrastre.current.oy + (e.clientY - arrastre.current.y) * escala,
    }));
  };

  const onMouseUp = () => {
    arrastre.current = null;
  };

  const ampliado = zoom.k > 1.01;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-[#0f766e]" />
            Mapa de accesos
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Desde dónde se conectan los usuarios ·{' '}
            {ampliado ? 'clic en un punto para acercarte más' : 'clic en una ciudad para acercar'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-500 mr-1">{grupos.length} ubicación(es)</span>
          <button
            type="button"
            onClick={() => zoomEn(1 / 1.8)}
            disabled={!ampliado}
            title="Alejar"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomEn(1.8)}
            title="Acercar"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={reiniciar}
            disabled={!ampliado}
            title="Ver el mundo completo"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="w-full h-auto rounded-xl select-none"
          style={{ cursor: ampliado ? 'grab' : 'default' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <defs>
            <clipPath id="mapa-clip">
              <rect width={ANCHO} height={ALTO} rx="12" />
            </clipPath>
          </defs>

          <g clipPath="url(#mapa-clip)">
            <rect width={ANCHO} height={ALTO} fill="#f8fafc" />

            <g transform={`translate(${zoom.x},${zoom.y}) scale(${zoom.k})`}>
              {/* Graticula (lat/lon) */}
              <path
                d={graticula}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
              />
              {/* Países */}
              {paises.map((p) => (
                <path
                  key={p.id}
                  d={p.d}
                  fill="#e2e8f0"
                  stroke="#cbd5e1"
                  strokeWidth={0.35}
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {/* Puntos de acceso */}
              {grupos.map((g) => {
                const coords = proyeccion([g.lon, g.lat]);
                if (!coords) return null;
                const [x, y] = coords;
                const radio = (3.5 + Math.sqrt(g.total / maxTotal) * 10) / zoom.k;
                const activo = hover?.ciudad === g.ciudad && hover?.pais === g.pais;
                return (
                  <g
                    key={`${g.pais}-${g.ciudad}`}
                    onMouseEnter={() => setHover(g)}
                    onMouseLeave={() => setHover(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      centrar([x, y], zoom.k * 3);
                    }}
                    className="cursor-pointer"
                  >
                    <circle cx={x} cy={y} r={radio + 6 / zoom.k} fill="#0f766e" opacity={0.15} />
                    <circle
                      cx={x}
                      cy={y}
                      r={radio}
                      fill="#0f766e"
                      opacity={activo ? 0.95 : 0.7}
                      stroke="#ffffff"
                      strokeWidth={1}
                      vectorEffect="non-scaling-stroke"
                    />
                    {(activo || ampliado) && (
                      <text
                        x={x}
                        y={y - radio - 4 / zoom.k}
                        textAnchor="middle"
                        className="fill-gray-800"
                        style={{
                          fontSize: `${Math.max(9, 11 / Math.sqrt(zoom.k))}px`,
                          fontWeight: 600,
                        }}
                      >
                        {g.ciudad}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* Detalle al pasar el mouse */}
        {hover && (
          <div className="absolute top-3 right-3 bg-white/95 border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
            <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0f766e]" />
              {hover.ciudad}
            </p>
            <p className="text-[11px] text-gray-500">
              {hover.pais} · {hover.total} acceso(s)
            </p>
          </div>
        )}

        {/* Ayuda de navegación */}
        {ampliado && (
          <div className="absolute bottom-3 left-3 bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 shadow-sm flex items-center gap-1.5 text-[11px] text-gray-500">
            <Move className="w-3.5 h-3.5" />
            Arrastrá para mover · {zoom.k.toFixed(1)}×
          </div>
        )}

        {!cargando && grupos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400 bg-white/90 px-4 py-2 rounded-xl border border-gray-200">
              Todavía no hay accesos con ubicación real registrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapaAccesos;
