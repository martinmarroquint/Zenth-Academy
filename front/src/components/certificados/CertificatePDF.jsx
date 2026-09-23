// front/src/components/certificados/CertificatePDF.jsx
// GENERACIÓN DE PDF DEL CERTIFICADO (sin html2canvas / jspdf)
// Usa @react-pdf/renderer + qrcode para el QR de verificación.
import React from 'react';
import {
  Document, Page, Text, View, Image, StyleSheet, pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { getValidacionUrl } from './certificateConfig';

const W = 842; // A4 apaisado
const H = 595;

const s = StyleSheet.create({
  page: { backgroundColor: '#ffffff', fontFamily: 'Helvetica', padding: 0 },
  // Clasico / Academico
  bordeExterno: { flex: 1, margin: 14, borderWidth: 5, borderStyle: 'solid' },
  bordeInterno: { flex: 1, margin: 4, borderWidth: 1.5, borderStyle: 'solid' },
  bordeOro: { flex: 1, margin: 4, borderWidth: 0.8, borderStyle: 'solid' },
  cuerpo: { flex: 1, paddingHorizontal: 40, paddingVertical: 22, flexWrap: 'nowrap' },
  // Contenido
  marca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  marcaLogo: { width: 24, height: 24, marginRight: 6 },
  marcaTexto: { fontSize: 10, letterSpacing: 2, color: '#374151' },
  marcaClaro: { color: '#ffffff' },
  marcaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 48 },
  titulo: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginTop: 6 },
  otorgado: { fontSize: 8, letterSpacing: 3, color: '#9ca3af', textAlign: 'center', marginTop: 14 },
  nombre: { fontSize: 28, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginTop: 5 },
  divisor: { width: 110, height: 1, alignSelf: 'center', marginTop: 10, marginBottom: 10 },
  parrafo: { fontSize: 10, color: '#6b7280', textAlign: 'center', fontStyle: 'italic' },
  curso: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginTop: 5 },
  nota: { fontSize: 10, color: '#4b5563', textAlign: 'center', marginTop: 7 },
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 48, paddingBottom: 24 },
  firmaLinea: { width: 140, borderBottomWidth: 1, borderBottomColor: '#d1d5db', alignSelf: 'center', marginBottom: 5 },
  firmaNombre: { fontSize: 10, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' },
  firmaCargo: { fontSize: 8, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  fechaLabel: { fontSize: 7, letterSpacing: 1.5, color: '#9ca3af', textAlign: 'center', marginBottom: 3 },
  fecha: { fontSize: 10, color: '#374151', textAlign: 'center' },
  qr: { width: 56, height: 56 },
  qrCaption: { fontSize: 6.5, color: '#6b7280', textAlign: 'center', marginTop: 3 },
  codigo: { fontSize: 7, fontFamily: 'Courier', color: '#6b7280', textAlign: 'center', marginTop: 1 },
  bloqueQR: { alignItems: 'center' },
  // Academico
  banda: { height: 90, paddingHorizontal: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bandaTexto: { fontSize: 9, letterSpacing: 3, color: 'rgba(255,255,255,0.75)' },
  sello: {
    position: 'absolute', right: 48, top: 62, width: 56, height: 56,
    borderRadius: 28, alignItems: 'center', justifyContent: 'center',
  },
  selloTexto: { fontSize: 7, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  // Moderno
  barra: { width: 14 },
  barraOro: { width: 48, height: 3, marginBottom: 8 },
  izquierda: { textAlign: 'left' },
});

const nombres = (certificado) => ({
  estudiante: certificado?.estudiante_nombre || 'Nombre del estudiante',
  curso: certificado?.curso_titulo || 'Título del curso',
  codigo: certificado?.codigo || 'CERT-XXXXXXXX',
});

const ContenidoCentral = ({ config, certificado, izquierda = false }) => {
  const { estudiante, curso } = nombres(certificado);
  const alinear = izquierda ? [s.izquierda] : [];
  return (
    <View style={{ alignItems: izquierda ? 'flex-start' : 'center' }}>
      {izquierda && <View style={[s.barraOro, { backgroundColor: config.color_acento }]} />}
      <Text style={[s.titulo, ...alinear, { color: config.color_primario }]}>
        {config.texto_titulo}
      </Text>
      <Text style={[s.otorgado, ...alinear]}>OTORGADO A</Text>
      <Text style={[s.nombre, ...alinear]}>{estudiante}</Text>
      {!izquierda && (
        <View style={[s.divisor, { backgroundColor: config.color_acento }]} />
      )}
      <Text style={[s.parrafo, ...alinear]}>{config.texto_parrafo}</Text>
      <Text style={[s.curso, ...alinear, { color: config.color_primario }]}>{curso}</Text>
      {config.mostrar_nota && config.nota != null && (
        <Text style={[s.nota, ...alinear]}>Calificación: {config.nota}</Text>
      )}
    </View>
  );
};

const BloqueFirma = ({ config }) => (
  <View style={{ width: 150 }}>
    <View style={[s.firmaLinea, { borderBottomColor: config.color_acento }]} />
    <Text style={s.firmaNombre}>{config.firma_nombre || '________________'}</Text>
    <Text style={s.firmaCargo}>{config.firma_cargo || 'Instructor Certificado'}</Text>
  </View>
);

const BloqueQR = ({ qrDataUrl, codigo }) => (
  <View style={s.bloqueQR}>
    {qrDataUrl
      ? <Image src={qrDataUrl} style={s.qr} />
      : <View style={[s.qr, { borderWidth: 1, borderColor: '#e5e7eb' }]} />}
    <Text style={s.qrCaption}>Escanee para verificar</Text>
    <Text style={s.codigo}>Código: {codigo}</Text>
  </View>
);

const FooterComun = ({ config, fechaEmision, codigo, qrDataUrl }) => (
  <View style={s.footer}>
    <BloqueFirma config={config} />
    <View>
      <Text style={s.fechaLabel}>FECHA DE EMISIÓN</Text>
      <Text style={s.fecha}>{fechaEmision}</Text>
    </View>
    <BloqueQR qrDataUrl={qrDataUrl} codigo={codigo} />
  </View>
);

const Marca = ({ incluirLogo, config, claro = false }) => (
  <View style={s.marca}>
    {incluirLogo && config.logo_url
      ? <Image src={config.logo_url} style={s.marcaLogo} />
      : null}
    <Text style={[s.marcaTexto, claro && s.marcaClaro]}>ZENTH ACADEMY</Text>
  </View>
);

const VistaClasico = ({ certificado, config, fechaEmision, qrDataUrl, incluirLogo }) => (
  <Page size={{ width: W, height: H }} style={s.page}>
    <View style={[s.bordeExterno, { borderColor: config.color_primario }]}>
      <View style={[s.bordeInterno, { borderColor: config.color_primario }]}>
        <View style={[s.bordeOro, { borderColor: config.color_acento }]}>
          <View style={s.cuerpo}>
            <Marca incluirLogo={incluirLogo} config={config} />
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <ContenidoCentral config={config} certificado={certificado} />
            </View>
            <FooterComun
              config={config}
              fechaEmision={fechaEmision}
              codigo={nombres(certificado).codigo}
              qrDataUrl={qrDataUrl}
            />
          </View>
        </View>
      </View>
    </View>
  </Page>
);

const MarcaRow = ({ incluirLogo, config }) => (
  <View style={s.marcaRow}>
    <Marca incluirLogo={incluirLogo} config={config} />
    <View style={[s.barraOro, { backgroundColor: config.color_acento, marginBottom: 0 }]} />
  </View>
);

const VistaModerno = ({ certificado, config, fechaEmision, qrDataUrl, incluirLogo }) => (
  <Page size={{ width: W, height: H }} style={s.page}>
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={[s.barra, { backgroundColor: config.color_primario }]} />
      <View style={{ flex: 1, paddingHorizontal: 40, paddingVertical: 26 }}>
        <MarcaRow incluirLogo={incluirLogo} config={config} />
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ContenidoCentral config={config} certificado={certificado} izquierda />
        </View>
        <FooterComun
          config={config}
          fechaEmision={fechaEmision}
          codigo={nombres(certificado).codigo}
          qrDataUrl={qrDataUrl}
        />
      </View>
    </View>
  </Page>
);

const VistaAcademico = ({ certificado, config, fechaEmision, qrDataUrl, incluirLogo }) => (
  <Page size={{ width: W, height: H }} style={s.page}>
    <View style={[s.banda, { backgroundColor: config.color_primario }]}>
      <Marca incluirLogo={incluirLogo} config={config} claro />
      <Text style={s.bandaTexto}>CERTIFICACIÓN OFICIAL</Text>
    </View>
    <View style={[s.sello, { backgroundColor: config.color_acento }]}>
      <Text style={s.selloTexto}>ZENTH</Text>
      <Text style={[s.selloTexto, { marginTop: 2 }]}>★</Text>
    </View>
    <View style={{ flex: 1, paddingHorizontal: 48, paddingTop: 46, paddingBottom: 0 }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingRight: 40 }}>
        <ContenidoCentral config={config} certificado={certificado} />
      </View>
      <FooterComun
        config={config}
        fechaEmision={fechaEmision}
        codigo={nombres(certificado).codigo}
        qrDataUrl={qrDataUrl}
      />
    </View>
  </Page>
);

export const CertificateDocument = ({ certificado, config, fechaEmision, qrDataUrl, incluirLogo }) => {
  const plantilla = config?.template || 'clasico';
  const props = { certificado, config, fechaEmision, qrDataUrl, incluirLogo };
  let vista = <VistaClasico {...props} />;
  if (plantilla === 'moderno') vista = <VistaModerno {...props} />;
  else if (plantilla === 'academico') vista = <VistaAcademico {...props} />;
  return <Document>{vista}</Document>;
};

// eslint-disable-next-line react-refresh/only-export-components -- util de descarga exportada desde el mismo módulo del documento
export async function generarPDF({ certificado, config, fechaEmision }) {
  const codigo = certificado?.codigo || 'zenth';
  let qrDataUrl = null;
  try {
    qrDataUrl = await QRCode.toDataURL(getValidacionUrl(codigo), {
      width: 200,
      margin: 1,
    });
  } catch {
    qrDataUrl = null;
  }

  const crearBlob = (incluirLogo) =>
    pdf(
      <CertificateDocument
        certificado={certificado}
        config={config}
        fechaEmision={fechaEmision}
        qrDataUrl={qrDataUrl}
        incluirLogo={incluirLogo}
      />
    ).toBlob();

  let blob;
  if (config?.logo_url) {
    try {
      blob = await crearBlob(true);
    } catch {
      // logo no cargable (CORS/ruta inválida) → reintentar solo texto
      blob = await crearBlob(false);
    }
  } else {
    blob = await crearBlob(false);
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `certificado-${codigo}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
