const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectAudioFile: () => ipcRenderer.invoke('select-audio-file'),
  selectImpulseResponse: () => ipcRenderer.invoke('select-impulse-response'),
  saveOutputFile: () => ipcRenderer.invoke('save-output-file'),
  
  // Audio processing functions (to be implemented with WebAssembly)
  processAudio: (inputPath, irPath, outputPath, settings) => 
    ipcRenderer.invoke('process-audio', inputPath, irPath, outputPath, settings),
  
  // Progress updates
  onProgressUpdate: (callback) => {
    ipcRenderer.on('progress-update', callback)
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel)
  }
}) 