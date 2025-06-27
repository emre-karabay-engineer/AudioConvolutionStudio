import express from 'express'
import multer from 'multer'
import cors from 'cors'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const execAsync = promisify(exec)

const app = express()
const port = 3001

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176', 'http://localhost:5177', 'http://localhost:5178', 'http://localhost:5179', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}))
app.use(express.json())

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname)
  }
})

const upload = multer({ storage: storage })

// API endpoints (must come before static file handlers)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Audio processing server is running' })
})

// Get available impulse responses
app.get('/impulse-responses', (req, res) => {
  try {
    const irBasePath = path.join(__dirname, 'assets', 'impulse-responses', 'Sonic Palimpsest -Impulse Response Library')
    const impulseResponses = []
    
    if (!fs.existsSync(irBasePath)) {
      return res.json([])
    }
    
    // Scan all subdirectories
    const categories = fs.readdirSync(irBasePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
    
    categories.forEach(category => {
      const categoryPath = path.join(irBasePath, category)
      const files = fs.readdirSync(categoryPath)
        .filter(file => file.endsWith('.wav'))
        .map(file => ({
          name: file.replace('.wav', ''),
          path: `/impulse-responses/Sonic Palimpsest -Impulse Response Library/${category}/${file}`,
          category: category
        }))
      
      impulseResponses.push(...files)
    })
    
    console.log(`Found ${impulseResponses.length} impulse responses in ${categories.length} categories`)
    res.json(impulseResponses)
    
  } catch (error) {
    console.error('Error scanning impulse responses:', error)
    res.status(500).json({ error: 'Failed to scan impulse responses', details: error.message })
  }
})

// Serve static files from assets directory with proper headers
app.use('/assets', express.static('assets', {
  setHeaders: (res, path) => {
    if (path.endsWith('.wav') || path.endsWith('.mp3') || path.endsWith('.flac')) {
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD')
      res.setHeader('Access-Control-Allow-Headers', 'Range')
    }
  },
  fallthrough: false
}))

app.use('/Outputs', express.static('Outputs', {
  setHeaders: (res, path) => {
    if (path.endsWith('.wav') || path.endsWith('.mp3') || path.endsWith('.flac')) {
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD')
      res.setHeader('Access-Control-Allow-Headers', 'Range')
    }
  },
  fallthrough: false
}))

// Serve impulse responses with proper headers
app.use('/impulse-responses', express.static('assets/impulse-responses', {
  setHeaders: (res, path) => {
    if (path.endsWith('.wav') || path.endsWith('.mp3') || path.endsWith('.flac')) {
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD')
      res.setHeader('Access-Control-Allow-Headers', 'Range')
    }
  },
  fallthrough: false
}))

// Add error handling for static file serving
app.use('/assets', (err, req, res, next) => {
  console.error('Error serving asset file:', req.url, err.message)
  res.status(404).json({ error: 'Asset file not found', path: req.url })
})

app.use('/Outputs', (err, req, res, next) => {
  console.error('Error serving output file:', req.url, err.message)
  res.status(404).json({ error: 'Output file not found', path: req.url })
})

app.use('/impulse-responses', (err, req, res, next) => {
  console.error('Error serving impulse response file:', req.url, err.message)
  res.status(404).json({ error: 'Impulse response file not found', path: req.url })
})

// Test audio file endpoint
app.get('/test-audio/:filename', (req, res) => {
  const filename = req.params.filename
  const filePath = path.join(__dirname, 'Outputs', filename)
  
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.sendFile(filePath)
  } else {
    res.status(404).json({ error: 'Audio file not found', filename })
  }
})

// List available output files
app.get('/output-files', (req, res) => {
  try {
    const outputDir = path.join(__dirname, 'Outputs')
    if (!fs.existsSync(outputDir)) {
      return res.json([])
    }
    
    const files = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.wav'))
      .map(file => ({
        name: file,
        path: `/Outputs/${file}`,
        size: fs.statSync(path.join(outputDir, file)).size
      }))
    
    res.json(files)
  } catch (error) {
    console.error('Error listing output files:', error)
    res.status(500).json({ error: 'Failed to list output files' })
  }
})

// Test file accessibility
app.get('/test-file', (req, res) => {
  const { type, filename } = req.query
  
  if (!type || !filename) {
    return res.status(400).json({ error: 'Missing type or filename parameter' })
  }
  
  try {
    let filePath
    if (type === 'audio') {
      filePath = path.join(__dirname, 'assets', 'audio', filename)
    } else if (type === 'ir') {
      // Handle the complex path for impulse responses
      const decodedFilename = decodeURIComponent(filename)
      filePath = path.join(__dirname, 'assets', 'impulse-responses', decodedFilename)
    } else {
      return res.status(400).json({ error: 'Invalid file type' })
    }
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath)
      res.json({
        exists: true,
        path: filePath,
        size: stats.size,
        url: type === 'audio' ? `/assets/audio/${filename}` : `/assets/impulse-responses/${filename}`
      })
    } else {
      res.json({
        exists: false,
        path: filePath,
        error: 'File not found'
      })
    }
  } catch (error) {
    console.error('Error testing file:', error)
    res.status(500).json({ error: 'Failed to test file', details: error.message })
  }
})

