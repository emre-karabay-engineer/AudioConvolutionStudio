import { useEffect, useRef, useState } from 'react'
import { Activity, BarChart3 } from 'lucide-react'
import { AudioFile, ImpulseResponse } from '../App'

interface AudioVisualizerProps {
  audioFile: AudioFile | null
  impulseResponse: ImpulseResponse | null
  outputFile: string | null
  currentTrack: 'input' | 'ir' | 'output'
  isPlaying: boolean
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ 
  audioFile, 
  impulseResponse, 
  outputFile, 
  currentTrack,
  isPlaying 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const [visualizationType, setVisualizationType] = useState<'waveform' | 'spectrum'>('waveform')
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')

  // Find the existing audio element from PreviewControls
  const findAudioElement = (): HTMLAudioElement | null => {
    // Look for audio elements in the document
    const audioElements = document.querySelectorAll('audio')
    console.log('AudioVisualizer: Found audio elements:', audioElements.length)
    console.log('AudioVisualizer: Looking for track:', currentTrack)
    
    // Log all audio elements for debugging
    audioElements.forEach((audio, index) => {
      console.log(`AudioVisualizer: Element ${index}:`, {
        src: audio.src,
        readyState: audio.readyState,
        paused: audio.paused,
        dataTrack: audio.getAttribute('data-track'),
        parentNode: audio.parentNode instanceof Element ? audio.parentNode.tagName : 'Unknown',
        inDOM: document.contains(audio)
      })
    })
    
    for (const audio of audioElements) {
      console.log('AudioVisualizer: Checking audio element src:', audio.src)
      console.log('AudioVisualizer: Audio element readyState:', audio.readyState)
      console.log('AudioVisualizer: Audio element paused:', audio.paused)
      console.log('AudioVisualizer: Audio element data-track:', audio.getAttribute('data-track'))
      
      // First, try to find by data-track attribute
      const dataTrack = audio.getAttribute('data-track')
      if (dataTrack === currentTrack) {
        console.log('AudioVisualizer: Found audio element by data-track:', dataTrack)
        return audio
      }
      
      // Check if this audio element is the one we want
      // For blob URLs, we need to check if it's currently loaded and matches our track
      if (audio.src) {
        // If it's a blob URL, check if it's the currently active audio
        if (audio.src.startsWith('blob:')) {
          // Check if this audio element is currently loaded and matches our track
          if (audio.readyState >= 2 && !audio.paused) { // HAVE_CURRENT_DATA or higher and playing
            console.log('AudioVisualizer: Found active blob audio element:', audio.src)
            return audio
          }
        } else {
          // For regular URLs, check if it matches our track
          const currentTrackName = getCurrentTrackName().toLowerCase()
          const currentTrackPath = getCurrentTrackPath().toLowerCase()
          
          if (audio.src.toLowerCase().includes(currentTrackName) ||
              audio.src.toLowerCase().includes(currentTrackPath) ||
              (currentTrack === 'output' && audio.src.includes('converted_output')) ||
              (currentTrack === 'input' && audio.src.includes('uploads')) ||
              (currentTrack === 'ir' && audio.src.includes('impulse-responses'))) {
            console.log('AudioVisualizer: Found matching audio element:', audio.src)
            return audio
          }
        }
      }
    }
    
    // If no specific match found, try to find any audio element that's currently playing
    for (const audio of audioElements) {
      if (audio.src && !audio.paused && audio.readyState >= 2) {
        console.log('AudioVisualizer: Found currently playing audio element:', audio.src)
        return audio
      }
    }
    
    console.log('AudioVisualizer: No matching audio element found')
    return null
  }

