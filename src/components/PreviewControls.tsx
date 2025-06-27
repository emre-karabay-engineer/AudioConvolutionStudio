import { useState, useRef, useEffect } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import { AudioFile, ImpulseResponse } from '../App'

interface PreviewControlsProps {
  audioFile: AudioFile | null
  impulseResponse: ImpulseResponse | null
  outputFile: string | null
  currentTrack: 'input' | 'ir' | 'output'
  onPlaybackStateChange: (playing: boolean) => void
  onTrackChange: (track: 'input' | 'ir' | 'output') => void
  setOutputFile: (file: string | null) => void
}

const PreviewControls: React.FC<PreviewControlsProps> = ({ 
  audioFile, 
  impulseResponse, 
  outputFile,
  currentTrack,
  onPlaybackStateChange,
  onTrackChange,
  setOutputFile
}) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false)
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
    }
    return () => {
      // Clean up audio element when component unmounts
      if (audioRef.current && audioRef.current.parentNode) {
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
      audioRef.current = new Audio()
      audioRef.current.crossOrigin = 'anonymous'
      audioRef.current.preload = 'auto'
      audioRef.current.style.display = 'none' // Hide the audio element
      audioRef.current.setAttribute('data-track', currentTrack) // Add track identifier
      
      // Add to DOM so other components can find it
      document.body.appendChild(audioRef.current)
      
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
      audioRef.current = existingAudio
    } else if (audioRef.current) {
      // Update the track identifier if audio element already exists
      audioRef.current.setAttribute('data-track', currentTrack)
    }
  }, [currentTrack])

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
        return impulseResponse
      case 'output':
        return outputFile ? { name: 'Output', path: outputFile } : null
      default:
        return null
    }
  }

  const handlePlay = async () => {
    const currentFile = getCurrentAudioFile()
    if (!currentFile || !audioContextRef.current) {
      return
    }

    try {
      let audioUrl = currentFile.path
      
      // For IR files, use converted version for browser compatibility
      if (currentTrack === 'ir' && impulseResponse) {
        const convertedUrl = `/converted_ir_${impulseResponse.name}`
        audioUrl = convertedUrl
      }
      
      // Validate URL
      if (!audioUrl || audioUrl === 'null' || audioUrl === 'undefined') {
        throw new Error('Invalid URL')
      }

      // Ensure audio element exists and is set up
      if (!audioRef.current) {
        throw new Error('Audio element not available')
      }

      // Set the audio source
      audioRef.current.src = audioUrl
      
      // Set up event listeners
      audioRef.current.onloadedmetadata = () => {
        setDuration(audioRef.current?.duration || 0)
      }
      
      audioRef.current.ontimeupdate = () => {
        setCurrentTime(audioRef.current?.currentTime || 0)
      }
      
      audioRef.current.onended = () => {
        setIsPlaying(false)
        setCurrentTime(0)
        onPlaybackStateChange(false)
      }

      // Wait for audio to load
      await new Promise((resolve, reject) => {
        if (!audioRef.current) return reject('No audio element')
        
        const timeout = setTimeout(() => {
          reject('Audio loading timeout')
        }, 10000)
        
        audioRef.current.oncanplay = () => {
          clearTimeout(timeout)
          resolve(true)
        }
        
        audioRef.current.onerror = () => {
          clearTimeout(timeout)
          reject('Audio loading failed')
        }
        
        audioRef.current.load()
      })

      // Play audio
      if (!audioRef.current) {
        throw new Error('Audio element not available for playback')
      }
      
      await audioRef.current.play()
      setIsPlaying(true)
      onPlaybackStateChange(true)
      
    } catch (error) {
      alert(`Error playing audio: ${error}`)
    }
  }

  const handlePause = () => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
    setIsPlaying(false)
    onPlaybackStateChange(false)
  }

  const handleTrackChange = (track: 'input' | 'ir' | 'output') => {
    onTrackChange(track)
    setIsPlaying(false)
    setCurrentTime(0)
    onPlaybackStateChange(false)
  }

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(event.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Volume2 className="w-5 h-5 mr-2" />
        Preview Controls
      </h3>
      
      <div className="space-y-4">
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