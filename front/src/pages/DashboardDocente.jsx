// front/src/pages/DashboardDocente.jsx
// DASHBOARD DEL DOCENTE - CON COMPONENTES UI

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ClipboardList, BookOpen, Users, FolderOpen,
  Loader2, MessageCircle, Send, ArrowRight
} from 'lucide-react';
import { Button, Badge, Card } from '../components/ui';
import examenesService from '../services/examenesService';
import cuestionariosService from '../services/cuestionariosService';
import cursosService from '../services/cursosService';

const DashboardDocente = () => {
  const navigate = useNavigate();
  const [cargando, setCargando] = useState(true);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0);
  const [stats, setStats] = useState({
    examenes: 0,
    grupos: 0,
    cuestionarios: 0,
    cursos: 0,
    alumnos: 0,
  });

  useEffect(() => {
    const cargar = async () => {
      try {
        const gruposData = await examenesService.listarGrupos();
        const grupoIds = (gruposData || []).map(g => g.id);

        const [examenesPorGrupo, cuestionarios, cursos, alumnos, solicitudes] = await Promise.allSettled([
          grupoIds.length > 0
            ? examenesService.listarExamenesPorGrupos(grupoIds)
            : Promise.resolve({}),
          cuestionariosService.listar(),
          cursosService.listar(),
          examenesService.listarAlumnos(),
          cursosService.solicitudesPendientes().catch(() => []),
        ]);

        const examenesData = examenesPorGrupo.value || {};
        const totalExamenes = Object.values(examenesData).reduce(
          (acc, examenes) => acc + (examenes?.length || 0),
          0
        );

        const solicitudesData = Array.isArray(solicitudes.value) ? solicitudes.value : [];
        const pendientes = solicitudesData.filter(s => s.estado === 'pendiente').length;

        setSolicitudesPendientes(pendientes);
        setStats({
          examenes: totalExamenes,
          grupos: (gruposData || []).length,
          cuestionarios: Array.isArray(cuestionarios.value) ? cuestionarios.value.length : 0,
          cursos: Array.isArray(cursos.value) ? cursos.value.length : 0,
          alumnos: Array.isArray(alumnos.value) ? alumnos.value.length : 0,
        });
      } catch (error) {
        console.error('Error cargando estadísticas del dashboard:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const kpis = [
    { icon: FileText, label: 'Exámenes', valor: stats.examenes, color: 'primary' },
    { icon: FolderOpen, label: 'Grupos', valor: stats.grupos, color: 'info' },
    { icon: ClipboardList, label: 'Cuestionarios', valor: stats.cuestionarios, color: 'success' },
    { icon: BookOpen, label: 'Cursos', valor: stats.cursos, color: 'warning' },
    { icon: Users, label: 'Alumnos', valor: stats.alumnos, color: 'default' },
  ];

  const accesosRapidos = [
    { id: 'examenes', icon: FileText, label: 'Exámenes', path: '/docente/examenes' },
    { id: 'cuestionarios', icon: ClipboardList, label: 'Cuestionarios', path: '/docente/cuestionarios' },
    { id: 'cursos', icon: BookOpen, label: 'Mis Cursos', path: '/docente/cursos' },
    { id: 'comunidad', icon: MessageCircle, label: 'Comunidad', path: '/docente/foro' },
    { id: 'solicitudes', icon: Send, label: 'Solicitudes', path: '/docente/solicitudes' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* KPIs reales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        {/* KPI de Solicitudes - DESTACADO */}
        <div 
          onClick={() => navigate('/docente/solicitudes')}
          className="bg-white rounded-xl border border-amber-200 p-4 hover:shadow-md transition-shadow cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-3">
            <Send className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
            <Badge variant="warning" size="sm">Solicitudes</Badge>
          </div>
          {cargando ? (
            <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
          ) : (
            <div className="flex items-end justify-between">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{solicitudesPendientes}</p>
              {solicitudesPendientes > 0 && (
                <Badge variant="warning" size="sm">
                  {solicitudesPendientes} pendiente{solicitudesPendientes !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* KPIs existentes */}
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const badgeVariant = kpi.color === 'primary' ? 'primary' :
                              kpi.color === 'success' ? 'success' :
                              kpi.color === 'warning' ? 'warning' :
                              kpi.color === 'info' ? 'info' : 'default';
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                <Badge variant={badgeVariant} size="sm">{kpi.label}</Badge>
              </div>
              {cargando ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
              ) : (
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{kpi.valor}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Accesos rápidos con Button */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        {accesosRapidos.map((item) => {
          const Icon = item.icon;
          const isSolicitudes = item.id === 'solicitudes';
          return (
            <Button
              key={item.id}
              variant="outline"
              className="flex flex-col items-center gap-2 p-4 h-auto rounded-xl border-2 hover:border-[#0f766e] hover:bg-[#e6f4f2] transition-all"
              onClick={() => navigate(item.path)}
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-700">{item.label}</span>
              {isSolicitudes && solicitudesPendientes > 0 && (
                <Badge variant="warning" size="sm" className="mt-1">
                  {solicitudesPendientes} nueva{solicitudesPendientes !== 1 ? 's' : ''}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardDocente;