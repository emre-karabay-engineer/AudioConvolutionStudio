import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { AudioFile, ImpulseResponse } from '../App'

interface PreviewControlsProps {
  audioFile: AudioFile | null
  impulseResponse: ImpulseResponse | null
  outputFile: string | null
  onPlaybackStateChange: (playing: boolean) => void
  onTrackChange: (track: 'input' | 'ir' | 'output') => void
  setOutputFile: (file: string | null) => void
}

const PreviewControls: React.FC<PreviewControlsProps> = ({ 
  audioFile, 
  impulseResponse, 
  outputFile,
  onPlaybackStateChange,
  onTrackChange,
  setOutputFile
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<'input' | 'ir' | 'output'>('input')
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [originalCurrentTime, setOriginalCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)

  // Initialize audio context
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      // Store globally for other components to use
      ;(window as any).__audioContext = audioContextRef.current
      console.log('Audio context created:', audioContextRef.current.state)
    }
    return () => {
      // Clean up audio element when component unmounts
      if (audioRef.current && audioRef.current.parentNode) {
        console.log('PreviewControls: Cleaning up audio element on unmount')
        audioRef.current.parentNode.removeChild(audioRef.current)
        audioRef.current = null
      }
      // Don't close the audio context on unmount - let it stay open
      // if (audioContextRef.current) {
      //   audioContextRef.current.close()
      // }
    }
  }, [])

  // Ensure audio element exists and is in DOM
  useEffect(() => {
    // Check if we already have an audio element in the DOM for this track
    const existingAudio = document.querySelector(`audio[data-track="${currentTrack}"]`) as HTMLAudioElement
    
    if (!audioRef.current && !existingAudio) {
      console.log('PreviewControls: Creating new audio element for track:', currentTrack)
      audioRef.current = new Audio()
      audioRef.current.crossOrigin = 'anonymous'
      audioRef.current.preload = 'auto'
      audioRef.current.style.display = 'none' // Hide the audio element
      audioRef.current.setAttribute('data-track', currentTrack) // Add track identifier
      
      // Add to DOM so other components can find it
      document.body.appendChild(audioRef.current)
      console.log('PreviewControls: Audio element added to DOM, total audio elements:', document.querySelectorAll('audio').length)
      
      // Connect to audio context if available
      if (audioContextRef.current) {
        const source = audioContextRef.current.createMediaElementSource(audioRef.current)
        gainNodeRef.current = audioContextRef.current.createGain()
        
        // Create a splitter to allow multiple connections
        const splitter = audioContextRef.current.createChannelSplitter(2)
        
        // Connect audio element -> source -> splitter
        source.connect(splitter)
        
        // Connect splitter to gain node (for playback only)
        splitter.connect(gainNodeRef.current)
        gainNodeRef.current.connect(audioContextRef.current.destination)
        
        // Store the splitter globally so visualizer can access it
        // But DON'T connect it to destination - that's handled by the gain node
        ;(window as any).__audioSplitter = splitter
        
        // Set initial volume
        gainNodeRef.current.gain.value = volume / 100
      }
    } else if (existingAudio && !audioRef.current) {
      // Use existing audio element
      console.log('PreviewControls: Using existing audio element for track:', currentTrack)
      audioRef.current = existingAudio
    } else if (audioRef.current) {
      // Update the track identifier if audio element already exists
      console.log('PreviewControls: Updating existing audio element for track:', currentTrack)
      audioRef.current.setAttribute('data-track', currentTrack)
    }
  }, [currentTrack])

  // Test audio context on user interaction
  const testAudioContext = async () => {
    try {
      console.log('Testing Web Audio API...')
      
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        console.log('Created new audio context:', audioContextRef.current.state)
      }
      
      console.log('Audio context state:', audioContextRef.current.state)
      console.log('Audio context sample rate:', audioContextRef.current.sampleRate)
      
      if (audioContextRef.current.state === 'suspended') {
        console.log('Resuming audio context...')
        await audioContextRef.current.resume()
        console.log('Audio context resumed, new state:', audioContextRef.current.state)
      }
      
      if (audioContextRef.current.state !== 'running') {
        throw new Error(`Audio context not running, state: ${audioContextRef.current.state}`)
      }
      
      console.log('Audio context is ready:', audioContextRef.current.state)
      
      // Create a simple test tone to verify audio is working
      const oscillator = audioContextRef.current.createOscillator()
      const gainNode = audioContextRef.current.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      oscillator.frequency.setValueAtTime(440, audioContextRef.current.currentTime) // A4 note
      gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime) // Higher volume
      
      oscillator.start(audioContextRef.current.currentTime)
      oscillator.stop(audioContextRef.current.currentTime + 1.0) // Play for 1 second
      
      console.log('Test tone started successfully')
      alert('Audio system test successful! You should hear a 1-second tone.')
    } catch (error) {
      console.error('Error testing audio context:', error)
      alert(`Audio system test failed: ${error}`)
    }
  }

  // Call C++ backend for audio processing
  const processAudioWithBackend = async () => {
    if (!audioFile || !impulseResponse) {
      alert('Please select both an audio file and an impulse response')
      return
    }

    try {
      console.log('Processing audio with backend...')
      
      const formData = new FormData()
      
      // Fetch the audio file from its path
      const audioResponse = await fetch(audioFile.path)
      const audioBlob = await audioResponse.blob()
      formData.append('audioFile', audioBlob, audioFile.name)
      
      // Fetch the impulse response file from its path
      const irResponse = await fetch(impulseResponse.path)
      const irBlob = await irResponse.blob()
      formData.append('impulseResponse', irBlob, impulseResponse.name)
      
      // Add audio settings
      const settings = {
        dryWet: 50,
        inputGain: 0,
        outputGain: 0,
        normalize: true
      }
      formData.append('settings', JSON.stringify(settings))
      
      const response = await fetch('http://localhost:3001/process-audio', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Processing result:', result)
      
      if (result.success) {
        setOutputFile(result.outputFile)
        alert('Audio processing completed successfully!')
      } else {
        throw new Error(result.error || 'Processing failed')
      }
    } catch (error) {
      console.error('Error processing audio:', error)
      alert(`Error processing audio: ${error}`)
    }
  }

  // Update volume when it changes
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume / 100
    }
  }, [volume])

  // Notify parent of playback state changes
  useEffect(() => {
    onPlaybackStateChange(isPlaying)
  }, [isPlaying, onPlaybackStateChange])

  // Notify parent of track changes
  useEffect(() => {
    onTrackChange(currentTrack)
  }, [currentTrack, onTrackChange])

  const getCurrentAudioFile = () => {
    switch (currentTrack) {
      case 'input':
        return audioFile
      case 'ir':
        return impulseResponse ? { ...impulseResponse, path: impulseResponse.path } : null
      case 'output':
        return outputFile ? { name: outputFile, path: outputFile } : null
      default:
        return null
    }
  }

  const handlePlay = async () => {
    const currentFile = getCurrentAudioFile()
    if (!currentFile || !audioContextRef.current) {
      console.error('No current file or audio context:', { currentFile, audioContext: audioContextRef.current })
      return
    }

    try {
      console.log('Attempting to play:', currentFile.path)
      
      // Resume audio context if suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      // Set audio source with proper URL
      let audioUrl = currentFile.path
      
      // If it's a relative path, make it absolute to the backend server
      if (audioUrl.startsWith('/')) {
        audioUrl = `http://localhost:3001${audioUrl}`
      }
      
      // For impulse responses, try to use converted 16-bit version
      if (currentTrack === 'ir' && audioUrl.includes('/impulse-responses/')) {
        const irPath = audioUrl.replace('http://localhost:3001/impulse-responses/', '')
        const convertedUrl = `http://localhost:3001/convert-ir?path=${encodeURIComponent(irPath)}`
        console.log('Using converted IR:', convertedUrl)
        audioUrl = convertedUrl
      }
      
      // Ensure the URL is properly encoded
      try {
        audioUrl = new URL(audioUrl).href
      } catch (error) {
        console.error('Invalid URL:', audioUrl)
        throw new Error(`Invalid audio URL: ${audioUrl}`)
      }
      
      console.log('Loading audio from URL:', audioUrl)
      console.log('Current file:', currentFile)
      
      if (!audioRef.current) {
        throw new Error('Audio element not available')
      }
      
      audioRef.current.src = audioUrl
      
      // Set up event listeners
      audioRef.current.onloadedmetadata = () => {
        console.log('Audio metadata loaded:', audioRef.current?.duration)
        setDuration(audioRef.current?.duration || 0)
      }
      
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      }
      
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }

      // Add error handling
      audioRef.current.onerror = (e) => {
        console.error('Audio error:', e)
        console.error('Audio error details:', audioRef.current?.error)
        const errorMsg = audioRef.current?.error?.message || 'Unknown error'
        console.error('Audio URL that failed:', audioUrl)
        alert(`Audio error: ${errorMsg}. This might be due to CORS restrictions or file format issues.`)
        setIsPlaying(false)
      }

      // Wait for audio to load before playing
      await new Promise((resolve, reject) => {
        if (!audioRef.current) return reject('No audio element')
        
        const timeout = setTimeout(() => {
          console.error('Audio loading timeout for URL:', audioUrl)
          reject('Audio loading timeout - the file might be too large or the server might be slow')
        }, 15000) // Increased timeout to 15 seconds
        
        audioRef.current.oncanplay = () => {
          clearTimeout(timeout)
          console.log('Audio can play, duration:', audioRef.current?.duration)
          resolve(true)
        }
        
        audioRef.current.onerror = (e) => {
          clearTimeout(timeout)
          const error = audioRef.current?.error
          console.error('Audio loading failed:', error)
          reject(`Audio loading failed: ${error?.message || 'Unknown error'} for URL: ${audioUrl}`)
        }
        
        // Also try to load the audio
        audioRef.current.load()
      })

      // Play audio
      if (!audioRef.current) {
        throw new Error('Audio element not available for playback')
      }
      
      await audioRef.current.play()
      setIsPlaying(true)
      console.log('Audio playback started successfully')
    } catch (error) {
      console.error('Error playing audio:', error)
      console.error('Current file:', currentFile)
      console.error('Audio element:', audioRef.current)
      
      let errorMessage = 'Error playing audio. '
      if (error instanceof Error) {
        errorMessage += error.message
      } else if (typeof error === 'string') {
        errorMessage += error
      } else {
        errorMessage += 'Please check the file format and try again.'
      }
      
      // Add helpful debugging info
      if (errorMessage.includes('CORS')) {
        errorMessage += '\n\nThis might be due to CORS restrictions. Try using the sample files instead.'
      }
      
      if (errorMessage.includes('timeout')) {
        errorMessage += '\n\nThe file might be too large or the server might be slow. Try a smaller file.'
      }
      
      alert(errorMessage)
      setIsPlaying(false)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTrackChange = (track: 'input' | 'ir' | 'output') => {
    setCurrentTrack(track)
    if (isPlaying) {
      handlePause()
    }
    setCurrentTime(0)
  }

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(event.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
      setCurrentTime(newTime)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Play processed audio
  const playProcessedAudio = async () => {
    if (!outputFile) {
      alert('No processed audio available')
      return
    }

    try {
      console.log('Playing processed audio:', outputFile)
      
      // Ensure audio context is running
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      // Use the converted 16-bit version if available, otherwise use the original processed file
      const audioUrl = outputFile.replace('/Outputs/', '/Outputs/converted_')
      
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      const source = audioContextRef.current.createBufferSource()
      const gainNode = audioContextRef.current.createGain()
      
      source.buffer = audioBuffer
      source.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      gainNode.gain.setValueAtTime(volume / 100, audioContextRef.current.currentTime)
      
      source.start(0)
      setIsPlaying(true)
      setCurrentTime(0)
      
      // Track start time for progress calculation
      const startTime = audioContextRef.current.currentTime
      
      // Update progress
      const updateProgress = () => {
        if (audioContextRef.current && source.playbackRate.value > 0) {
          const elapsed = audioContextRef.current.currentTime - startTime
          const progress = (elapsed / audioBuffer.duration) * 100
          setCurrentTime(Math.min(progress, 100))
        }
        if (isPlaying) {
          requestAnimationFrame(updateProgress)
        }
      }
      updateProgress()
      
      source.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
      }
      
      console.log('Processed audio playback started successfully')
    } catch (error) {
      console.error('Error playing processed audio:', error)
      alert(`Error playing audio: ${error}`)
    }
  }

  // Play original audio
  const playOriginalAudio = async () => {
    if (!audioFile) {
      alert('No original audio available')
      return
    }

    try {
      console.log('Playing original audio:', audioFile.path)
      
      // Ensure audio context is running
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      // Use the converted 16-bit version
      const audioUrl = audioFile.path.replace('/assets/audio/', '/Outputs/converted_')
      
      const response = await fetch(audioUrl)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer)
      
      const source = audioContextRef.current.createBufferSource()
      const gainNode = audioContextRef.current.createGain()
      
      source.buffer = audioBuffer
      source.connect(gainNode)
      gainNode.connect(audioContextRef.current.destination)
      
      gainNode.gain.setValueAtTime(volume / 100, audioContextRef.current.currentTime)
      
      source.start(0)
      setIsPlayingOriginal(true)
      setOriginalCurrentTime(0)
      
      // Track start time for progress calculation
      const startTime = audioContextRef.current.currentTime
      
      // Update progress
      const updateProgress = () => {
        if (audioContextRef.current && source.playbackRate.value > 0) {
          const elapsed = audioContextRef.current.currentTime - startTime
          const progress = (elapsed / audioBuffer.duration) * 100
          setOriginalCurrentTime(Math.min(progress, 100))
        }
        if (isPlayingOriginal) {
          requestAnimationFrame(updateProgress)
        }
      }
      updateProgress()
      
      source.onended = () => {
        setIsPlayingOriginal(false)
        setOriginalCurrentTime(0)
      }
      
      console.log('Original audio playback started successfully')
    } catch (error) {
      console.error('Error playing original audio:', error)
      alert(`Error playing audio: ${error}`)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Volume2 className="w-5 h-5 mr-2" />
        Preview Controls
      </h3>
      
      <div className="space-y-4">
        {/* Test Buttons */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Audio System Tests</h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={testAudioContext}
              className="btn-secondary text-sm py-2"
            >
              Test Audio Context
            </button>
            <button
              onClick={processAudioWithBackend}
              className="btn-secondary text-sm py-2"
            >
              Test Backend Processing
            </button>
          </div>
        </div>

        {/* Quick Preview Buttons */}
        {outputFile && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Quick Preview</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={playProcessedAudio}
                className="btn-primary text-sm py-2"
              >
                Play Processed Audio
              </button>
              {audioFile && (
                <button
                  onClick={playOriginalAudio}
                  className="btn-secondary text-sm py-2"
                >
                  Play Original Audio
                </button>
              )}
            </div>
          </div>
        )}

        {/* Track Selection */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleTrackChange('input')}
            disabled={!audioFile}
            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
              currentTrack === 'input'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            Input
          </button>
          <button
            onClick={() => handleTrackChange('ir')}
            disabled={!impulseResponse}
            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
              currentTrack === 'ir'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            IR
          </button>
          <button
            onClick={() => handleTrackChange('output')}
            disabled={!outputFile}
            className={`p-2 rounded-lg text-sm font-medium transition-colors ${
              currentTrack === 'output'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            Output
          </button>
        </div>

        {/* Progress Bar */}
        {duration > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={handleSeek}
              className="w-full"
            />
          </div>
        )}

        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.max(0, currentTime - 10)
              }
            }}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <SkipBack className="w-5 h-5" />
          </button>
          
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!getCurrentAudioFile()}
            className="p-3 rounded-full bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = Math.min(duration, currentTime + 10)
              }
            }}
            className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value))}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-8">{volume}%</span>
        </div>

        {/* Current Track Info */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Currently selected: {currentTrack}
          </p>
          {currentTrack === 'input' && audioFile && (
            <p className="text-xs text-gray-500">{audioFile.name}</p>
          )}
          {currentTrack === 'ir' && impulseResponse && (
            <p className="text-xs text-gray-500">{impulseResponse.name}</p>
          )}
          {currentTrack === 'output' && outputFile && (
            <p className="text-xs text-gray-500">{outputFile}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PreviewControls 