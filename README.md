# Audio Convolution Studio

A modern, professional audio convolution application with real-time preview, dynamic impulse response library, and an intuitive React-based user interface. This application allows you to apply impulse responses to audio files with advanced mixing controls and visual feedback.

## ✨ Features

### 🎵 **Audio Processing**
- **FFT-based Convolution**: High-performance audio convolution using Fast Fourier Transform
- **Stereo Support**: Full stereo audio processing with independent left/right channel handling
- **Multiple Formats**: Support for WAV, MP3, FLAC, and AIFF files
- **High Quality**: 24-bit processing with automatic 16-bit conversion for browser compatibility
- **Real-time Processing**: Fast C++ backend with Node.js API integration

### 🎛️ **Mix Controls**
- **Dry/Wet Mix**: Blend between original and processed audio (0-100%)
- **Gain Controls**: Input, output, and impulse response gain adjustment (-20dB to +20dB)
- **Frequency Filters**: High-pass and low-pass filters for tonal shaping
- **Stereo Width**: Adjust stereo field width (0-200%)
- **Normalization**: Automatic peak normalization option

### 📁 **File Management**
- **Drag & Drop**: Easy file selection with drag and drop support
- **Dynamic Impulse Response Library**: Automatically scans and displays all available impulse responses
- **Category Filtering**: Filter impulse responses by location/space type
- **Auto-naming**: Automatic output file naming with timestamps
- **File Browser**: Intuitive file selection interface

### 🎧 **Preview System** ✅ **WORKING**
- **Real-time Preview**: Listen to input, impulse response, and output tracks
- **A/B Comparison**: Toggle between original and processed audio
- **Volume Control**: Independent volume control for each track
- **Playback Controls**: Play, pause, seek, and progress tracking
- **Audio Context Management**: Proper Web Audio API integration with error handling
- **16-bit Conversion**: Automatic conversion for browser compatibility

### 📊 **Visualization**
- **Waveform Display**: Real-time waveform visualization
- **Processing Status**: Real-time processing progress and status
- **File Information**: Detailed file metadata display
- **Audio Visualizer**: Visual representation of audio content

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for modern, responsive styling
- **Lucide React** for beautiful icons
- **Vite** for fast development and building
- **Web Audio API** for real-time audio playback

### Backend
- **Node.js** with Express for API server
- **C++** for high-performance audio processing
- **FFTW3** for Fast Fourier Transform operations
- **libsndfile** for audio file I/O
- **FFmpeg** for audio format conversion
- **Multer** for file upload handling

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- C++ compiler (GCC, Clang, or MSVC)
- CMake 3.15+
- FFmpeg (for audio conversion)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AudioConvolutionProject
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the C++ backend**
   ```bash
   # Run the install script
   chmod +x install.sh
   ./install.sh
   
   # Or manually:
   mkdir build && cd build
   cmake ..
   make -j$(nproc)
   ```

4. **Start the servers**
   ```bash
   # Terminal 1: Start backend server
   node server.js
   
   # Terminal 2: Start frontend development server
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173` (or the port shown in the terminal)

## 📖 Usage

### Basic Workflow

1. **Select Audio File**
   - Click the audio file area or drag and drop a file
   - Supported formats: WAV, MP3, FLAC, AIFF
   - Files are automatically uploaded to the backend

2. **Choose Impulse Response**
   - Browse the dynamic impulse response library
   - Filter by category (Ropery, Dockyard, etc.)
   - All available .wav files are automatically detected
   - Select your desired reverb/space

3. **Adjust Settings**
   - Set dry/wet mix ratio
   - Adjust gain levels
   - Apply frequency filters
   - Configure stereo width
   - Enable/disable normalization

4. **Preview** ✅ **WORKING**
   - Use the preview controls to listen to input, IR, and output
   - Test audio context with the built-in test function
   - Compare different settings in real-time
   - Volume control and playback controls available

5. **Process**
   - Click "Process Audio" to generate the final output
   - Monitor progress in the status panel
   - Files are automatically converted to 16-bit for browser compatibility
   - Download the processed file

### Advanced Features

