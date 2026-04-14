/**
 * Parser para extraer datos de comprobantes de transferencias bancarias argentinas.
 * Usa expresiones regulares sobre el texto devuelto por el OCR.
 */

export interface ParsedReceipt {
  fecha: string;           // Formato DD/MM/YYYY (argentino)
  monto: string;            // Formato: "150.450,00" (punto miles, coma decimales)
  banco: string;           // Nombre del banco
  nroComprobante: string;  // Número de referencia/transferencia
  cbuOrigen: string;       // CBU de la cuenta origen (extraído del OCR)
  textoRaw: string;         // Texto original del OCR para debugging
}

interface ParseResult {
  success: boolean;
  data?: Partial<ParsedReceipt>;
  errors: string[];
}

/**
 * Formatea un monto al formato argentino: 150.450,00
 * Usa punto para miles y coma para decimales.
 */
function formatAmountToArs(amount: string): string {
  // amount viene como "150450.00" (formato numérico standard)
  const parts = amount.split('.');
  const intPart = parts[0];
  const decPart = parts.length > 1 ? parts[1] : '00';

  // Agregar puntos de miles al entero
  const intWithDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${intWithDots},${decPart.padEnd(2, '0')}`;
}

/**
 * Extrae la fecha de un texto OCR.
 * Devuelve en formato DD/MM/YYYY (argentino).
 * Acepta múltiples formatos de entrada.
 */
function extractDate(text: string): string | null {
  const patterns = [
    // Fecha con formato DD/MM/YYYY o DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // Fecha con formato YYYY-MM-DD (ISO)
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // Patrones con texto: "Fecha: DD/MM/YYYY" o "Fecha DD/MM/YYYY"
    /fecha[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,
    // Patrones con día de la semana: "lunes 15/03/2024"
    /(?:lunes|martes|miércoles|jueves|viernes|sábado|domingo)[\s,]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let day: string, month: string, year: string;

      if (match[1].length === 4) {
        // Formato YYYY-MM-DD (ISO)
        year = match[1];
        month = match[2].padStart(2, '0');
        day = match[3].padStart(2, '0');
      } else {
        // Formato DD/MM/YYYY
        day = match[1].padStart(2, '0');
        month = match[2].padStart(2, '0');
        year = match[3];
      }

      const date = new Date(`${year}-${month}-${day}`);
      if (!isNaN(date.getTime())) {
        // Devolver en formato argentino DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }
    }
  }
  return null;
}

/**
 * Extrae el monto de transferencia.
 * Acepta: $150.450,00 | $150450 | 150.450,00 | 150450,00
 * Devuelve en formato argentino: 150.450,00 (sin el $)
 */
function extractAmount(text: string): string | null {
  const patterns = [
    // $150.450,00 o $ 150.450,00 (formato argentino con puntos y coma)
    /\$\s*([\d.]+)[,.](\d{1,2})/,
    // 150.450,00 sin símbolo (punto miles, coma decimales)
    /([\d.]+)[,.](\d{1,2})(?=\s*$|\s*ARS)/m,
    // Monto con símbolo pesos: "$150450" o "$150450.00"
    /\$\s*([\d]+)[,.]?(\d{0,2})/,
    // Transferencia por $150.450,00
    /transferencia[s]?\s*(?:por)?\s*\$\s*([\d.]+)[,.](\d{1,2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Normalizar: quitar puntos de miles del grupo 1 (son separadores de miles en formato argentino)
      // y usar punto decimal internamente
      let intPart = match[1].replace(/\./g, '');
      let decPart = match[2] ? match[2].padEnd(2, '0') : '00';

      // Pero si el patrón tenía coma como separador decimal, el match[2] ya tiene los decimales
      // y match[1] tiene el entero sin puntos
      const normalizedAmount = `${intPart}.${decPart}`;

      if (parseFloat(normalizedAmount) > 0) {
        // Devolver en formato argentino: 150.450,00
        return formatAmountToArs(normalizedAmount);
      }
    }
  }
  return null;
}

/**
 * Extrae el nombre del banco.
 * Busca nombres comunes de bancos argentinos.
 */
function extractBank(text: string): string | null {
  const banks = [
    'Banco Galicia',
    'Banco Santander',
    'Banco BBVA',
    'Banco Macro',
    'Banco Provincia',
    'Banco Ciudad',
    'Banco Nación',
    'Banco ICBC',
    'Banco Supervielle',
    'Banco Patagonia',
    'Banco Hipotecario',
    'Banco Comafi',
    'Banco Piano',
    'Banco de la Nación Argentina',
    'Banco de la Provincia de Buenos Aires',
    'Galicia',
    'Santander',
    'BBVA',
    'Macro',
    'Provincia',
    'ICBC',
    'Supervielle',
    'Patagonia',
    'Hipotecario',
    'Comafi',
    'Piano',
  ];

  const sortedBanks = [...banks].sort((a, b) => b.length - a.length);

  for (const bank of sortedBanks) {
    const escapedBank = bank.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\b${escapedBank}\\b`, 'i');
    if (pattern.test(text)) {
      return bank;
    }
  }
  return null;
}

