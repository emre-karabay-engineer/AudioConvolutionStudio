import { useRef, useState } from 'react'
import { Upload, FileAudio, X, Music } from 'lucide-react'
import { AudioFile } from '../App'

interface AudioFileBrowserProps {
  selectedFile: AudioFile | null
  onFileSelect: (file: AudioFile | null) => void
}

// Sample audio files from assets
const sampleAudioFiles: AudioFile[] = [
  {
    name: "chucr.wav",
    path: "/audio/chucr.wav",
    duration: undefined
  },
  {
    name: "outfun.wav", 
    path: "/audio/outfun.wav",
    duration: undefined
  },
  {
    name: "in.wav",
    path: "/audio/in.wav", 
    duration: undefined
  },
  {
    name: "oof.wav",
    path: "/audio/oof.wav",
    duration: undefined
  }
]

const AudioFileBrowser: React.FC<AudioFileBrowserProps> = ({ selectedFile, onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showSamples, setShowSamples] = useState(false)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('audio/')) {
      const audioFile: AudioFile = {
        name: file.name,
        path: URL.createObjectURL(file),
        duration: undefined // Will be set when audio loads
      }
      onFileSelect(audioFile)
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      const audioFile: AudioFile = {
        name: file.name,
        path: URL.createObjectURL(file),
        duration: undefined
      }
      onFileSelect(audioFile)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleSampleSelect = (sample: AudioFile) => {
    onFileSelect(sample)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <FileAudio className="w-5 h-5 mr-2" />
        Audio File
      </h3>
      
      {selectedFile ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <FileAudio className="w-5 h-5 text-primary-600 mr-2" />
              <div>
                <p className="font-medium text-sm">{selectedFile.name}</p>
                {selectedFile.duration && (
                  <p className="text-xs text-gray-500">
                    Duration: {Math.round(selectedFile.duration)}s
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => onFileSelect(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Click to select or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              Supports WAV, MP3, FLAC, AIFF
            </p>
          </div>

          {/* Sample Files */}
          <div>
            <button
              onClick={() => setShowSamples(!showSamples)}
              className="flex items-center text-sm text-gray-600 hover:text-gray-800"
            >
              <Music className="w-4 h-4 mr-1" />
              {showSamples ? 'Hide' : 'Show'} sample files
            </button>
            
            {showSamples && (
              <div className="mt-2 space-y-2">
                {sampleAudioFiles.map((sample, index) => (
                  <div
                    key={index}
                    onClick={() => handleSampleSelect(sample)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{sample.name}</p>
                        <p className="text-xs text-gray-500">Sample audio file</p>
                      </div>
                      <FileAudio className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  )
}

export default AudioFileBrowser 