/**
 * Servicio para comunicarse con la API de OCR.
 * La URL base se configura via VITE_OCR_API_URL en .env
 */

const OCR_API_URL = import.meta.env.VITE_OCR_API_URL;

export interface OcrResult {
  texto: string;
  confianza: number;
  caja: number[];
  pagina: number | null;
}

export interface OcrBatchItem {
  nombre_archivo: string;
  ok: boolean;
  resultado: {
    nombre_archivo: string;
    resultados: OcrResult[];
    confianza_promedio: number;
    total_paginas: number;
  } | null;
  error_code: string | null;
  error_message: string | null;
}

export interface OcrResponse {
  total_imagenes: number;
  resultados_por_archivo: OcrBatchItem[];
}

export interface OcrUploadResult {
  success: boolean;
  text: string;           // Texto extraído concatenado
  confidence: number;     // Confianza promedio del OCR
  fileName: string;       // Nombre del archivo procesado
  error?: string;         // Mensaje de error si falló
}

/**
 * Sube un archivo a la API de OCR y devuelve el texto extraído.
 */
export async function uploadToOcr(file: File): Promise<OcrUploadResult> {
  if (!OCR_API_URL) {
    return {
      success: false,
      text: '',
      confidence: 0,
      fileName: file.name,
      error: 'VITE_OCR_API_URL no está configurada en las variables de entorno',
    };
  }

  const formData = new FormData();
  formData.append('files', file);

  try {
    const response = await fetch(`${OCR_API_URL}/api/v1/ocr/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.detail?.message || `HTTP ${response.status}`;
      return {
        success: false,
        text: '',
        confidence: 0,
        fileName: file.name,
        error: `Error ${response.status}: ${errorMsg}`,
      };
    }

    const data: OcrResponse = await response.json();

    if (data.resultados_por_archivo.length === 0) {
      return {
        success: false,
        text: '',
        confidence: 0,
        fileName: file.name,
        error: 'No se recibieron resultados del OCR',
      };
    }

    const item = data.resultados_por_archivo[0];

    if (!item.ok || !item.resultado) {
      return {
        success: false,
        text: '',
        confidence: 0,
        fileName: file.name,
        error: item.error_message || item.error_code || 'Error desconocido en OCR',
      };
    }

    // Concatenar todos los textos extraídos (por si hay varias páginas/líneas)
    const text = item.resultado.resultados
      .map(r => r.texto)
      .join('\n')
      .trim();

    return {
      success: true,
      text,
      confidence: item.resultado.confianza_promedio,
      fileName: item.nombre_archivo,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error de red';
    return {
      success: false,
      text: '',
      confidence: 0,
      fileName: file.name,
      error: `No se pudo conectar al OCR: ${message}`,
    };
  }
}