/**
 * Extrae el número de comprobante/referencia de transferencia.
 */
function extractReference(text: string): string | null {
  const patterns = [
    // Referencia: TRF-12345678 o TRF 12345678
    /(?:referencia|ref|comprobante|nro\.?|número)[:\s]*(?:TRF)?[\s-]*([A-Z]{0,4}[\s-]?\d{6,12})/i,
    // Código de referencia: 12345678
    /(?:código|cod\.?|referencia)[:\s]*(\d{6,12})/i,
    // Formato TRF-XXXXXXXX
    /\b(TRF[\s-]?\d{6,12})\b/i,
    // Transferencia inmediata con número de operativo
    /(?:operativo|operación)[:\s]*(\d{6,12})/i,
    // Solo números largos que parezcan referencias (8-12 dígitos)
    /\b(\d{8,12})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const ref = match[1].replace(/\s/g, '').toUpperCase();
      if (ref.length >= 6) {
        return ref;
      }
    }
  }
  return null;
}

/**
 * Extrae el CBU de la cuenta origen.
 * Busca patrones como "Cuenta origen CC $ 360000200972235"
 * y extrae solo los números.
 */
function extractCbuOrigen(text: string): string | null {
  const patterns = [
    // "Cuenta origen CC $ 360000200972235" - extrae solo los números
    /(?:cuenta\s+origen(?:\s+CC)?\s*\$\s*)(\d{22})/i,
    // "Cuenta origen: 360000200972235"
    /(?:cuenta\s+origen)[:\s]*(\d{22})/i,
    // CBU origen mencionado explícitamente
    /(?:cbu\s+origen)[:\s]*(\d{22})/i,
    // CBU: 22 dígitos juntos o separados por espacios
    /(?:cbu|cta\.?|cuenta)[:\s]*(\d{22})/i,
    // CBU con espacios cada 4 dígitos: "1234 5678 ... 9012"
    /(?:cbu|cta\.?|cuenta)[:\s]*(\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{4}[\s]?\d{2})/i,
    // Solo 22 dígitos consecutivos (último recurso)
    /\b(\d{22})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cbu = match[1].replace(/\s/g, '');
      if (cbu.length === 22 && /^\d+$/.test(cbu)) {
        return cbu;
      }
    }
  }
  return null;
}

/**
 * Parsea el texto OCR de un comprobante y extrae los datos relevantes.
 */
export function parseReceiptText(ocrText: string): ParseResult {
  const errors: string[] = [];
  
  const fecha = extractDate(ocrText);
  if (!fecha) errors.push('No se pudo extraer la fecha');

  const monto = extractAmount(ocrText);
  if (!monto) errors.push('No se pudo extraer el monto');

  const banco = extractBank(ocrText);
  if (!banco) errors.push('No se pudo identificar el banco');

  const nroComprobante = extractReference(ocrText);
  if (!nroComprobante) errors.push('No se pudo extraer el número de comprobante');

  const cbuOrigen = extractCbuOrigen(ocrText);

  const success = !!fecha && !!monto && !!banco && !!nroComprobante;

  return {
    success,
    data: {
      fecha: fecha || undefined,
      monto: monto || undefined,
      banco: banco || undefined,
      nroComprobante: nroComprobante || undefined,
      cbuOrigen: cbuOrigen || undefined,
      textoRaw: ocrText,
    },
    errors,
  };
}

/**
 * Concatena todos los textos de resultados OCR en un solo string.
 */
export function extractTextFromOcrResponse(
  resultados: Array<{ texto: string; confianza: number; caja: number[]; pagina: number | null }>
): string {
  return resultados
    .sort((a, b) => (a.pagina || 1) - (b.pagina || 1))
    .map(r => r.texto)
    .join('\n');
}
