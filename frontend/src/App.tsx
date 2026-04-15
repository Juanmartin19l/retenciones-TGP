import { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Save, 
  RotateCcw,
  Building2,
  AlertCircle
} from 'lucide-react';
import { uploadToOcr } from './services/ocr';
import type { OcrUploadResult } from './services/ocr';
import { parseReceiptText } from './utils/receiptParser';
import { buscarCuentaSGP, CUENTAS_SGP, type CuentaSGP } from './utils/cuentasSGP';
import { consultarCuit, type CuitData } from './services/cuit';

type AppState = 'idle' | 'uploading' | 'processing_ocr' | 'ready' | 'error';
type ComprobanteTipo = 'Gasto' | 'Sueldo' | 'Otro';

interface ExtractedData {
  fecha: string;
  monto: string;
  banco: string;
  nroComprobante: string;
  cbuOrigen: string; // Extraído del OCR
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData>({
    fecha: '',
    monto: '',
    banco: '',
    nroComprobante: '',
    cbuOrigen: ''
  });
  // Campos que tipea el usuario
  const [cuitDestino, setCuitDestino] = useState('');
  const [tipo, setTipo] = useState<ComprobanteTipo>('Gasto');
  const [numOpSafyc, setNumOpSafyc] = useState('');
  
  // Cuenta destino SGP seleccionada por el usuario
  const [cuentaDestinoSGP, setCuentaDestinoSGP] = useState<CuentaSGP | null>(null);
  
  const [cuitData, setCuitData] = useState<CuitData | null>(null);
  const [isConsultandoCuit, setIsConsultandoCuit] = useState(false);
  const [errorCuit, setErrorCuit] = useState<string | null>(null);

