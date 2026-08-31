// front/src/components/cursos/CreadorCurso.jsx
// VERSIÓN ACTUALIZADA - CON MODAL DE EXAMEN COMPLETO

import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Save, Plus, Trash2, GripVertical,
  Video, FileText, BookOpen, X,
  ChevronDown, Link as LinkIcon, Loader2,
  Edit3, Eye, Award, Send,
  DollarSign, Lock as LockIcon, FileCheck,
  Settings, CheckCircle, AlertCircle,
  Globe, Target, Clock, User, Image as ImageIcon,
  Layout, Layers, MoveUp, MoveDown, Upload
} from 'lucide-react';
import cursosService from '../../services/cursosService';
import examenesService from '../../services/examenesService';
import { authService } from '../../services/authService';
import EditorTexto from './EditorTexto';
import ModalCrearExamenRapido from './ModalCrearExamenRapido';
import { resolveImageUrl, isGoogleDriveUrl, convertGoogleDriveUrl } from '../../config/api.config';

// =============================================
// COMPONENTES UI
// =============================================
import Dropdown from '../ui/Dropdown';
import Switch from '../ui/Switch';
import Input from '../ui/Input';
import Badge from '../ui/Badge';

// =============================================
// CONSTANTES
// =============================================

const CATEGORIAS = [
  { value: 'general', label: 'General' },
  { value: 'programacion', label: 'Programación' },
  { value: 'web', label: 'Desarrollo Web' },
  { value: 'movil', label: 'Desarrollo Móvil' },
  { value: 'datos', label: 'Data Science' },
  { value: 'ia', label: 'Inteligencia Artificial' },
  { value: 'diseno', label: 'Diseño' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'negocios', label: 'Negocios' },
  { value: 'educacion', label: 'Educación' },
  { value: 'salud', label: 'Salud' },
  { value: 'idiomas', label: 'Idiomas' },
  { value: 'musica', label: 'Música' },
  { value: 'arte', label: 'Arte' },
  { value: 'fotografia', label: 'Fotografía' },
  { value: 'finanzas', label: 'Finanzas' },
  { value: 'emprendimiento', label: 'Emprendimiento' },
  { value: 'liderazgo', label: 'Liderazgo' },
  { value: 'productividad', label: 'Productividad' },
  { value: 'bienestar', label: 'Bienestar' },
];

