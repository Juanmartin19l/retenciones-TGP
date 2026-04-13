import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900">
      <h1 className="text-4xl font-bold mb-8 text-blue-600">Retenciones TGP</h1>
      <div className="p-8 bg-white rounded-xl shadow-lg flex flex-col items-center gap-4">
        <p className="text-lg">
          Vite + React + TypeScript + Tailwind v4
        </p>
        <button
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </div>
    </div>
  )
}

export default App