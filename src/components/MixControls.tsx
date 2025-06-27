import { useState } from 'react'
import { Play, Zap, Sliders, Volume2 } from 'lucide-react'

interface AudioSettings {
  dryWet: number
  inputGain: number
  outputGain: number
  impulseGain: number
  lowPassFreq: number
  highPassFreq: number
  stereoWidth: number
  normalize: boolean
}

interface MixControlsProps {
  onProcess: () => void
  isProcessing: boolean
  settings: AudioSettings
  onSettingsChange: (settings: AudioSettings) => void
}

const MixControls: React.FC<MixControlsProps> = ({ onProcess, isProcessing, settings, onSettingsChange }) => {
  const updateSetting = (key: keyof AudioSettings, value: number | boolean) => {
    const newSettings = { ...settings, [key]: value }
    onSettingsChange(newSettings)
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Zap className="w-5 h-5 mr-2" />
        Processing Controls
      </h3>
      
      <div className="space-y-6">
        {/* Process Button */}
        <div className="text-center">
          <button
            onClick={onProcess}
            disabled={isProcessing}
            className="btn-primary w-full py-3 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                <Play className="w-5 h-5" />
                <span>Process Audio</span>
              </div>
            )}
          </button>
        </div>

        {/* Audio Adjustments */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 flex items-center">
            <Sliders className="w-4 h-4 mr-1" />
            Audio Adjustments
          </h4>
          
          {/* Dry/Wet Mix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dry/Wet Mix
            </label>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 w-8">Dry</span>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.dryWet}
                onChange={(e) => updateSetting('dryWet', parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-gray-500 w-8">Wet</span>
            </div>
            <div className="text-center text-sm text-gray-600 mt-1">
              {settings.dryWet}%
            </div>
          </div>

          {/* Gain Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Input Gain
              </label>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={settings.inputGain}
                  onChange={(e) => updateSetting('inputGain', parseInt(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                {settings.inputGain}dB
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Gain
              </label>
              <div className="flex items-center space-x-2">
                <Volume2 className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="-20"
                  max="20"
                  value={settings.outputGain}
                  onChange={(e) => updateSetting('outputGain', parseInt(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="text-center text-sm text-gray-600 mt-1">
                {settings.outputGain}dB
              </div>
            </div>
          </div>

          {/* Impulse Response Gain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Impulse Response Gain
            </label>
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-gray-400" />
              <input
                type="range"
                min="-20"
                max="20"
                value={settings.impulseGain}
                onChange={(e) => updateSetting('impulseGain', parseInt(e.target.value))}
                className="flex-1"
              />
            </div>
            <div className="text-center text-sm text-gray-600 mt-1">
              {settings.impulseGain}dB
            </div>
          </div>

          {/* Frequency Filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                High Pass Filter
              </label>
              <input
                type="range"
                min="20"
                max="2000"
                value={settings.highPassFreq}
                onChange={(e) => updateSetting('highPassFreq', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">
                {settings.highPassFreq}Hz
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Pass Filter
              </label>
              <input
                type="range"
                min="2000"
                max="20000"
                value={settings.lowPassFreq}
                onChange={(e) => updateSetting('lowPassFreq', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="text-center text-sm text-gray-600 mt-1">
                {settings.lowPassFreq}Hz
              </div>
            </div>
          </div>

          {/* Stereo Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stereo Width
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={settings.stereoWidth}
              onChange={(e) => updateSetting('stereoWidth', parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-600 mt-1">
              {settings.stereoWidth}%
            </div>
          </div>

          {/* Normalize */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="normalize"
              checked={settings.normalize}
              onChange={(e) => updateSetting('normalize', e.target.checked)}
              className="rounded"
            />
            <label htmlFor="normalize" className="text-sm font-medium text-gray-700">
              Normalize Output
            </label>
          </div>
        </div>

        {/* Processing Info */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-blue-800 mb-2">Processing Information</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Convolves input audio with selected impulse response</li>
            <li>• Uses FFTW3 for efficient frequency domain processing</li>
            <li>• Supports various audio formats (WAV, FLAC, AIFF)</li>
            <li>• Real-time preview available after processing</li>
          </ul>
        </div>

        {/* Quick Settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Quick Settings</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Output Format</label>
              <select className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option value="wav">WAV (24-bit)</option>
                <option value="flac">FLAC (Lossless)</option>
                <option value="aiff">AIFF (24-bit)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Sample Rate</label>
              <select className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white">
                <option value="44100">44.1 kHz</option>
                <option value="48000">48 kHz</option>
                <option value="96000">96 kHz</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MixControls 