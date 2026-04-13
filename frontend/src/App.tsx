import { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Loader2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Save, 
  RotateCcw,
  Building2
} from 'lucide-react';

type AppState = 'idle' | 'uploading' | 'processing_ocr' | 'processing_llm' | 'ready';

interface ExtractedData {
  fecha: string;
  monto: string;
  banco: string;
  nroComprobante: string;
  cuitDestino: string;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [data, setData] = useState<ExtractedData>({
    fecha: '',
    monto: '',
    banco: '',
    nroComprobante: '',
    cuitDestino: ''
  });
  
  const [providerSearch, setProviderSearch] = useState({
    loading: false,
    searched: false,
    found: false,
    name: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setAppState('uploading');

    setTimeout(() => {
      setAppState('processing_ocr');
      
      setTimeout(() => {
        setAppState('processing_llm');
        
        setTimeout(() => {
          setData({
            fecha: new Date().toISOString().split('T')[0],
            monto: '150450.00',
            banco: 'Banco Galicia',
            nroComprobante: 'TRF-98237492',
            cuitDestino: '30-71123456-8'
          });
          setAppState('ready');
        }, 1500);
      }, 1500);
    }, 1000);
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

  const handleSearchProvider = () => {
    if (!data.cuitDestino) return;
    
    setProviderSearch(prev => ({ ...prev, loading: true, searched: false }));
    
    setTimeout(() => {
      const isFound = data.cuitDestino.endsWith('8');
      
      setProviderSearch({
        loading: false,
        searched: true,
        found: isFound,
        name: isFound ? 'Tech Solutions S.A.' : ''
      });
    }, 1200);
  };

  const handleSave = () => {
    alert('Comprobante guardado exitosamente. La pantalla se reiniciará.');
    
    setAppState('idle');
    setFileName(null);
    setData({
      fecha: '',
      monto: '',
      banco: '',
      nroComprobante: '',
      cuitDestino: ''
    });
    setProviderSearch({
      loading: false,
      searched: false,
      found: false,
      name: ''
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleReset = () => {
    setAppState('idle');
    setFileName(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-12">
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
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-800">1. Subir Comprobante</h2>
              
              {appState === 'idle' ? (
                <div 
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <UploadCloud className="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-500 mb-3" />
                  <p className="text-sm text-gray-600 font-medium">Click o arrastra tu PDF aquí</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG o PDF hasta 5MB</p>
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
                  
                  {appState !== 'ready' && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-blue-600 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {appState === 'uploading' && 'Subiendo archivo...'}
                      {appState === 'processing_ocr' && 'Extrayendo texto (OCR)...'}
                      {appState === 'processing_llm' && 'Curando datos (LLM)...'}
                    </div>
                  )}

                  {appState === 'ready' && (
                    <div className="mt-4 flex flex-col items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                        <CheckCircle2 className="h-4 w-4" />
                        Procesado con éxito
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
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-200 transition-opacity duration-300 ${appState === 'ready' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-800">2. Verificación de Datos</h2>
                {appState === 'ready' && (
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-1 rounded">Autocompletado por IA</span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Fecha de Pago</label>
                  <input 
                    type="date" 
                    value={data.fecha}
                    onChange={(e) => setData({...data, fecha: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    readOnly={appState !== 'ready'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Monto Transferido ($)</label>
                  <input 
                    type="number" 
                    value={data.monto}
                    onChange={(e) => setData({...data, monto: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    readOnly={appState !== 'ready'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Banco Origen</label>
                  <input 
                    type="text" 
                    value={data.banco}
                    onChange={(e) => setData({...data, banco: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    readOnly={appState !== 'ready'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nro. de Comprobante</label>
                  <input 
                    type="text" 
                    value={data.nroComprobante}
                    onChange={(e) => setData({...data, nroComprobante: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                    readOnly={appState !== 'ready'}
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-md font-semibold text-gray-800 mb-4">3. Identificación del Proveedor</h3>
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="space-y-1 w-full sm:w-2/3">
                    <label className="text-sm font-medium text-gray-700">CUIT / CUIL del Destino</label>
                    <input 
                      type="text" 
                      value={data.cuitDestino}
                      onChange={(e) => {
                        setData({...data, cuitDestino: e.target.value});
                        setProviderSearch(prev => ({...prev, searched: false}));
                      }}
                      placeholder="Ej: 30-71123456-8"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow font-mono text-sm"
                      readOnly={appState !== 'ready'}
                    />
                  </div>
                  <button 
                    onClick={handleSearchProvider}
                    disabled={appState !== 'ready' || !data.cuitDestino || providerSearch.loading}
                    className="w-full sm:w-1/3 h-10 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-md border border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {providerSearch.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    Buscar en Base
                  </button>
                </div>

                {providerSearch.searched && (
                  <div className={`mt-4 p-3 rounded-md border flex items-start gap-3 ${providerSearch.found ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                    {providerSearch.found ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div>
                      <p className={`text-sm font-semibold ${providerSearch.found ? 'text-green-800' : 'text-yellow-800'}`}>
                        {providerSearch.found ? 'Proveedor Encontrado' : 'Proveedor No Encontrado'}
                      </p>
                      <p className={`text-sm mt-1 ${providerSearch.found ? 'text-green-700' : 'text-yellow-700'}`}>
                        {providerSearch.found 
                          ? `Razón Social: ${providerSearch.name}` 
                          : 'El CUIT ingresado no figura en la base de datos interna. De todos modos podés guardar el comprobante.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

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