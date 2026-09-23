// front/src/pages/ValidarCertificado.jsx
// PÁGINA PÚBLICA DE VERIFICACIÓN DE CERTIFICADOS (sin login)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award, ShieldCheck, ShieldX, Search, AlertTriangle, ArrowLeft
} from 'lucide-react';
import certificadosService from '../services/certificadosService';
import { Button, Badge } from '../components/ui';

// Acepta un código suelto o una URL completa (.../validar/CERT-XXXX)
const extraerCodigo = (texto) => {
  const t = String(texto || '').trim();
  if (!t) return '';
  const match = t.match(/\/validar\/([^/?#\s]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
  return t;
};

const varianteEstado = (estado) => {
  const e = String(estado || '').toLowerCase();
  if (e === 'emitido') return 'success';
  if (e === 'cancelado') return 'danger';
  return 'default';
};

const Dato = ({ etiqueta, valor }) => (
  <div className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
    <span className="text-xs text-gray-500 shrink-0">{etiqueta}</span>
    <span className="text-sm font-medium text-gray-900 text-right break-words">
      {valor || '—'}
    </span>
  </div>
);

const ValidarCertificado = () => {
  const { codigo } = useParams();
  const navigate = useNavigate();
  const [valor, setValor] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!codigo) return;
    let activo = true;
    // SetState dentro de función anidada (patrón del repo — evita set-state-in-effect)
    const verificar = async () => {
      setCargando(true);
      setError('');
      setResultado(null);
      try {
        const data = await certificadosService.validarPublico(codigo);
        if (activo) setResultado(data);
      } catch (e) {
        if (activo) setError(e.message || 'No se pudo verificar el certificado');
      } finally {
        if (activo) setCargando(false);
      }
    };
    verificar();
    return () => {
      activo = false;
    };
  }, [codigo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const limpio = extraerCodigo(valor);
    if (!limpio) return;
    setCargando(true);
    setError('');
    setResultado(null);
    navigate(`/validar/${encodeURIComponent(limpio)}`);
  };

  const fecha = resultado?.fecha_emision
    ? new Date(resultado.fecha_emision).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#e6f4f2] flex items-center justify-center mx-auto mb-3">
            <Award className="w-7 h-7 text-[#0f766e]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Verificación de Certificados
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Zenth Academy — Valide la originalidad sin iniciar sesión
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8">
          {!codigo ? (
            /* ===== FORMULARIO DE BÚSQUEDA ===== */
            <form onSubmit={handleSubmit} className="space-y-4">
              <label
                htmlFor="input-codigo"
                className="block text-sm font-medium text-gray-700"
              >
                Código del certificado
              </label>
              <input
                id="input-codigo"
                type="text"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="CERT-XXXXXXXX"
                autoComplete="off"
                className="w-full px-4 py-3 text-base font-mono tracking-wider border border-gray-200 rounded-xl outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#e6f4f2] transition-all"
              />
              <p className="text-[11px] text-gray-400">
                También puede pegar el enlace completo de verificación.
              </p>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                icon={<Search className="w-4 h-4" />}
                disabled={!valor.trim()}
              >
                Verificar
              </Button>
            </form>
          ) : cargando ? (
            /* ===== CARGANDO ===== */
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Verificando certificado…</p>
            </div>
          ) : error ? (
            /* ===== ERROR DE RED / SERVIDOR ===== */
            <div className="py-8 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                No se pudo verificar
              </h2>
              <p className="text-sm text-gray-500 mb-5">{error}</p>
              <Link
                to="/validar"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0f766e] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Intentar con otro código
              </Link>
            </div>
          ) : !resultado ||
            (resultado.codigo != null && resultado.codigo !== codigo) ? (
            /* ===== ESPERANDO RESULTADO VIGENTE (evita destello de resultado viejo) ===== */
            <div className="py-10 text-center">
              <div className="w-8 h-8 border-4 border-[#0f766e] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">Verificando certificado…</p>
            </div>
          ) : resultado.valido ? (
            /* ===== CERTIFICADO VÁLIDO ===== */
            <div>
              <div className="text-center mb-5">
                <ShieldCheck className="w-16 h-16 text-emerald-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-gray-900">
                  Certificado Válido
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Consultado:{' '}
                  <span className="font-mono text-gray-600">
                    {resultado.codigo || codigo}
                  </span>
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl px-4 py-2 mb-4">
                <Dato etiqueta="Estudiante" valor={resultado.estudiante_nombre} />
                <Dato etiqueta="Curso" valor={resultado.curso_titulo} />
                <Dato etiqueta="Docente" valor={resultado.docente_nombre} />
                <Dato etiqueta="Fecha de emisión" valor={fecha} />
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className="text-xs text-gray-500">Estado</span>
                  <Badge variant={varianteEstado(resultado.estado)} size="md">
                    {resultado.estado || '—'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-3 py-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Firma</span>
                  {resultado.firma_verificada ? (
                    <span className="text-xs font-medium text-emerald-600">
                      Firmado digitalmente ✓
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sin firma</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 py-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Emitido por</span>
                  <span className="text-xs font-medium text-gray-700">
                    {resultado.emitido_por || 'Zenth Academy'}
                  </span>
                </div>
              </div>

              <Link
                to="/validar"
                className="flex items-center justify-center gap-2 text-sm font-medium text-[#0f766e] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Verificar otro código
              </Link>
            </div>
          ) : (
            /* ===== CERTIFICADO INVÁLIDO ===== */
            <div className="py-4 text-center">
              <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Certificado no válido
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                {resultado?.motivo || 'Certificado no encontrado'}
              </p>
              <p className="text-xs text-gray-400 mb-5">
                Código consultado:{' '}
                <span className="font-mono text-gray-600">
                  {resultado?.codigo || codigo}
                </span>
              </p>
              <Link
                to="/validar"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#0f766e] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Intentar con otro código
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-sm font-medium text-[#0f766e] hover:underline"
          >
            Ir a Zenth Academy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ValidarCertificado;
