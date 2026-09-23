// front/src/components/certificados/CertificatePDF.jsx
// GENERACIÓN DE PDF DEL CERTIFICADO (sin html2canvas / jspdf)
// Usa @react-pdf/renderer + qrcode para el QR de verificación.
// Página A4 apaisado nativa → impresión correcta en cualquier impresora.
import React from 'react';
import {
  Document, Page, Text, View, Image, StyleSheet, pdf,
} from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { getValidacionUrl } from './certificateConfig';

// A4 apaisado: react-pdf acepta "A4" + orientation (puntos CSS 72dpi)
const PAGE = { size: 'A4', orientation: 'landscape' };

const s = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    padding: 0,
  },
  // Clasico / Academico — bordes ornamentales con sangrado controlado
  bordeExterno: { flex: 1, margin: 18, borderWidth: 4, borderStyle: 'solid' },
  bordeInterno: { flex: 1, margin: 5, borderWidth: 1.2, borderStyle: 'solid' },
  bordeOro: { flex: 1, margin: 4, borderWidth: 0.6, borderStyle: 'solid' },
  cuerpo: {
    flex: 1,
    paddingHorizontal: 36,
    paddingVertical: 18,
    flexWrap: 'nowrap',
  },
  // Contenido
  marca: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  marcaLogo: { width: 22, height: 22, marginRight: 6, objectFit: 'contain' },
  marcaTexto: { fontSize: 10, letterSpacing: 2, color: '#374151' },
  marcaClaro: { color: '#ffffff' },
  marcaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  titulo: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  otorgado: {
    fontSize: 8,
    letterSpacing: 3,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 12,
  },
  nombre: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
  divisor: {
    width: 100,
    height: 1,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  parrafo: { fontSize: 9.5, color: '#6b7280', textAlign: 'center', fontStyle: 'italic' },
  curso: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginTop: 4 },
  nota: { fontSize: 9.5, color: '#4b5563', textAlign: 'center', marginTop: 6 },
  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 40,
    paddingBottom: 18,
  },
  firmaLinea: {
    width: 130,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    alignSelf: 'center',
    marginBottom: 4,
  },
  firmaNombre: { fontSize: 9.5, fontWeight: 'bold', textAlign: 'center', color: '#1f2937' },
  firmaCargo: { fontSize: 7.5, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  fechaLabel: {
    fontSize: 7,
    letterSpacing: 1.5,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 2,
  },
  fecha: { fontSize: 9.5, color: '#374151', textAlign: 'center' },
  // QR: tamaño generoso para que al imprimir A4 no salga "manchado"
  qr: {
    width: 64,
    height: 64,
    backgroundColor: '#ffffff',
  },
  qrCaption: { fontSize: 6.5, color: '#6b7280', textAlign: 'center', marginTop: 3 },
  codigo: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 1,
  },
  bloqueQR: { alignItems: 'center' },
  // Academico
  banda: {
    height: 72,
    paddingHorizontal: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bandaTexto: { fontSize: 8.5, letterSpacing: 3, color: 'rgba(255,255,255,0.8)' },
  // Sello: anillo fijo (sin position absolute frágil)
  sello: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selloTexto: { fontSize: 7, fontWeight: 'bold', color: '#ffffff', letterSpacing: 1 },
  // Moderno
  barra: { width: 12 },
  barraOro: { width: 44, height: 3, marginBottom: 6 },
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
      {izquierda && (
        <View style={[s.barraOro, { backgroundColor: config.color_acento }]} />
      )}
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
  <View style={{ width: 145 }}>
    <View style={[s.firmaLinea, { borderBottomColor: config.color_acento }]} />
    <Text style={s.firmaNombre}>{config.firma_nombre || '________________'}</Text>
    <Text style={s.firmaCargo}>{config.firma_cargo || 'Instructor Certificado'}</Text>
  </View>
);

const BloqueQR = ({ qrDataUrl, codigo }) => (
  <View style={s.bloqueQR}>
    {qrDataUrl ? (
      <Image src={qrDataUrl} style={s.qr} />
    ) : (
      <View style={[s.qr, { borderWidth: 1, borderColor: '#e5e7eb' }]} />
    )}
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
    {incluirLogo && config.logo_url ? (
      <Image src={config.logo_url} style={s.marcaLogo} />
    ) : null}
    <Text style={[s.marcaTexto, claro && s.marcaClaro]}>ZENTH ACADEMY</Text>
  </View>
);

const VistaClasico = ({ certificado, config, fechaEmision, qrDataUrl, incluirLogo }) => (
  <Page {...PAGE} style={s.page}>
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
  <Page {...PAGE} style={s.page}>
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={[s.barra, { backgroundColor: config.color_primario }]} />
      <View style={{ flex: 1, paddingHorizontal: 36, paddingVertical: 22 }}>
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
  <Page {...PAGE} style={s.page}>
    <View style={[s.banda, { backgroundColor: config.color_primario }]}>
      <Marca incluirLogo={incluirLogo} config={config} claro />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={[
            s.sello,
            { borderColor: config.color_acento, backgroundColor: config.color_acento },
          ]}
        >
          <Text style={s.selloTexto}>ZENTH</Text>
          <Text style={[s.selloTexto, { marginTop: 1 }]}>★</Text>
        </View>
        <Text style={s.bandaTexto}>CERTIFICACIÓN OFICIAL</Text>
      </View>
    </View>
    <View style={{ flex: 1, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 0 }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingRight: 36 }}>
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
  return <Document title={`Certificado ${nombres(certificado).codigo}`}>{vista}</Document>;
};

/**
 * QR nítido para A4: error correction H + margen 2 + color sólido.
 * width alto en el dataURL evita el efecto "manchita" al escalar a 64pt.
 */
async function generarQrDataUrl(codigo) {
  try {
    return await QRCode.toDataURL(getValidacionUrl(codigo), {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch {
    return null;
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- util de descarga exportada desde el mismo módulo del documento
export async function generarPDF({ certificado, config, fechaEmision }) {
  const codigo = certificado?.codigo || 'zenth';
  const qrDataUrl = await generarQrDataUrl(codigo);

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
