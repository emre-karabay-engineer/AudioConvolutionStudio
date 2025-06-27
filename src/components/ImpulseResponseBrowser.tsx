import { useState, useEffect } from 'react'
import { FolderOpen, FileAudio, Loader2 } from 'lucide-react'
import { ImpulseResponse } from '../App'

interface ImpulseResponseBrowserProps {
  selectedFile: ImpulseResponse | null
  onFileSelect: (ir: ImpulseResponse | null) => void
}

const ImpulseResponseBrowser: React.FC<ImpulseResponseBrowserProps> = ({ selectedFile, onFileSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [impulseResponses, setImpulseResponses] = useState<ImpulseResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load impulse responses from server
  useEffect(() => {
    const loadImpulseResponses = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('http://localhost:3001/impulse-responses')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        setImpulseResponses(data)
      } catch (err) {
        console.error('Error loading impulse responses:', err)
        setError(err instanceof Error ? err.message : 'Failed to load impulse responses')
      } finally {
        setLoading(false)
      }
    }

    loadImpulseResponses()
  }, [])

  const categories = ['All', ...Array.from(new Set(impulseResponses.map(ir => ir.category)))]
  
  const filteredIRs = selectedCategory === 'All' 
    ? impulseResponses 
    : impulseResponses.filter(ir => ir.category === selectedCategory)

  if (loading) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FolderOpen className="w-5 h-5 mr-2" />
          Impulse Response Library
        </h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-2" />
          <span className="text-gray-600">Loading impulse responses...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FolderOpen className="w-5 h-5 mr-2" />
          Impulse Response Library
        </h3>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <FolderOpen className="w-5 h-5 mr-2" />
        Impulse Response Library
      </h3>
      
      {selectedFile ? (
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <FileAudio className="w-5 h-5 text-primary-600 mr-2" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{selectedFile.category}</p>
                </div>
              </div>
              <button
                onClick={() => onFileSelect(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* IR List */}
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            {filteredIRs.map((ir, index) => (
              <div
                key={index}
                onClick={() => onFileSelect(ir)}
                className="p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{ir.name}</p>
                    <p className="text-xs text-gray-500">{ir.category}</p>
                  </div>
                  <FileAudio className="w-4 h-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ImpulseResponseBrowser 