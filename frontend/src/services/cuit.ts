const CUIT_API_URL = import.meta.env.VITE_CUIT_API_URL;

export interface CuitData {
  denominacion: string;
  cuit: string;
  tipo_persona: string;
  condicion_ganancias: string;
  condicion_iva: string;
  condicion_empleador: string;
}

export interface CuitValidationResult {
  success: boolean;
  data?: CuitData;
  error?: string;
}

export async function consultarCuit(cuitStr: string): Promise<CuitValidationResult> {
  const numero = cuitStr.replace(/\D/g, ''); // limipamos guiones/espacios
  
  if (numero.length !== 11) {
    return { success: false, error: 'El CUIT debe tener exactamente 11 dígitos' };
  }

  if (!CUIT_API_URL) {
    return { success: false, error: 'VITE_CUIT_API_URL no está configurada' };
  }

  try {
    const response = await fetch(`${CUIT_API_URL}/api/v1/cuit/${numero}`);
    
    if (!response.ok) {
      if (response.status === 404) {
         return { success: false, error: 'CUIT no encontrado' };
      }
      return { success: false, error: 'Error al consultar el CUIT' };
    }

    const data: CuitData = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: 'No se pudo conectar con el servidor validando CUIT' };
  }
}