#### Dynamic Impulse Response Library
The application automatically scans and displays all impulse responses from the "Sonic Palimpsest" library:
- **01 Ropery**: Industrial space with unique acoustic characteristics
- **02 Tarred Yarn Store**: Large open spaces with natural reverb
- **03 Number 3 Covered Slip**: Enclosed spaces with controlled acoustics
- **04 Cavalier**: Ship-based acoustics
- **05 Ocelot**: Submarine acoustics
- **06 Commissioners House**: Architectural acoustics
- **07 Air Raid Shelter**: Underground spaces with distinctive echoes

#### Processing Options
- **Real-time Preview**: Process and preview audio immediately
- **16-bit Conversion**: Automatic conversion for browser compatibility
- **Error Handling**: Comprehensive error handling and user feedback
- **CORS Support**: Proper CORS headers for cross-origin requests

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   Node.js API   │    │   C++ Backend   │
│                 │◄──►│   Server        │◄──►│                 │
│ - File Browser  │    │                 │    │ - FFT Convolution│
│ - Mix Controls  │    │ - File Upload   │    │ - Audio Analysis│
│ - Preview       │    │ - Audio Serving │    │ - File Processing│
│ - Visualization │    │ - CORS Headers  │    │ - FFmpeg Conv.  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure
```
AudioConvolutionProject/
├── src/                    # React frontend source
│   ├── components/         # React components
│   │   ├── AudioFileBrowser.tsx
│   │   ├── ImpulseResponseBrowser.tsx
│   │   ├── MixControls.tsx
│   │   ├── PreviewControls.tsx
│   │   ├── AudioVisualizer.tsx
│   │   └── ProcessingStatus.tsx
│   ├── App.tsx            # Main application
│   └── main.tsx           # Entry point
├── assets/                 # Audio files and impulse responses
│   ├── audio/             # Sample audio files
│   └── impulse-responses/ # Sonic Palimpsest library
├── server.js              # Node.js API server
├── cli_processor.cpp      # C++ audio processing
├── cli_processor          # Compiled C++ executable
├── Outputs/               # Processed audio files
├── uploads/               # Temporary uploaded files
├── package.json           # Node.js dependencies
├── vite.config.ts         # Vite configuration
└── README.md              # This file
```

## 🔧 Development

### Running in Development Mode
```bash
# Terminal 1: Backend server
node server.js

# Terminal 2: Frontend development
npm run dev
```

### Building for Production
```bash
# Build frontend
npm run build

# The backend server can be run directly
node server.js
```

## 🎯 Performance

### Optimization Features
- **FFT Optimization**: Uses FFTW3 for optimal FFT performance
- **Memory Management**: Efficient memory usage for large audio files
- **Parallel Processing**: Multi-threaded convolution for faster processing
- **Browser Compatibility**: Automatic 16-bit conversion for web playback

### Current Performance
- **Processing Speed**: Fast C++ backend with real-time preview
- **Memory Usage**: Optimized for files up to 1GB
- **Quality**: 24-bit precision with 16-bit browser output
- **Preview**: Real-time audio playback with Web Audio API

## 🐛 Troubleshooting

### Common Issues

1. **Audio Context Not Working**
   - Click "Test Audio Context" button
   - Ensure browser supports Web Audio API
   - Check browser console for errors

2. **Files Not Loading**
   - Check server is running on port 3001
   - Verify file paths and permissions
   - Check browser console for CORS errors

3. **Processing Errors**
   - Ensure FFmpeg is installed
   - Check C++ processor is compiled
   - Verify input file formats

### Debug Tools
- **Audio Context Test**: Built-in test for Web Audio API
- **Backend Processing Test**: Test C++ processor integration
- **File Access Test**: Verify file serving and CORS
- **Console Logging**: Comprehensive logging for debugging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Sonic Palimpsest**: Impulse response library by [Creator Name]
- **FFTW3**: Fast Fourier Transform library
- **libsndfile**: Audio file I/O library
- **React & Vite**: Modern web development tools

## Support

For support, please open an issue on GitHub or contact the development team.

---

**Audio Convolution Studio** - Professional audio processing made simple. 