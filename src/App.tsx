import { useState } from 'react'
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
  const [currentTrack, setCurrentTrack] = useState<'input' | 'ir' | 'output'>('input')
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

  const handleProcess = async () => {
    if (!audioFile || !impulseResponse) {
      alert('Please select both an audio file and an impulse response')
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      // Create FormData for file upload
      const formData = new FormData()
      
      // Fetch the audio file
      const audioResponse = await fetch(audioFile.path)
      const audioBlob = await audioResponse.blob()
      formData.append('audioFile', audioBlob, audioFile.name)
      
      // Fetch the impulse response file
      const irResponse = await fetch(impulseResponse.path)
      const irBlob = await irResponse.blob()
      formData.append('impulseResponse', irBlob, impulseResponse.name)
      
      // Add settings
      formData.append('settings', JSON.stringify(settings))

      console.log('Sending processing request with settings:', settings)

      // Call the backend API
      const response = await fetch('http://localhost:3001/process-audio', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setOutputFile(result.outputFile)
        console.log('Processing completed successfully:', result)
      } else {
        throw new Error(result.error || 'Processing failed')
      }

    } catch (error) {
      console.error('Error processing audio:', error)
      alert(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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

  const handleTrackChange = (track: 'input' | 'ir' | 'output') => {
    setCurrentTrack(track)
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
              onProcess={handleProcess}
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
              onTrackChange={handleTrackChange}
              setOutputFile={setOutputFile}
            />
            
            <AudioVisualizer 
              audioFile={audioFile}
              impulseResponse={impulseResponse}
              outputFile={outputFile}
              currentTrack={currentTrack}
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