const NIVELES = [
  { value: 'principiante', label: 'Principiante' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
  { value: 'todos', label: 'Todos los niveles' },
];

const MONEDAS = [
  { value: 'PEN', label: 'PEN' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

const TIPOS_BLOQUEO = [
  { value: 'ninguno', label: 'Sin bloqueo' },
  { value: 'secuencial', label: 'Secuencial (aprobar modulo anterior)' },
  { value: 'fecha', label: 'Por fecha' },
  { value: 'desempeno', label: 'Por desempeno (nota minima)' },
  { value: 'mixto', label: 'Mixto (secuencial + desempeno)' },
];

const TIPOS_BLOQUE = [
  { value: 'video', label: 'Video', icon: Video },
  { value: 'texto', label: 'Texto', icon: FileText },
  { value: 'quiz', label: 'Cuestionario', icon: BookOpen },
  { value: 'examen', label: 'Examen', icon: Award },
  { value: 'recurso', label: 'Recurso', icon: LinkIcon },
];

// =============================================
// COMPONENTE BLOQUE DE CONTENIDO
// =============================================
const BloqueContenido = ({
  bloque,
  index,
  onUpdate,
  onEliminar,
  onMoveUp,
  onMoveDown,
  examenesDisponibles = [],
  onExamenCreado,
  cursoTitulo = 'Curso',
  totalBloques
}) => {
  const [editando, setEditando] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState(false);
  const [tempBloque, setTempBloque] = useState(bloque);
  const [mostrarModalExamen, setMostrarModalExamen] = useState(false);

  const handleSave = () => {
    onUpdate(tempBloque);
    setEditando(false);
  };

  const handleCancel = () => {
    setTempBloque(bloque);
    setEditando(false);
  };

  const getTipoLabel = (tipo) => {
    const found = TIPOS_BLOQUE.find(t => t.value === tipo);
    return found ? found.label : tipo;
  };

  const getTipoIcon = (tipo) => {
    const found = TIPOS_BLOQUE.find(t => t.value === tipo);
    return found ? found.icon : FileText;
  };

  if (!editando) {
    const IconComponent = getTipoIcon(bloque.tipo);
    return (
      <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 cursor-grab" />
        <IconComponent className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-400 min-w-[50px]">{getTipoLabel(bloque.tipo)}</span>
        <span className="flex-1 text-sm text-gray-700 truncate">
          {bloque.titulo || `Bloque ${index + 1}`}
        </span>
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMoveUp()}
            disabled={index === 0}
            className={`p-1.5 rounded hover:bg-gray-200 ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <MoveUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onMoveDown()}
            disabled={index === totalBloques - 1}
            className={`p-1.5 rounded hover:bg-gray-200 ${index === totalBloques - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <MoveDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setEditando(true)}
            className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onEliminar}
            className="p-1.5 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 relative z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">EDITANDO BLOQUE</span>
          {vistaPrevia && (
            <Badge variant="success" size="sm">Vista previa</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setVistaPrevia(!vistaPrevia)}
            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
          >
            {vistaPrevia ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs font-medium text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#0f766e' }}
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          value={tempBloque.titulo || ''}
          onChange={(e) => setTempBloque({ ...tempBloque, titulo: e.target.value })}
          placeholder="Título del bloque"
          className="w-full"
        />
        <Dropdown
          value={tempBloque.tipo}
          onChange={(value) => {
            setTempBloque({
              ...tempBloque,
              tipo: value,
              contenido: value === 'video' ? { video_url: '' } :
                        value === 'texto' ? { texto: '' } :
                        value === 'quiz' ? { cuestionario_id: '' } :
                        value === 'examen' ? { examen_id: '' } :
                        { archivos: [] }
            });
          }}
          options={TIPOS_BLOQUE.map(t => ({ value: t.value, label: t.label }))}
          placeholder="Tipo de contenido"
          className="w-full"
        />
      </div>

      <div className="space-y-3 relative z-20">
        {!vistaPrevia && (
          <>
            {tempBloque.tipo === 'video' && (
              <div>
                <label className="text-xs text-gray-500">URL de YouTube</label>
                <Input
                  value={tempBloque.contenido?.video_url || ''}
                  onChange={(e) => setTempBloque({
                    ...tempBloque,
                    contenido: { ...tempBloque.contenido, video_url: e.target.value }
                  })}
                  placeholder="https://youtu.be/..."
                  className="w-full"
                />
              </div>
            )}

            {tempBloque.tipo === 'texto' && (
              <div>
                <label className="text-xs text-gray-500">Contenido</label>
                <EditorTexto
                  contenido={tempBloque.contenido?.texto || ''}
                  onUpdate={(html) => setTempBloque({
                    ...tempBloque,
                    contenido: { ...tempBloque.contenido, texto: html }
                  })}
                  placeholder="Escribe el contenido..."
                />
              </div>
            )}

            {tempBloque.tipo === 'examen' && (
              <div>
                <label className="text-xs text-gray-500">Examen</label>
                <div className="flex items-center gap-2 relative z-30">
                  <Dropdown
                    value={tempBloque.contenido?.examen_id || ''}
                    onChange={(value) => setTempBloque({
                      ...tempBloque,
                      contenido: { ...tempBloque.contenido, examen_id: value }
                    })}
                    options={[
                      { value: '', label: 'Seleccionar examen' },
                      ...examenesDisponibles.map((ex) => ({
                        value: ex.id,
                        label: ex.titulo
                      }))
                    ]}
                    className="flex-1"
                  />
                  <button
                    onClick={() => setMostrarModalExamen(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                    style={{ backgroundColor: '#0f766e' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#0d5e57'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#0f766e'}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo
                  </button>
                </div>
              </div>
            )}

            {tempBloque.tipo === 'recurso' && (
              <div>
                <label className="text-xs text-gray-500">Recursos</label>
                <div className="space-y-2">
                  {(tempBloque.contenido?.archivos || []).map((recurso, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={recurso.nombre || ''}
                        onChange={(e) => {
                          const nuevos = [...(tempBloque.contenido?.archivos || [])];
                          nuevos[index] = { ...nuevos[index], nombre: e.target.value };
                          setTempBloque({
                            ...tempBloque,
                            contenido: { ...tempBloque.contenido, archivos: nuevos }
                          });
                        }}
                        placeholder="Nombre"
                        className="flex-1"
                      />
                      <Input
                        value={recurso.url || ''}
                        onChange={(e) => {
                          const nuevos = [...(tempBloque.contenido?.archivos || [])];
                          nuevos[index] = { ...nuevos[index], url: e.target.value };
                          setTempBloque({
                            ...tempBloque,
                            contenido: { ...tempBloque.contenido, archivos: nuevos }
                          });
                        }}
                        placeholder="URL"
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          const nuevos = (tempBloque.contenido?.archivos || []).filter((_, i) => i !== index);
                          setTempBloque({
                            ...tempBloque,
                            contenido: { ...tempBloque.contenido, archivos: nuevos }
                          });
                        }}
                        className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const actuales = tempBloque.contenido?.archivos || [];
                      setTempBloque({
                        ...tempBloque,
                        contenido: {
                          ...tempBloque.contenido,
                          archivos: [...actuales, { nombre: '', url: '', tipo: 'link' }]
                        }
                      });
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar recurso
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {vistaPrevia && (
          <div className="border border-gray-200 rounded-lg p-4 min-h-[100px]">
            {tempBloque.tipo === 'video' && (
              <div className="text-center text-gray-400">
                <Video className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Video: {tempBloque.contenido?.video_url || 'Sin video'}</p>
              </div>
            )}
            {tempBloque.tipo === 'texto' && (
              <div 
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: tempBloque.contenido?.texto || '' }}
              />
            )}
            {tempBloque.tipo === 'quiz' && (
              <div className="text-center text-gray-400">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Cuestionario</p>
              </div>
            )}
            {tempBloque.tipo === 'examen' && (
              <div className="text-center text-gray-400">
                <Award className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Examen</p>
              </div>
            )}
            {tempBloque.tipo === 'recurso' && (
              <div className="space-y-2">
                {(tempBloque.contenido?.archivos || []).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    <span>{r.nombre || 'Recurso'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal para crear examen - ACTUALIZADO */}
      <ModalCrearExamenRapido
        abierto={mostrarModalExamen}
        onClose={() => setMostrarModalExamen(false)}
        onExamenCreado={(examen) => {
          // Actualizar el bloque con el examen seleccionado
          setTempBloque({
            ...tempBloque,
            contenido: { ...tempBloque.contenido, examen_id: examen.id }
          });
          // Notificar al padre para actualizar la lista de exámenes disponibles
          if (onExamenCreado) {
            onExamenCreado(examen);
          }
          // Cerrar el modal
          setMostrarModalExamen(false);
        }}
        cursoTitulo={cursoTitulo}
      />
    </div>
  );
};

// =============================================
// BARRA DE HERRAMIENTAS PROFESIONAL
// =============================================

const Toolbar = ({ datos, setDatos }) => {
  const [pagoActivo, setPagoActivo] = useState(datos.precio_tipo === 'pago');
  const [certificadoActivo, setCertificadoActivo] = useState(datos.certificado_habilitado);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState('');
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Constantes para imagen de portada
  const IMAGE_CONFIG = {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    recommendedWidth: 1200,
    recommendedHeight: 628,
    minWidth: 800,
    minHeight: 420,
  };

  const handlePagoToggle = (checked) => {
    setPagoActivo(checked);
    setDatos({ 
      ...datos, 
      precio_tipo: checked ? 'pago' : 'gratis',
      precio_monto: checked ? datos.precio_monto || '49.99' : '',
    });
  };

  const handleCertificadoToggle = (checked) => {
    setCertificadoActivo(checked);
    setDatos({ 
      ...datos, 
      certificado_habilitado: checked,
      certificado_nota_minima: checked ? datos.certificado_nota_minima || '' : '',
    });
  };

  const validarArchivo = (file) => {
    // Validar tipo MIME
    if (!IMAGE_CONFIG.allowedTypes.includes(file.type)) {
      return 'Formato no permitido. Usa JPG, PNG o WebP';
    }
    // Validar extensión
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!IMAGE_CONFIG.allowedExtensions.includes(ext)) {
      return 'Extensión no permitida. Usa .jpg, .png o .webp';
    }
    // Validar tamaño
    if (file.size > IMAGE_CONFIG.maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `La imagen pesa ${sizeMB}MB. Máximo: 5MB`;
    }
    return null;
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const error = validarArchivo(file);
    if (error) {
      setErrorImagen(error);
      return;
    }
    
    setErrorImagen('');
    // Vista previa local inmediata
    const previewUrl = URL.createObjectURL(file);
    setDatos({ ...datos, imagen_url: previewUrl, _imagenFile: file });
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    const error = validarArchivo(file);
    if (error) {
      setErrorImagen(error);
      return;
    }
    
    setErrorImagen('');
    const previewUrl = URL.createObjectURL(file);
    setDatos({ ...datos, imagen_url: previewUrl, _imagenFile: file });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const eliminarImagen = () => {
    setDatos({ ...datos, imagen_url: '', _imagenFile: null });
    setErrorImagen('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const imagenUrl = resolveImageUrl(datos.imagen_url);

  return (
    <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm">
      <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
        <Settings className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">Configuración del curso</span>
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          <Badge 
            variant={datos.precio_tipo === 'pago' ? 'success' : 'secondary'} 
            size="sm"
            className="flex items-center gap-1"
          >
            <DollarSign className="w-3 h-3" />
            {datos.precio_tipo === 'pago' ? `Pago (${datos.moneda} ${datos.precio_monto})` : 'Gratis'}
          </Badge>
          
          {datos.certificado_habilitado && (
            <Badge variant="success" size="sm" className="flex items-center gap-1">
              <FileCheck className="w-3 h-3" />
              Certificado
              {datos.certificado_nota_minima && ` (Nota: ${datos.certificado_nota_minima})`}
            </Badge>
          )}
          
          {datos.tipo_bloqueo !== 'ninguno' && (
            <Badge variant="warning" size="sm" className="flex items-center gap-1">
              <LockIcon className="w-3 h-3" />
              {TIPOS_BLOQUEO.find(t => t.value === datos.tipo_bloqueo)?.label}
            </Badge>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Primera fila: categoría, nivel, duración, instructor */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1 overflow-visible">
            <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Dropdown
              value={datos.categoria}
              onChange={(value) => setDatos({ ...datos, categoria: value })}
              options={CATEGORIAS}
              placeholder="Categoría"
              className="w-32"
              size="sm"
            />
          </div>
          
          <div className="flex items-center gap-1 overflow-visible">
            <Target className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Dropdown
              value={datos.nivel}
              onChange={(value) => setDatos({ ...datos, nivel: value })}
              options={NIVELES}
              placeholder="Nivel"
              className="w-28"
              size="sm"
            />
          </div>
          
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Input
              value={datos.duracion}
              onChange={(e) => setDatos({ ...datos, duracion: e.target.value })}
              placeholder="Duración"
              className="w-24"
              size="sm"
            />
          </div>

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          <div className="flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <Input
              value={datos.instructor}
              readOnly
              className="w-48 bg-gray-50 cursor-not-allowed"
              size="sm"
              title="Instructor: nombre del docente que creo el curso"
            />
          </div>

          <div className="w-px h-6 bg-gray-200 flex-shrink-0" />

          <div className="flex items-center gap-4 overflow-visible">
            <div className="flex items-center gap-2 overflow-visible">
              <Switch
                checked={pagoActivo}
                onChange={handlePagoToggle}
                size="sm"
              />
              <span className="text-xs text-gray-600 flex-shrink-0">Pago</span>
              {pagoActivo && (
                <div className="flex items-center gap-1 ml-1 overflow-visible">
                  <Input
                    type="number"
                    value={datos.precio_monto}
                    onChange={(e) => setDatos({ ...datos, precio_monto: e.target.value })}
                    placeholder="49.99"
                    className="w-16"
                    size="sm"
                  />
                  <Dropdown
                    value={datos.moneda}
                    onChange={(value) => setDatos({ ...datos, moneda: value })}
                    options={MONEDAS}
                    className="w-16"
                    size="sm"
                  />
                  <Input
                    value={datos.numero_pago}
                    onChange={(e) => setDatos({ ...datos, numero_pago: e.target.value })}
                    placeholder="Yape/Plin"
                    className="w-24"
                    size="sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-visible">
              <Switch
                checked={certificadoActivo}
                onChange={handleCertificadoToggle}
                size="sm"
              />
              <span className="text-xs text-gray-600 flex-shrink-0">Certificado</span>
              {certificadoActivo && (
                <div className="flex items-center gap-1 ml-1 overflow-visible">
                  <span className="text-xs text-gray-400 flex-shrink-0">Nota:</span>
                  <Input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={datos.certificado_nota_minima}
                    onChange={(e) => setDatos({ ...datos, certificado_nota_minima: e.target.value })}
                    placeholder="11"
                    className="w-14"
                    size="sm"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-visible">
              <LockIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <Dropdown
                value={datos.tipo_bloqueo}
                onChange={(value) => setDatos({ ...datos, tipo_bloqueo: value })}
                options={TIPOS_BLOQUEO}
                placeholder="Bloqueo"
                className="w-28"
                size="sm"
              />
            </div>
          </div>
        </div>

        {/* Segunda fila: Imagen de portada */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-medium text-gray-600">Imagen de portada</span>
            <span className="text-[10px] text-gray-400">•</span>
            <span className="text-[10px] text-gray-400">Recomendado: 1200x628 px (mín. 800x420, máx. 2400x1256)</span>
          </div>
          
          <div className="flex items-start gap-4">
            {/* Zona de drop/preview */}
            <div 
              className={`relative flex-shrink-0 w-48 h-28 rounded-lg border-2 border-dashed overflow-hidden transition-all cursor-pointer ${
                dragOver 
                  ? 'border-[#0f766e] bg-[#e6f4f2]/50' 
                  : imagenUrl 
                    ? 'border-gray-200 hover:border-gray-300' 
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
              }`}
              onClick={() => !imagenUrl && fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {imagenUrl ? (
                <>
                  <img 
                    src={imagenUrl} 
                    alt="Portada del curso" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="p-1.5 bg-white/90 rounded-lg hover:bg-white transition-colors mr-1"
                      title="Cambiar imagen"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        eliminarImagen();
                      }}
                      className="p-1.5 bg-white/90 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar imagen"
                    >
                      <X className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  {/* Badge de estado */}
                  {datos._imagenFile && (
                    <div className="absolute bottom-1 left-1">
                      <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-500 text-white rounded flex items-center gap-0.5">
                        <Upload className="w-2.5 h-2.5" />
                        Pendiente
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <Upload className={`w-6 h-6 mb-1 ${dragOver ? 'text-[#0f766e]' : ''}`} />
                  <span className="text-[10px] text-center px-1">
                    Arrastra o haz clic<br/>para subir imagen
                  </span>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            
            {/* Info y URL alternativa */}
            <div className="flex-1 space-y-2">
              <div className="text-[10px] text-gray-400 space-y-0.5">
                <p>• <strong>Formatos locales:</strong> JPG, PNG, WebP (máx. 5 MB)</p>
                <p>• <strong>Dimensiones ideales:</strong> 1200 x 628 px (landscape)</p>
                <p>• <strong>Google Drive:</strong> Pega el link de compartir directamente</p>
                <p>• <strong>Otros:</strong> Imgur, Unsplash, Flickr, etc.</p>
                <p className="text-emerald-600 font-medium">Recomendado: Usa Google Drive para no ocupar espacio en el servidor</p>
              </div>
              
              {/* Campo de URL - incluye Google Drive */}
              <div>
                <label className="text-[10px] text-gray-400 mb-1 block">URL de imagen (Google Drive, Flickr, etc.):</label>
                <div className="flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <Input
                    value={datos.imagen_url || ''}
                    onChange={(e) => {
                      let url = e.target.value;
                      // Si es link de Google Drive, convertir automáticamente
                      if (isGoogleDriveUrl(url)) {
                        url = convertGoogleDriveUrl(url);
                      }
                      setDatos({ ...datos, imagen_url: url, _imagenFile: null });
                    }}
                    placeholder="https://drive.google.com/file/d/... o https://ejemplo.com/imagen.jpg"
                    className="flex-1"
                    size="sm"
                  />
                </div>
                {isGoogleDriveUrl(datos.imagen_url) && (
                  <p className="text-[9px] text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5" />
                    Link de Google Drive detectado y convertido para vista previa
                  </p>
                )}
                {datos.imagen_url && !isGoogleDriveUrl(datos.imagen_url) && !datos.imagen_url.startsWith('/') && (
                  <p className="text-[9px] text-gray-400 mt-1">
                    También puedes pegar links de Imgur, Flickr, Unsplash, etc.
                  </p>
                )}
              </div>
              
              {errorImagen && (
                <p className="text-[10px] text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errorImagen}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const CreadorCurso = ({ cursoInicial = null, onGuardar, onVolver }) => {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [examenesDisponibles, setExamenesDisponibles] = useState([]);
  
  // Obtener datos del docente logueado
  const usuario = authService.getCurrentUser();
  const nombreDocente = [usuario?.nombres, usuario?.apellidos].filter(Boolean).join(' ') || usuario?.email || '';

  useEffect(() => {
    let activo = true;
    
    const cargarDatos = async () => {
      try {
        const examenes = await Promise.allSettled([
          examenesService.listarExamenes({ limit: 100 }),
        ]);
        
        if (activo) {
          if (examenes.status === 'fulfilled') {
            setExamenesDisponibles(Array.isArray(examenes.value) ? examenes.value : []);
          }
        }
      } catch (e) {
        console.warn('Error cargando datos:', e);
      }
    };
    
    cargarDatos();
    
    return () => { activo = false; };
  }, []);

  const [datos, setDatos] = useState({
    titulo: cursoInicial?.titulo || '',
    descripcion: cursoInicial?.descripcion || '',
    categoria: cursoInicial?.categoria || 'general',
    nivel: cursoInicial?.nivel || 'principiante',
    precio_tipo: cursoInicial?.precio_tipo || 'gratis',
    precio_monto: cursoInicial?.precio_monto || '',
    moneda: cursoInicial?.moneda || 'PEN',
    numero_pago: cursoInicial?.numero_pago || '',
    duracion: cursoInicial?.duracion || '',
    instructor: cursoInicial?.instructor || cursoInicial?.docente_nombre || nombreDocente,
    imagen_url: cursoInicial?.imagen_url || '',
    tipo_bloqueo: cursoInicial?.tipo_bloqueo || 'ninguno',
    bloqueo_config: cursoInicial?.bloqueo_config || {},
    certificado_habilitado: cursoInicial?.certificado_habilitado !== false,
    certificado_nota_minima: cursoInicial?.certificado_nota_minima ?? '',
  });

  const [modulos, setModulos] = useState(() => {
    if (cursoInicial?.modulos) return cursoInicial.modulos;
    return [{ 
      id: Date.now(), 
      titulo: 'Módulo 1', 
      lecciones: [
        { 
          id: Date.now() + 1, 
          titulo: 'Introducción', 
          bloques: [
            { 
              id: Date.now() + 2, 
              titulo: 'Video introductorio', 
              tipo: 'video', 
              contenido: { video_url: '' } 
            },
            { 
              id: Date.now() + 3, 
              titulo: 'Contenido de la clase', 
              tipo: 'texto', 
              contenido: { texto: '' } 
            }
          ] 
        }
      ] 
    }];
  });

  const [moduloEditando, setModuloEditando] = useState(null);

  const agregarModulo = () => {
    const nuevoModulo = {
      id: Date.now(),
      titulo: `Módulo ${modulos.length + 1}`,
      lecciones: [{ 
        id: Date.now() + 1, 
        titulo: 'Nueva Lección', 
        bloques: [
          { 
            id: Date.now() + 2, 
            titulo: 'Contenido', 
            tipo: 'texto', 
            contenido: { texto: '' } 
          }
        ] 
      }]
    };
    setModulos([...modulos, nuevoModulo]);
    setModuloEditando(nuevoModulo.id);
  };

  const eliminarModulo = (id) => {
    if (!window.confirm('¿Eliminar este módulo?')) return;
    setModulos(modulos.filter(m => m.id !== id));
    if (moduloEditando === id) setModuloEditando(null);
  };

  const agregarLeccion = (moduloId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      const nuevaLeccion = { 
        id: Date.now(), 
        titulo: `Lección ${m.lecciones.length + 1}`, 
        bloques: [
          { 
            id: Date.now() + 1, 
            titulo: 'Contenido', 
            tipo: 'texto', 
            contenido: { texto: '' } 
          }
        ] 
      };
      return { ...m, lecciones: [...m.lecciones, nuevaLeccion] };
    }));
  };

  const eliminarLeccion = (moduloId, leccionId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return { ...m, lecciones: m.lecciones.filter(l => l.id !== leccionId) };
    }));
  };

  const agregarBloque = (moduloId, leccionId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => {
          if (l.id !== leccionId) return l;
          return {
            ...l,
            bloques: [
              ...l.bloques,
              { 
                id: Date.now(), 
                titulo: `Bloque ${l.bloques.length + 1}`, 
                tipo: 'texto', 
                contenido: { texto: '' } 
              }
            ]
          };
        })
      };
    }));
  };

  const actualizarBloque = (moduloId, leccionId, bloqueActualizado) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => {
          if (l.id !== leccionId) return l;
          return {
            ...l,
            bloques: l.bloques.map(b => 
              b.id === bloqueActualizado.id ? bloqueActualizado : b
            )
          };
        })
      };
    }));
  };

  const eliminarBloque = (moduloId, leccionId, bloqueId) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => {
          if (l.id !== leccionId) return l;
          return {
            ...l,
            bloques: l.bloques.filter(b => b.id !== bloqueId)
          };
        })
      };
    }));
  };

  const moverBloque = (moduloId, leccionId, bloqueId, direccion) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => {
          if (l.id !== leccionId) return l;
          const index = l.bloques.findIndex(b => b.id === bloqueId);
          const nuevoIndex = index + direccion;
          if (nuevoIndex < 0 || nuevoIndex >= l.bloques.length) return l;
          const nuevosBloques = [...l.bloques];
          [nuevosBloques[index], nuevosBloques[nuevoIndex]] = [nuevosBloques[nuevoIndex], nuevosBloques[index]];
          return { ...l, bloques: nuevosBloques };
        })
      };
    }));
  };

  const actualizarLeccion = (moduloId, leccionActualizada) => {
    setModulos(modulos.map(m => {
      if (m.id !== moduloId) return m;
      return {
        ...m,
        lecciones: m.lecciones.map(l => 
          l.id === leccionActualizada.id ? leccionActualizada : l
        )
      };
    }));
  };

  const actualizarModulo = (id, campo, valor) => {
    setModulos(modulos.map(m => m.id === id ? { ...m, [campo]: valor } : m));
  };

  const handleExamenCreado = (examen) => {
    setExamenesDisponibles(prev => {
      if (prev.some(e => e.id === examen.id)) return prev;
      return [...prev, examen];
    });
  };

  const guardarCurso = async () => {
    if (!datos.titulo.trim()) {
      setError('El título del curso es obligatorio');
      return null;
    }
    setError('');
    
    const cursoData = {
      titulo: datos.titulo.trim(),
      descripcion: datos.descripcion.trim(),
      categoria: datos.categoria,
      nivel: datos.nivel,
      duracion: datos.duracion,
      instructor: datos.instructor,
      imagen_url: datos._imagenFile ? datos.imagen_url : datos.imagen_url,
      precio_tipo: datos.precio_tipo || 'gratis',
      precio_monto: datos.precio_tipo === 'pago' && datos.precio_monto ? parseFloat(datos.precio_monto) : null,
      moneda: datos.moneda || 'PEN',
      numero_pago: datos.precio_tipo === 'pago' ? datos.numero_pago : null,
      tipo_bloqueo: datos.tipo_bloqueo || 'ninguno',
      bloqueo_config: datos.bloqueo_config || {},
      certificado_habilitado: !!datos.certificado_habilitado,
      certificado_nota_minima: datos.certificado_nota_minima
        ? parseFloat(datos.certificado_nota_minima)
        : null,
      modulos: modulos.map(m => ({
        ...m,
        lecciones: m.lecciones.map(l => ({
          ...l,
          bloques: l.bloques.map(b => ({
            ...b,
            contenido: b.contenido || {}
          }))
        }))
      }))
    };
    
    let resultado;
    if (cursoInicial?.id) {
      await cursosService.actualizar(cursoInicial.id, cursoData);
      resultado = { ...cursoData, id: cursoInicial.id };
    } else {
      const creado = await cursosService.crear(cursoData);
      resultado = creado?.id ? { ...cursoData, ...creado } : { ...cursoData };
    }
    
    // Subir imagen si hay archivo pendiente
    if (datos._imagenFile && resultado?.id) {
      try {
        const imgResult = await cursosService.subirImagen(resultado.id, datos._imagenFile);
        if (imgResult?.imagen_url) {
          resultado.imagen_url = imgResult.imagen_url;
        }
      } catch (imgError) {
        console.warn('Error subiendo imagen (no crítico):', imgError);
        // No fallar el guardado por error de imagen
      }
    }
    
    return resultado;
  };

  const handleGuardar = async () => {
    setCargando(true);
    setError('');
    try {
      const guardado = await guardarCurso();
      if (!guardado) return;
      onGuardar(guardado);
    } catch (e) {
      console.error('Error guardando curso:', e);
      setError(e.message || 'No se pudo guardar el curso');
    } finally {
      setCargando(false);
    }
  };

  const handlePublicar = async () => {
    setCargando(true);
    setError('');
    try {
      const guardado = await guardarCurso();
      if (!guardado) return;
      await cursosService.publicar(guardado.id);
      onGuardar(guardado);
    } catch (e) {
      console.error('Error publicando curso:', e);
      setError(e.message || 'No se pudo publicar el curso');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfbfa]">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onVolver} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {cursoInicial?.id ? 'Editar Curso' : 'Nuevo Curso'}
            </span>
            <Badge variant="secondary" size="sm" className="ml-2">
              {modulos.reduce((acc, m) => acc + m.lecciones.length, 0)} lecciones
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePublicar}
              disabled={cargando || !datos.titulo.trim()}
              className="px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#0f766e' }}
              onMouseEnter={(e) => !cargando && datos.titulo.trim() && (e.target.style.backgroundColor = '#0d5e57')}
              onMouseLeave={(e) => !cargando && datos.titulo.trim() && (e.target.style.backgroundColor = '#0f766e')}
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {cargando ? 'Procesando...' : 'Publicar'}
            </button>
            <button
              onClick={handleGuardar}
              disabled={cargando}
              className="px-4 py-1.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {cargando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* TÍTULO Y DESCRIPCIÓN */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 space-y-3">
          <input
            type="text"
            value={datos.titulo}
            onChange={(e) => setDatos({ ...datos, titulo: e.target.value })}
            placeholder="Título del curso"
            className="w-full text-xl font-semibold text-gray-900 bg-transparent border-0 border-b-2 pb-2 transition-colors placeholder:text-gray-300 focus:outline-none border-transparent hover:border-gray-200 focus:border-[#0f766e]"
          />
          
          <textarea
            value={datos.descripcion}
            onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
            placeholder="Descripción del curso..."
            rows={1}
            className="w-full text-sm text-gray-500 bg-transparent border-0 border-b-2 pb-2 resize-none transition-colors border-transparent hover:border-gray-200 focus:border-[#0f766e] focus:outline-none placeholder:text-gray-300"
          />
        </div>

        {/* BARRA DE HERRAMIENTAS */}
        <Toolbar datos={datos} setDatos={setDatos} />

        {/* CONTENIDO DEL CURSO */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700">Contenido del Curso</h3>
            </div>
            <button
              onClick={agregarModulo}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-4 h-4" /> Agregar Módulo
            </button>
          </div>

          {modulos.map((modulo, index) => (
            <div key={modulo.id} className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div 
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50/50 transition-colors"
                onClick={() => setModuloEditando(moduloEditando === modulo.id ? null : modulo.id)}
              >
                <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
                <span className="text-sm font-medium text-gray-700">
                  {modulo.titulo || `Módulo ${index + 1}`}
                </span>
                <span className="text-xs text-gray-400">{modulo.lecciones.length} lecciones</span>
                <div className="flex-1" />
                <button
                  onClick={(e) => { e.stopPropagation(); eliminarModulo(modulo.id); }}
                  className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${moduloEditando === modulo.id ? 'rotate-180' : ''}`} />
              </div>

              {moduloEditando === modulo.id && (
                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                  <Input
                    value={modulo.titulo}
                    onChange={(e) => actualizarModulo(modulo.id, 'titulo', e.target.value)}
                    placeholder="Nombre del módulo"
                    className="w-full"
                  />

                  <div className="space-y-3">
                    {modulo.lecciones.map((leccion) => (
                      <div key={leccion.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layout className="w-4 h-4 text-gray-400" />
                            <Input
                              value={leccion.titulo}
                              onChange={(e) => actualizarLeccion(modulo.id, { ...leccion, titulo: e.target.value })}
                              placeholder="Título de la lección"
                              className="flex-1 border-0 bg-transparent focus:ring-0 px-0 text-sm font-medium"
                            />
                            <Badge variant="secondary" size="sm">
                              {leccion.bloques.length} bloques
                            </Badge>
                          </div>
                          <button
                            onClick={() => eliminarLeccion(modulo.id, leccion.id)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="space-y-2 ml-6">
                          {leccion.bloques.map((bloque, bIndex) => (
                            <BloqueContenido
                              key={bloque.id}
                              bloque={bloque}
                              index={bIndex}
                              totalBloques={leccion.bloques.length}
                              onUpdate={(updated) => actualizarBloque(modulo.id, leccion.id, updated)}
                              onEliminar={() => eliminarBloque(modulo.id, leccion.id, bloque.id)}
                              onMoveUp={() => moverBloque(modulo.id, leccion.id, bloque.id, -1)}
                              onMoveDown={() => moverBloque(modulo.id, leccion.id, bloque.id, 1)}
                              examenesDisponibles={examenesDisponibles}
                              onExamenCreado={handleExamenCreado}
                              cursoTitulo={datos.titulo || 'Curso'}
                            />
                          ))}
                          
                          <button
                            onClick={() => agregarBloque(modulo.id, leccion.id)}
                            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1 ml-6 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Agregar contenido
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    <button
                      onClick={() => agregarLeccion(modulo.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar lección
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CreadorCurso;