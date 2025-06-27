import { useEffect, useRef, useState } from 'react'
import { Activity, BarChart3 } from 'lucide-react'
import { AudioFile, ImpulseResponse } from '../App'

interface AudioVisualizerProps {
  audioFile: AudioFile | null
  impulseResponse: ImpulseResponse | null
  outputFile: string | null
  isPlaying: boolean
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioFile, 
  impulseResponse, 
  outputFile, 
  isPlaying 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [visualizationType, setVisualizationType] = useState<'waveform' | 'spectrum'>('waveform')
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Find the current track from the DOM
  const getCurrentTrack = (): 'input' | 'ir' | 'output' => {
    // Look for audio elements with data-track attribute
    const audioElements = document.querySelectorAll('audio[data-track]')
    
    for (const audio of audioElements) {
      const dataTrack = audio.getAttribute('data-track')
      if (dataTrack === 'input' || dataTrack === 'ir' || dataTrack === 'output') {
        return dataTrack as 'input' | 'ir' | 'output'
      }
    }
    
    // Fallback: try to determine from the currently playing audio
    for (const audio of audioElements) {
      const audioElement = audio as HTMLAudioElement
      if (audioElement.src && !audioElement.paused && audioElement.readyState >= 2) {
        const dataTrack = audio.getAttribute('data-track')
        if (dataTrack === 'input' || dataTrack === 'ir' || dataTrack === 'output') {
          return dataTrack as 'input' | 'ir' | 'output'
        }
      }
    }
    
    return 'input' // Default fallback
  }

  // Setup visualization when track changes or playing state changes
  useEffect(() => {
    if (!canvasRef.current) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return
    }

    // Clear any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Reset state
    setError(null)
    setIsConnected(false)

    const setupVisualization = async () => {
      try {
        // Wait a bit for the audio element to be created by PreviewControls
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        let audioElement = findAudioElement()
        let retryCount = 0
        const maxRetries = 5
        
        // Retry finding the audio element if not found immediately
        while (!audioElement && retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500))
          audioElement = findAudioElement()
          retryCount++
        }
        
        if (!audioElement) {
          setError('No audio element found. Try playing the audio first.')
          return
        }

        // Get the existing audio context from the page
        let audioContext: AudioContext | null = null
        
        // Try to find existing audio context
        const existingContext = (window as any).__audioContext
        if (existingContext && existingContext.state !== 'closed') {
          audioContext = existingContext
        } else {
          // Create new audio context if none exists
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          ;(window as any).__audioContext = audioContext
        }

        // Resume if suspended
        if (audioContext && audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        // Create analyzer
        if (!audioContext) {
          throw new Error('Failed to create audio context')
        }
        
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.8

        // Try to use the shared audio splitter from PreviewControls
        const sharedSplitter = (window as any).__audioSplitter
        if (sharedSplitter) {
          // Connect the shared splitter to our analyzer for visualization
          // The audio playback is handled by PreviewControls via the gain node
          // We only need the analyzer for visualization, not for playback
          sharedSplitter.connect(analyser)
          
          setIsConnected(true)
        } else {
          // Fallback: create a simple test signal if no shared splitter is available
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          // Connect our test signal to the analyzer
          oscillator.connect(gainNode)
          gainNode.connect(analyser)
          analyser.connect(audioContext.destination)
          
          // Set very low frequency and volume so it's barely audible
          oscillator.frequency.setValueAtTime(20, audioContext.currentTime) // Very low frequency
          gainNode.gain.setValueAtTime(0.01, audioContext.currentTime) // Very low volume
          
          oscillator.start()
          
          // Stop after a short time
          setTimeout(() => {
            oscillator.stop()
            gainNode.disconnect()
            analyser.disconnect()
          }, 1000)
          
          setIsConnected(true)
        }

        // Start visualization
        startVisualization(analyser, ctx, canvas)

      } catch (error) {
        setError(`Visualization error: ${error}`)
      }
    }

