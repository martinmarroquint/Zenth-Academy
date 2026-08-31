// front/src/components/admin/GeographicAnalytics.jsx
// DASHBOARD DE ANALYTICS GEOGRAFICOS
// Muestra distribucion de usuarios por region, ciudad, pais

import React, { useState, useEffect } from 'react';
import {
  Globe, MapPin, Users, Activity, Calendar, Building2,
  Wifi, TrendingUp, RefreshCw, ChevronDown
} from 'lucide-react';
import geoAnalyticsService from '../../services/geoAnalyticsService';

const GeographicAnalytics = () => {
  const [stats, setStats] = useState(null);
  const [loginsRecientes, setLoginsRecientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState(30);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [periodo]);

  const cargarDatos = async () => {
    setCargando(true);
    setError('');
    try {
      const [statsData, loginsData] = await Promise.allSettled([
        geoAnalyticsService.obtenerStats(periodo),
        geoAnalyticsService.obtenerLoginsRecientes(20)
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      } else {
        setError('Error cargando estadisticas geograficas');
      }

      if (loginsData.status === 'fulfilled') {
        setLoginsRecientes(loginsData.value?.logins || []);
      }
    } catch (e) {
      console.error('Error:', e);
      setError('Error al cargar datos');
    } finally {
      setCargando(false);
    }
  };

  if (cargando && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 animate-spin text-[#0f766e]" />
        <span className="ml-3 text-gray-500">Cargando analytics geograficos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#0f766e]" />
            Analytics Geograficos
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Distribucion de usuarios por region geografica
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={periodo}
            onChange={(e) => setPeriodo(parseInt(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-[#0f766e]"
          >
            <option value={7}>Ultimos 7 dias</option>
            <option value={30}>Ultimos 30 dias</option>
            <option value={90}>Ultimos 90 dias</option>
            <option value={365}>Ultimo anho</option>
          </select>
          <button
            onClick={cargarDatos}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Tarjetas de resumen */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Logins"
            value={stats.resumen.total_logins.toLocaleString()}
            color="emerald"
          />
          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Usuarios Unicos"
            value={stats.resumen.usuarios_unicos.toLocaleString()}
            color="blue"
          />
          <StatCard
            icon={<Globe className="w-5 h-5" />}
            label="Paises Activos"
            value={stats.resumen.paises_activos.toLocaleString()}
            color="purple"
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Periodo"
            value={`${stats.resumen.periodo_dias} dias`}
            color="amber"
          />
        </div>
      )}

      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribucion por pais */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[#0f766e]" />
            Usuarios por Pais
          </h3>
          {stats?.por_pais?.length > 0 ? (
            <div className="space-y-3">
              {stats.por_pais.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-2xl">{getFlagEmoji(item.pais_code)}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{item.pais}</span>
                      <span className="text-xs text-gray-500">
                        {item.logins} logins / {item.usuarios_unicos} usuarios
                      </span>
                    </div>
                    <div className="mt-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#0f766e] rounded-full"
                        style={{
                          width: `${(item.logins / stats.por_pais[0].logins) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay datos geograficos disponibles
            </p>
          )}
        </div>

        {/* Distribucion por ciudad */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#0f766e]" />
            Top Ciudades
          </h3>
          {stats?.por_ciudad?.length > 0 ? (
            <div className="space-y-3">
              {stats.por_ciudad.slice(0, 10).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-5">{idx + 1}</span>
                    <div>
                      <span className="text-sm font-medium text-gray-700">{item.ciudad}</span>
                      <span className="text-xs text-gray-400 ml-2">{item.pais}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-700">{item.logins}</span>
                    <span className="text-xs text-gray-400 ml-1">logins</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay datos de ciudades disponibles
            </p>
          )}
        </div>
      </div>

      {/* Proveedores de internet y actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ISPs */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Wifi className="w-5 h-5 text-[#0f766e]" />
            Proveedores de Internet
          </h3>
          {stats?.por_isp?.length > 0 ? (
            <div className="space-y-3">
              {stats.por_isp.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{item.isp}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-700">{item.logins}</span>
                    <span className="text-xs text-gray-400 ml-1">logins</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay datos de ISPs disponibles
            </p>
          )}
        </div>

        {/* Logins recientes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0f766e]" />
            Actividad Reciente
          </h3>
          {loginsRecientes.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {loginsRecientes.map((login, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-[#e6f4f2] flex items-center justify-center flex-shrink-0">
                    <span className="text-[#0f766e] font-bold text-xs">
                      {login.email?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{login.email}</p>
                    <p className="text-xs text-gray-400">
                      {login.ciudad ? `${login.ciudad}, ${login.pais}` : 'Ubicacion no disponible'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">
                      {login.created_at ? new Date(login.created_at).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              No hay logins recientes
            </p>
          )}
        </div>
      </div>

      {/* Grafico de actividad diaria */}
      {stats?.por_dia?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#0f766e]" />
            Actividad Diaria
          </h3>
          <div className="flex items-end gap-1 h-40">
            {stats.por_dia.map((dia, idx) => {
              const maxLogins = Math.max(...stats.por_dia.map(d => d.logins));
              const height = maxLogins > 0 ? (dia.logins / maxLogins) * 100 : 0;
              return (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full bg-[#0f766e] rounded-t transition-all hover:bg-[#0d5e57]"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${dia.fecha}: ${dia.logins} logins`}
                  />
                  {idx % Math.ceil(stats.por_dia.length / 10) === 0 && (
                    <span className="text-[9px] text-gray-400 mt-1 rotate-45 origin-left">
                      {dia.fecha?.slice(5)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente auxiliar de tarjeta de estadistica
const StatCard = ({ icon, label, value, color }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

// Funcion para convertir codigo de pais a emoji de bandera
function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode === 'LOCAL') return 'Local';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export default GeographicAnalytics;
