import { useState, useEffect } from 'react'
import AudioFileBrowser from './components/AudioFileBrowser'
import ImpulseResponseBrowser from './components/ImpulseResponseBrowser'
import MixControls from './components/MixControls'
import PreviewControls from './components/PreviewControls'
import AudioVisualizer from './components/AudioVisualizer'
import ProcessingStatus from './components/ProcessingStatus'

export interface AudioFile {
  name: string
  path: string
  duration?: number
}

export interface ImpulseResponse {
  name: string
  path: string
  category: string
}

export interface AudioSettings {
  dryWet: number
  inputGain: number
  outputGain: number
  impulseGain: number
  lowPassFreq: number
  highPassFreq: number
  stereoWidth: number
  normalize: boolean
}

function App() {
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null)
  const [impulseResponse, setImpulseResponse] = useState<ImpulseResponse | null>(null)
  const [outputFile, setOutputFile] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const [settings, setSettings] = useState<AudioSettings>({
    dryWet: 50,
    inputGain: 0,
    outputGain: 0,
    impulseGain: 0,
    lowPassFreq: 20000,
    highPassFreq: 20,
    stereoWidth: 100,
    normalize: true
  })
  const [status, setStatus] = useState<string>('')

  // Check if running in Electron
  useEffect(() => {
    const checkElectron = () => {
      return window && (window as any).process && (window as any).process.type;
    };
    
    if (checkElectron()) {
      setIsElectron(true);
    }
  }, []);

  // Helper function to get the correct URL for files
  const getFileUrl = (filePath: string) => {
    console.log('App getFileUrl called with:', filePath, 'isElectron:', isElectron)
    
    if (isElectron && filePath.startsWith('/')) {
      // In Electron, prefix with backend server URL
      const fullUrl = `http://localhost:3001${filePath}`;
      console.log('Electron mode - converted to:', fullUrl)
      return fullUrl;
    }
    
    // For web mode, if it's a relative path, make it absolute
    if (filePath.startsWith('/') && !filePath.startsWith('http')) {
      const fullUrl = `http://localhost:3001${filePath}`;
      console.log('Web mode - converted to:', fullUrl)
      return fullUrl;
    }
    
    console.log('Using original path:', filePath)
    return filePath;
  };

  const handleProcessAudio = async () => {
    if (!audioFile || !impulseResponse) {
      setStatus('Please select both an audio file and an impulse response')
      return
    }

    setStatus('Processing audio...')
    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      const formData = new FormData()
      
      // Fetch the audio file from its path
      const audioUrl = getFileUrl(audioFile.path)
      const audioResponse = await fetch(audioUrl)
      const audioBlob = await audioResponse.blob()
      formData.append('audioFile', audioBlob, audioFile.name)
      
      // Fetch the impulse response file from its path
      const irUrl = getFileUrl(impulseResponse.path)
      const irResponse = await fetch(irUrl)
      const irBlob = await irResponse.blob()
      formData.append('impulseResponse', irBlob, impulseResponse.name)
      
      // Add audio settings
      const audioSettings = {
        dryWet: settings.dryWet,
        inputGain: settings.inputGain,
        outputGain: settings.outputGain,
        impulseGain: settings.impulseGain,
        lowPassFreq: settings.lowPassFreq,
        highPassFreq: settings.highPassFreq,
        stereoWidth: settings.stereoWidth,
        normalize: settings.normalize
      }
      formData.append('settings', JSON.stringify(audioSettings))
      
      const response = await fetch('http://localhost:3001/process-audio', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        console.log('Processing result:', result)
        console.log('Output file path:', result.outputFile)
        setOutputFile(result.outputFile)
        setStatus('Processing completed successfully!')
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error) {
      setStatus(`Error: ${error}`)
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }

  const handleSettingsChange = (newSettings: AudioSettings) => {
    setSettings(newSettings)
  }

  const handlePlaybackStateChange = (playing: boolean) => {
    setIsPlaying(playing)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Audio Convolution Studio
          </h1>
          <p className="text-lg text-gray-600">
            Professional audio processing with real-time preview and visualization
          </p>
        </header>

        {/* Status Display */}
        {status && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">{status}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <AudioFileBrowser 
              selectedFile={audioFile} 
              onFileSelect={setAudioFile} 
            />
            
            <ImpulseResponseBrowser 
              selectedFile={impulseResponse} 
              onFileSelect={setImpulseResponse} 
            />
            
            <MixControls 
              onProcess={handleProcessAudio}
              isProcessing={isProcessing}
              settings={settings}
              onSettingsChange={handleSettingsChange}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <PreviewControls 
              audioFile={audioFile}
              impulseResponse={impulseResponse}
              outputFile={outputFile}
              onPlaybackStateChange={handlePlaybackStateChange}
            />
            
            <AudioVisualizer 
              audioFile={audioFile}
              impulseResponse={impulseResponse}
              outputFile={outputFile}
              isPlaying={isPlaying}
            />
            
            <ProcessingStatus 
              isProcessing={isProcessing}
              progress={processingProgress}
              outputFile={outputFile}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App 