  const [rawOcrText, setRawOcrText] = useState<string>('');
  const [ocrConfidence, setOcrConfidence] = useState<number>(0);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Efecto para buscar CUIT cuando se ingresan 11 digitos
  useEffect(() => {
    const checkCuit = async () => {
      const numero = cuitDestino.replace(/\D/g, '');
      if (numero.length === 11) {
        setIsConsultandoCuit(true);
        setErrorCuit(null);
        const result = await consultarCuit(numero);
        setIsConsultandoCuit(false);
        if (result.success && result.data) {
          setCuitData(result.data);
        } else {
          setCuitData(null);
          // no pasa nada si falla o no existe, solo avisamos sutilmente (no bloquea guardado)
          setErrorCuit(result.error || 'No encontrado');
        }
      } else {
        setCuitData(null);
        setErrorCuit(null);
      }
    };
    
    // Debounce de 600ms para no disparar peticiones con cada tecla si pegó el texto de a poco
    const timeoutId = setTimeout(checkCuit, 600);
    return () => clearTimeout(timeoutId);
  }, [cuitDestino]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAppState('uploading');
    setErrorMessage(null);
    setParseErrors([]);

    try {
      const result: OcrUploadResult = await uploadToOcr(file);
      setAppState('processing_ocr');

      if (!result.success) {
        setErrorMessage(result.error || 'Error desconocido en el OCR');
        setAppState('error');
        return;
      }

      setRawOcrText(result.text);
      setOcrConfidence(result.confidence);

      const parseResult = parseReceiptText(result.text);

      setParseErrors(parseResult.errors);

      if (parseResult.data) {
        // Extraer CBU origen y ver si coincide con alguna cuenta SGP
        const cbuOrigen = parseResult.data.cbuOrigen || '';
        const cuentaMatch = cbuOrigen ? buscarCuentaSGP(cbuOrigen) : null;
        
        // Si el CBU origen coincide con una cuenta SGP, pre-seleccionarla
        // Si no coincide o no hay CBU, el usuario debe seleccionar del dropdown
        setCuentaDestinoSGP(cuentaMatch);

        setData({
          fecha: parseResult.data.fecha || '',
          monto: parseResult.data.monto || '',
          banco: parseResult.data.banco || '',
          nroComprobante: parseResult.data.nroComprobante || '',
          cbuOrigen: cbuOrigen,
        });
      }

      setAppState('ready');

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado';
      setErrorMessage(message);
      setAppState('error');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        const event = new Event('change', { bubbles: true });
        fileInputRef.current.dispatchEvent(event);
      }
    }
  };

  const handleSave = () => {
    const comprobante = {
      archivo: fileName,
      datos: {
        fecha: data.fecha,
        monto: data.monto,
        banco: data.banco,
        nroComprobante: data.nroComprobante,
        cbuOrigen: data.cbuOrigen,
      },
      usuario: {
        cuitDestino,
        tipo,
        numOpSafyc: numOpSafyc ? parseInt(numOpSafyc) : null,
        cuentaDestino: cuentaDestinoSGP, // Cuenta SGP seleccionada
      }
    };
    
    console.log('Comprobante guardado:', comprobante);
    alert('Comprobante guardado exitosamente. La pantalla se reiniciará.');
    
    // Reset total
    setAppState('idle');
    setFileName(null);
    setData({ fecha: '', monto: '', banco: '', nroComprobante: '', cbuOrigen: '' });
    setCuitDestino('');
    setTipo('Gasto');
    setNumOpSafyc('');
    setRawOcrText('');
    setOcrConfidence(0);
    setParseErrors([]);
    setErrorMessage(null);
    setCuentaDestinoSGP(null);
    setCuitData(null);
    setErrorCuit(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setFileName(null);
    setErrorMessage(null);
    setParseErrors([]);
    setRawOcrText('');
    setCuentaDestinoSGP(null);
    setCuitData(null);
    setErrorCuit(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="text-blue-600 h-6 w-6" />
            <h1 className="text-xl font-bold text-gray-900">Retenciones TGP</h1>
          </div>
          <div className="text-sm text-gray-500 font-medium">
            Carga de Comprobantes
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Columna Izquierda: Subida de Archivo */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">1. Subir Comprobante</h2>
              
              {appState === 'idle' || appState === 'error' ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <UploadCloud className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500 mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Click o arrastra tu PDF aquí</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, PDF hasta 5MB</p>
                  <input 
                    type="file" 
                    className="hidden" 
                    ref={fileInputRef} 
                    accept=".pdf,image/*" 
                    onChange={handleFileUpload} 
                  />
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-6 text-center bg-gray-50">
                  <FileText className="mx-auto h-10 w-10 text-blue-500 mb-3" />
                  <p className="text-sm font-medium text-gray-800 truncate px-2" title={fileName || ''}>
                    {fileName}
                  </p>
                  
                  {appState === 'uploading' && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Subiendo archivo...
                    </div>
                  )}

                  {appState === 'processing_ocr' && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Procesando OCR...
                    </div>
                  )}

                  {appState === 'ready' && (
                    <div className="mt-4 flex flex-col items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4" />
                        Extraído con {Math.round(ocrConfidence * 100)}% de confianza
                      </span>
                      <button 
                        onClick={handleReset}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 underline"
                      >
                        <RotateCcw className="h-3 w-3" /> Subir otro archivo
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Error message */}
              {errorMessage && appState === 'error' && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 text-left">{errorMessage}</p>
                </div>
              )}

              {/* Texto OCR para debugging */}
              {rawOcrText && appState === 'ready' && (
                <details className="mt-4">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Ver texto extraído ({rawOcrText.length} chars)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-left overflow-auto max-h-32 whitespace-pre-wrap">
                    {rawOcrText}
                  </pre>
                </details>
              )}
            </div>
          </div>

          {/* Columna Derecha: Formulario */}
          <div className="lg:col-span-8 space-y-6">
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-opacity duration-300 ${appState === 'ready' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">2. Datos del Comprobante</h2>
                {appState === 'ready' && (
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    Extraído por OCR
                  </span>
                )}
              </div>
              
              {/* Errores de parsing */}
              {parseErrors.length > 0 && appState === 'ready' && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm font-medium text-yellow-800 mb-1">
                    ⚠️ Algunos campos no se pudieron extraer automáticamente
                  </p>
                  <ul className="text-xs text-yellow-700 list-disc list-inside">
                    {parseErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha Comprobante</label>
                  <input 
                    type="date" 
                    value={data.fecha ? data.fecha.split('/').reverse().join('-') : ''}
                    onChange={(e) => {
                      const val = e.target.value; // YYYY-MM-DD
                      if (val) {
                        const [year, month, day] = val.split('-');
                        setData({...data, fecha: `${day}/${month}/${year}`});
                      } else {
                        setData({...data, fecha: ''});
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Importe</label>
                  <input 
                    type="text" 
                    value={data.monto}
                    onChange={(e) => setData({...data, monto: e.target.value.replace(/[^0-9.,]/g, '')})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="150.450,00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Banco Origen</label>
                  <input 
                    type="text" 
                    value={data.banco}
                    onChange={(e) => setData({...data, banco: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="Ej: Banco Galicia"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nº de Referencia / Comprobante</label>
                  <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={data.nroComprobante}
                    onChange={(e) => setData({...data, nroComprobante: e.target.value.replace(/\D/g, '')})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    placeholder="Ej: 12345678"
                  />
                </div>
              </div>

              {/* CBU Origen extraído del OCR */}
              {data.cbuOrigen && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cuenta Origen</label>
                  <p className="text-sm font-mono font-semibold text-gray-800 mt-0.5">{data.cbuOrigen}</p>
                </div>
              )}

              {/* Campos que tipea el usuario */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-md font-semibold text-gray-800 mb-4">3. Datos del Destino y Clasificación</h3>
                
                <div className="space-y-4">
                  {/* Cuenta Destino SGP - Dropdown */}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Cuenta Destino SGP</label>
                    <select
                      value={cuentaDestinoSGP?.cbu || ''}
                      onChange={(e) => {
                        const selected = CUENTAS_SGP.find(c => c.cbu === e.target.value);
                        setCuentaDestinoSGP(selected || null);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="">-- Seleccionar cuenta destino --</option>
                      {CUENTAS_SGP.map((cuenta) => (
                        <option key={cuenta.cbu} value={cuenta.cbu}>
                          {cuenta.cbu} - {cuenta.nombre}
                        </option>
                      ))}
                    </select>
                    {cuentaDestinoSGP && (
                      <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> {cuentaDestinoSGP.nombre}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-gray-700">CUIT Proveedor</label>
                      <input 
                        type="text" 
                        value={cuitDestino}
                        onChange={(e) => setCuitDestino(e.target.value)}
                        placeholder="Ej: 30-71123456-8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow font-mono text-sm"
                      />
                      {isConsultandoCuit ? (
                        <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin"/> Validando CUIT...
                        </p>
                      ) : cuitData ? (
                        <p className="text-xs text-green-700 mt-1 font-medium bg-green-50 border border-green-200 px-2 py-1 rounded inline-block">
                          {cuitData.denominacion}
                        </p>
                      ) : errorCuit ? (
                        <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                           <AlertCircle className="h-3 w-3" /> {errorCuit}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1">Autocompleta nombre al ingresar 11 dígitos</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Tipo</label>
                    <select 
                      value={tipo}
                      onChange={(e) => setTipo(e.target.value as ComprobanteTipo)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow bg-white"
                    >
                      <option value="Gasto">Gasto</option>
                      <option value="Sueldo">Sueldo</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">Nº OP SAFyC</label>
                    <input 
                      type="number" 
                      value={numOpSafyc}
                      onChange={(e) => setNumOpSafyc(e.target.value)}
                      placeholder="Ej: 12345"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    />
                  </div>
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={appState !== 'ready'}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  Guardar Comprobante
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