// Convert audio file to 16-bit for browser compatibility
app.get('/convert-audio/:filename', async (req, res) => {
  const filename = req.params.filename
  
  try {
    const inputPath = path.join(__dirname, 'assets', 'audio', filename)
    const outputPath = path.join(__dirname, 'Outputs', `converted_${filename}`)
    
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Audio file not found' })
    }
    
    // Check if converted file already exists
    if (fs.existsSync(outputPath)) {
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.sendFile(outputPath)
    }
    
    // Convert to 16-bit PCM
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -acodec pcm_s16le "${outputPath}"`
    console.log('Converting audio for browser:', ffmpegCmd)
    await execAsync(ffmpegCmd)
    
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.sendFile(outputPath)
    
  } catch (error) {
    console.error('Error converting audio:', error)
    res.status(500).json({ error: 'Failed to convert audio', details: error.message })
  }
})

// Convert impulse response to 16-bit for browser compatibility
app.get('/convert-ir', async (req, res) => {
  const { path: filePath } = req.query
  
  if (!filePath) {
    return res.status(400).json({ error: 'Missing path parameter' })
  }
  
  try {
    const inputPath = path.join(__dirname, 'assets', 'impulse-responses', filePath)
    const outputPath = path.join(__dirname, 'Outputs', `converted_ir_${path.basename(filePath)}`)
    
    if (!fs.existsSync(inputPath)) {
      return res.status(404).json({ error: 'Impulse response file not found' })
    }
    
    // Check if converted file already exists
    if (fs.existsSync(outputPath)) {
      res.setHeader('Content-Type', 'audio/wav')
      res.setHeader('Access-Control-Allow-Origin', '*')
      return res.sendFile(outputPath)
    }
    
    // Convert to 16-bit PCM
    const ffmpegCmd = `ffmpeg -y -i "${inputPath}" -acodec pcm_s16le "${outputPath}"`
    console.log('Converting impulse response for browser:', ffmpegCmd)
    await execAsync(ffmpegCmd)
    
    res.setHeader('Content-Type', 'audio/wav')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.sendFile(outputPath)
    
  } catch (error) {
    console.error('Error converting impulse response:', error)
    res.status(500).json({ error: 'Failed to convert impulse response', details: error.message })
  }
})

// Audio processing endpoint
app.post('/process-audio', upload.fields([
  { name: 'audioFile', maxCount: 1 },
  { name: 'impulseResponse', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('Received audio processing request')
    
    const { audioFile, impulseResponse } = req.files
    const settings = JSON.parse(req.body.settings || '{}')
    
    if (!audioFile || !impulseResponse) {
      return res.status(400).json({ error: 'Both audio file and impulse response are required' })
    }
    
    const audioFilePath = audioFile[0].path
    const impulseResponsePath = impulseResponse[0].path
    const outputFileName = `output_${Date.now()}.wav`
    const outputPath = path.join('Outputs', outputFileName)
    const outputConverted = path.join('Outputs', `converted_${outputFileName}`)
    
    console.log('Processing files:')
    console.log('Audio:', audioFilePath)
    console.log('IR:', impulseResponsePath)
    console.log('Output:', outputPath)
    
    // Call the C++ executable
    const settingsJson = JSON.stringify(settings)
    const command = `./cli_processor "${audioFilePath}" "${impulseResponsePath}" "${outputPath}" '${settingsJson}'`
    
    console.log('Executing command:', command)
    console.log('Settings:', settings)
    
    const { stdout, stderr } = await execAsync(command)
    
    if (stderr) {
      console.error('C++ process stderr:', stderr)
    }
    
    console.log('C++ process stdout:', stdout)
    
    // Convert output to 16-bit PCM WAV using ffmpeg
    const ffmpegCmd = `ffmpeg -y -i "${outputPath}" -acodec pcm_s16le "${outputConverted}"`
    console.log('Converting output with ffmpeg:', ffmpegCmd)
    await execAsync(ffmpegCmd)
    
    // Return the output file path (converted)
    res.json({
      success: true,
      outputFile: `/Outputs/converted_${outputFileName}`,
      message: 'Audio processing and conversion completed successfully'
    })
    
  } catch (error) {
    console.error('Error processing audio:', error)
    res.status(500).json({
      error: 'Audio processing failed',
      details: error.message
    })
  }
})

// Get available audio files
app.get('/audio-files', (req, res) => {
  // This would scan the assets/audio directory
  const audioFiles = [
    { name: 'chucr.wav', path: '/assets/audio/chucr.wav' },
    { name: 'outfun.wav', path: '/assets/audio/outfun.wav' },
    { name: 'in.wav', path: '/assets/audio/in.wav' },
    { name: 'oof.wav', path: '/assets/audio/oof.wav' },
    { name: 'uc.wav', path: '/assets/audio/uc.wav' },
    { name: 'ir.wav', path: '/assets/audio/ir.wav' },
    { name: 'imp.wav', path: '/assets/audio/imp.wav' }
  ]
  res.json(audioFiles)
})

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads')
}

if (!fs.existsSync('Outputs')) {
  fs.mkdirSync('Outputs')
}

app.listen(port, () => {
  console.log(`Audio processing server running on port ${port}`)
  console.log(`Health check: http://localhost:${port}/health`)
}) 