    setupVisualization()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying])

  const startVisualization = (analyser: AnalyserNode, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw)

      if (visualizationType === 'waveform') {
        analyser.getByteTimeDomainData(dataArray)
        
        ctx.fillStyle = 'rgb(17, 24, 39)' // bg-gray-900
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgb(59, 130, 246)' // text-blue-500
        ctx.beginPath()
        
        const sliceWidth = canvas.width * 1.0 / bufferLength
        let x = 0
        
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0
          const y = v * canvas.height / 2
          
          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
          
          x += sliceWidth
        }
        
        ctx.lineTo(canvas.width, canvas.height / 2)
        ctx.stroke()
      } else {
        analyser.getByteFrequencyData(dataArray)
        
        ctx.fillStyle = 'rgb(17, 24, 39)' // bg-gray-900
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        const barWidth = (canvas.width / bufferLength) * 2.5
        let barHeight
        let x = 0
        
        for (let i = 0; i < bufferLength; i++) {
          barHeight = dataArray[i] / 2
          
          const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
          gradient.addColorStop(0, 'rgb(59, 130, 246)') // blue-500
          gradient.addColorStop(1, 'rgb(147, 51, 234)') // purple-600
          
          ctx.fillStyle = gradient
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
          
          x += barWidth + 1
        }
      }
    }
    
    draw()
  }

  const findAudioElement = (): HTMLAudioElement | null => {
    // Look for audio elements in the document
    const audioElements = document.querySelectorAll('audio')
    
    for (const audio of audioElements) {
      // First, try to find by data-track attribute
      const dataTrack = audio.getAttribute('data-track')
      if (dataTrack === getCurrentTrack()) {
        return audio as HTMLAudioElement
      }
      
      // Check if this audio element is the one we want
      // For blob URLs, we need to check if it's currently loaded and matches our track
      if (audio.src) {
        // If it's a blob URL, check if it's the currently active audio
        if (audio.src.startsWith('blob:')) {
          // Check if this audio element is currently loaded and matches our track
          if (audio.readyState >= 2 && !audio.paused) { // HAVE_CURRENT_DATA or higher and playing
            return audio as HTMLAudioElement
          }
        } else {
          // For regular URLs, check if it matches our track
          const currentTrackName = getCurrentTrackName().toLowerCase()
          const currentTrackPath = getCurrentTrackPath().toLowerCase()
          
          if (audio.src.toLowerCase().includes(currentTrackName) ||
              audio.src.toLowerCase().includes(currentTrackPath) ||
              (getCurrentTrack() === 'output' && audio.src.includes('converted_output')) ||
              (getCurrentTrack() === 'input' && audio.src.includes('uploads')) ||
              (getCurrentTrack() === 'ir' && audio.src.includes('impulse-responses'))) {
            return audio as HTMLAudioElement
          }
        }
      }
    }
    
    // If no specific match found, try to find any audio element that's currently playing
    for (const audio of audioElements) {
      const audioElement = audio as HTMLAudioElement
      if (audioElement.src && !audioElement.paused && audioElement.readyState >= 2) {
        return audioElement
      }
    }
    
    return null
  }

  const getCurrentTrackName = () => {
    switch (getCurrentTrack()) {
      case 'input':
        return audioFile?.name || ''
      case 'ir':
        return impulseResponse?.name || ''
      case 'output':
        return 'Output'
      default:
        return ''
    }
  }

  const getCurrentTrackPath = () => {
    switch (getCurrentTrack()) {
      case 'input':
        return audioFile?.path || ''
      case 'ir':
        return impulseResponse?.path || ''
      case 'output':
        return outputFile || ''
      default:
        return ''
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Audio Visualizer</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setVisualizationType('waveform')}
            className={`p-2 rounded ${visualizationType === 'waveform' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="Waveform"
          >
            <Activity size={16} />
          </button>
          <button
            onClick={() => setVisualizationType('spectrum')}
            className={`p-2 rounded ${visualizationType === 'spectrum' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            title="Spectrum"
          >
            <BarChart3 size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={200}
          className="w-full h-48 bg-gray-900 rounded border border-gray-700"
        />
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 rounded">
            <p className="text-red-400 text-center px-4">{error}</p>
          </div>
        )}
        
        {!error && !isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-90 rounded">
            <p className="text-gray-400 text-center px-4">
              {getCurrentTrack() === 'input' && !audioFile && 'No input audio selected'}
              {getCurrentTrack() === 'ir' && !impulseResponse && 'No impulse response selected'}
              {getCurrentTrack() === 'output' && !outputFile && 'No output audio available'}
              {((getCurrentTrack() === 'input' && audioFile) || 
                (getCurrentTrack() === 'ir' && impulseResponse) || 
                (getCurrentTrack() === 'output' && outputFile)) && 
                'Click play to start visualization'}
            </p>
          </div>
        )}
      </div>

      <div className="mt-2 text-sm text-gray-400">
        <p>Track: {getCurrentTrackName() || 'None'}</p>
        <p>Type: {visualizationType === 'waveform' ? 'Waveform' : 'Spectrum'}</p>
        {isConnected && <p className="text-green-400">Connected</p>}
      </div>
    </div>
  )
}

export default AudioVisualizer 