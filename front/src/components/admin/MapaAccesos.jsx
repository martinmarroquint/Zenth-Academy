// front/src/components/admin/MapaAccesos.jsx
// MAPA MUNDIAL DE ACCESOS AL SISTEMA
// Proyección equirectangular con d3-geo sobre un mapa local (world-atlas):
// no depende de ningún servicio externo ni de tiles por internet.

import React, { useMemo, useState } from 'react';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import { feature } from 'topojson-client';
import worldData from 'world-atlas/countries-110m.json';
import { Globe2, MapPin } from 'lucide-react';

const ANCHO = 960;
const ALTO = 480;

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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-[#0f766e]" />
            Mapa de accesos
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Desde dónde se conectan los usuarios (últimos {puntos.length} accesos con ubicación)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0f766e]" /> accesos
          </span>
          <span>{grupos.length} ubicación(es)</span>
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} className="w-full h-auto rounded-xl">
          {/* Océano */}
          <rect width={ANCHO} height={ALTO} fill="#f8fafc" rx="12" />
          {/* Graticula (lat/lon) */}
          <path d={graticula} fill="none" stroke="#e2e8f0" strokeWidth={0.6} />
          {/* Países */}
          {paises.map((p) => (
            <path key={p.id} d={p.d} fill="#e2e8f0" stroke="#cbd5e1" strokeWidth={0.35} />
          ))}
          {/* Puntos de acceso */}
          {grupos.map((g) => {
            const coords = proyeccion([g.lon, g.lat]);
            if (!coords) return null;
            const [x, y] = coords;
            const radio = 3.5 + Math.sqrt(g.total / maxTotal) * 10;
            const activo = hover?.ciudad === g.ciudad && hover?.pais === g.pais;
            return (
              <g
                key={`${g.pais}-${g.ciudad}`}
                onMouseEnter={() => setHover(g)}
                onMouseLeave={() => setHover(null)}
                className="cursor-pointer"
              >
                <circle cx={x} cy={y} r={radio + 5} fill="#0f766e" opacity={0.15} />
                <circle
                  cx={x}
                  cy={y}
                  r={radio}
                  fill="#0f766e"
                  opacity={activo ? 0.95 : 0.7}
                  stroke="#ffffff"
                  strokeWidth={1}
                />
                {activo && (
                  <text
                    x={x}
                    y={y - radio - 6}
                    textAnchor="middle"
                    className="fill-gray-800"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {g.ciudad}
                  </text>
                )}
              </g>
            );
          })}
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

        {!cargando && grupos.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-gray-400 bg-white/90 px-4 py-2 rounded-xl border border-gray-200">
              Todavía no hay accesos con ubicación registrada
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapaAccesos;