  // Setup visualization when track changes or playing state changes
  useEffect(() => {
    if (!canvasRef.current) {
      setDebugInfo('Canvas not available')
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setDebugInfo('Could not get canvas context')
      return
    }

    // Clear any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Reset state
    setError(null)
    setIsConnected(false)
    setDebugInfo('Looking for audio element...')

    const setupVisualization = async () => {
      try {
        // Wait a bit for the audio element to be created by PreviewControls
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        let audioElement = findAudioElement()
        let retryCount = 0
        const maxRetries = 5
        
        // Retry finding the audio element if not found immediately
        while (!audioElement && retryCount < maxRetries) {
          setDebugInfo(`Looking for audio element... (attempt ${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 500))
          audioElement = findAudioElement()
          retryCount++
        }
        
        if (!audioElement) {
          setError('No audio element found. Try playing the audio first.')
          setDebugInfo('No audio element found after retries')
          return
        }

        setDebugInfo('Found audio element, setting up analyzer...')

        // Get the existing audio context from the page
        let audioContext: AudioContext | null = null
        
        // Try to find existing audio context
        const existingContext = (window as any).__audioContext
        if (existingContext && existingContext.state !== 'closed') {
          audioContext = existingContext
          console.log('Using existing audio context')
        } else {
          // Create new audio context if none exists
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          ;(window as any).__audioContext = audioContext
          console.log('Created new audio context')
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
          // analyser.connect(audioContext.destination) // REMOVED - causes double playback
          
          setIsConnected(true)
          setDebugInfo('Audio visualizer connected successfully (using shared audio)')
          console.log('AudioVisualizer: Connected successfully using shared splitter')
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
          
          oscillator.start(audioContext.currentTime)
          
          // Store references for cleanup
          ;(window as any).__visualizerOscillator = oscillator
          ;(window as any).__visualizerGain = gainNode
          
          setIsConnected(true)
          setDebugInfo('Audio visualizer connected successfully (using test signal)')
          console.log('AudioVisualizer: Connected successfully with test signal')
        }

        // Start visualization
        startVisualization(analyser, ctx, canvas)

      } catch (error) {
        console.error('AudioVisualizer: Error setting up visualization:', error)
        setError(`Visualization setup failed: ${error}`)
        setDebugInfo(`Error: ${error}`)
      }
    }

    setupVisualization()

    // Cleanup function
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      // Clean up oscillator and gain node (if using fallback)
      if ((window as any).__visualizerOscillator) {
        (window as any).__visualizerOscillator.disconnect()
        ;(window as any).__visualizerOscillator = null
      }
      if ((window as any).__visualizerGain) {
        (window as any).__visualizerGain.disconnect()
        ;(window as any).__visualizerGain = null
      }
      // Note: We don't disconnect from the shared splitter as it's managed by PreviewControls
    }
  }, [currentTrack, isPlaying, audioFile, impulseResponse, outputFile])

  // Listen for manual refresh events
  useEffect(() => {
    const handleManualRefresh = () => {
      // This will trigger the main effect to run again
      console.log('Manual refresh triggered')
    }

    window.addEventListener('manual-refresh', handleManualRefresh)
    return () => window.removeEventListener('manual-refresh', handleManualRefresh)
  }, [])

  const startVisualization = (analyser: AnalyserNode, ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const timeDataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!ctx || !analyser) return

      animationRef.current = requestAnimationFrame(draw)

      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.fillStyle = 'rgb(17, 24, 39)'
      ctx.fillRect(0, 0, width, height)

      if (visualizationType === 'waveform') {
        // Draw waveform
        analyser.getByteTimeDomainData(timeDataArray)
        
        ctx.lineWidth = 2
        ctx.strokeStyle = 'rgb(59, 130, 246)'
        ctx.beginPath()

        const sliceWidth = width / bufferLength
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const v = timeDataArray[i] / 128.0
          const y = v * height / 2

          if (i === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }

          x += sliceWidth
        }

        ctx.lineTo(width, height / 2)
        ctx.stroke()
      } else {
        // Draw spectrum
        analyser.getByteFrequencyData(dataArray)

        const barWidth = (width / bufferLength) * 2.5
        let barHeight
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height

          // Create gradient
          const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height)
          gradient.addColorStop(0, 'rgb(59, 130, 246)')
          gradient.addColorStop(1, 'rgb(147, 197, 253)')

          ctx.fillStyle = gradient
          ctx.fillRect(x, height - barHeight, barWidth, barHeight)

          x += barWidth + 1
        }
      }
    }

    draw()
  }

  // Test function to verify audio context and visualization
  const testVisualization = async () => {
    try {
      setDebugInfo('Testing visualization...')
      
      let audioContext = (window as any).__audioContext
      if (!audioContext || audioContext.state === 'closed') {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        ;(window as any).__audioContext = audioContext
      }
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume()
      }
      
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = 0.8
      
      // Create a test tone
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(analyser)
      analyser.connect(audioContext.destination)
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 2.0)
      
      setIsConnected(true)
      setDebugInfo('Test tone playing - you should see visualization and hear a 2-second tone')
      
      // Start visualization
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d')
        if (ctx) {
          startVisualization(analyser, ctx, canvasRef.current)
        }
      }
      
      // Disconnect after test
      setTimeout(() => {
        oscillator.disconnect()
        gainNode.disconnect()
        analyser.disconnect()
        setIsConnected(false)
        setDebugInfo('Test completed')
      }, 2500)
      
    } catch (error) {
      console.error('Visualization test failed:', error)
      setError(`Test failed: ${error}`)
      setDebugInfo(`Test error: ${error}`)
    }
  }

  // Test DOM insertion
  const testDOMInsertion = () => {
    try {
      console.log('Testing DOM insertion...')
      const testAudio = new Audio()
      testAudio.style.display = 'none'
      testAudio.setAttribute('data-track', 'test')
      testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
      
      document.body.appendChild(testAudio)
      console.log('Test audio element added to DOM')
      console.log('Total audio elements after test:', document.querySelectorAll('audio').length)
      
      // Remove test element after a delay
      setTimeout(() => {
        if (testAudio.parentNode) {
          testAudio.parentNode.removeChild(testAudio)
          console.log('Test audio element removed from DOM')
        }
      }, 3000)
      
      setDebugInfo('DOM insertion test completed - check console for results')
    } catch (error) {
      console.error('DOM insertion test failed:', error)
      setDebugInfo(`DOM test error: ${error}`)
    }
  }

  const getCurrentTrackName = () => {
    switch (currentTrack) {
      case 'input':
        return audioFile?.name || 'No input file'
      case 'ir':
        return impulseResponse?.name || 'No impulse response'
      case 'output':
        return outputFile || 'No output file'
      default:
        return 'No file selected'
    }
  }

  const getCurrentTrackPath = () => {
    switch (currentTrack) {
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
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Audio Visualizer
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setVisualizationType('waveform')}
            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
              visualizationType === 'waveform'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
          </button>
          <button
            onClick={() => setVisualizationType('spectrum')}
            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
              visualizationType === 'spectrum'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Current Track Info */}
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700">Current Track</p>
          <p className="text-lg font-semibold text-primary-600">{currentTrack.toUpperCase()}</p>
          <p className="text-xs text-gray-500 truncate">{getCurrentTrackName()}</p>
          <p className="text-xs text-gray-400 truncate">{getCurrentTrackPath()}</p>
          <div className="mt-2 flex justify-center space-x-2">
            {isPlaying && (
              <div className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                Playing
              </div>
            )}
            {isConnected && (
              <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
                Connected
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-500 mt-1">
              Try playing the audio first, then the visualizer will connect automatically
            </p>
          </div>
        )}

        {/* Test Button */}
        <div className="text-center">
          <button
            onClick={testVisualization}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm mr-2"
          >
            Test Visualization
          </button>
          <button
            onClick={() => {
              setError(null)
              setIsConnected(false)
              setDebugInfo('Manually searching for audio elements...')
              // Trigger the effect again
              const event = new Event('manual-refresh')
              window.dispatchEvent(event)
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Refresh Connection
          </button>
          <button
            onClick={testDOMInsertion}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Test DOM Insertion
          </button>
          <p className="text-xs text-gray-500 mt-1">
            Test: Verify audio context | Refresh: Reconnect to audio elements
          </p>
        </div>

        {/* Visualization Canvas */}
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={200}
            className="w-full h-48 bg-gray-900 rounded-lg border border-gray-200"
          />
          <div className="absolute top-2 left-2">
            <span className="text-xs text-gray-400 bg-black bg-opacity-50 px-2 py-1 rounded">
              {visualizationType === 'waveform' ? 'Waveform' : 'Spectrum'}
            </span>
          </div>
          {!isConnected && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Waiting for audio connection...</p>
                <p className="text-xs">Play audio to see visualization</p>
              </div>
            </div>
          )}
        </div>

        {/* Visualization Info */}
        <div className="text-center text-xs text-gray-500">
          {visualizationType === 'waveform' 
            ? 'Real-time waveform display of the audio signal'
            : 'Real-time frequency spectrum analysis'
          }
        </div>

        {/* Debug Info */}
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Debug Info</summary>
          <div className="mt-2 space-y-1">
            <p>Track: {currentTrack}</p>
            <p>Playing: {isPlaying ? 'Yes' : 'No'}</p>
            <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
            <p>Path: {getCurrentTrackPath()}</p>
            <p>Audio Context State: {(window as any).__audioContext?.state || 'Not created'}</p>
            <p>Audio Elements: {document.querySelectorAll('audio').length}</p>
            <p>Status: {debugInfo}</p>
          </div>
        </details>
      </div>
    </div>
  )
}

export default AudioVisualizer 