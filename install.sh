#!/bin/bash

# Audio Convolution Studio Installation Script
echo "🎵 Installing Audio Convolution Studio..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install frontend dependencies"
    exit 1
fi

echo "✅ Frontend dependencies installed"

# Check for C++ compiler
if command -v g++ &> /dev/null; then
    COMPILER="g++"
elif command -v clang++ &> /dev/null; then
    COMPILER="clang++"
else
    echo "⚠️  No C++ compiler found. You'll need to install one to build the backend."
    echo "   On Ubuntu/Debian: sudo apt install build-essential"
    echo "   On macOS: Install Xcode Command Line Tools"
    echo "   On Windows: Install Visual Studio Build Tools"
fi

# Check for CMake
if command -v cmake &> /dev/null; then
    echo "✅ CMake $(cmake --version | head -n1) detected"
else
    echo "⚠️  CMake not found. You'll need to install it to build the backend."
    echo "   On Ubuntu/Debian: sudo apt install cmake"
    echo "   On macOS: brew install cmake"
    echo "   On Windows: Download from https://cmake.org/download/"
fi

# Check for required libraries
echo "🔍 Checking for required libraries..."

# Check for FFTW3
if pkg-config --exists fftw3; then
    echo "✅ FFTW3 found"
else
    echo "⚠️  FFTW3 not found. You'll need to install it:"
    echo "   On Ubuntu/Debian: sudo apt install libfftw3-dev"
    echo "   On macOS: brew install fftw"
    echo "   On Windows: Download from http://www.fftw.org/download.html"
fi

# Check for libsndfile
if pkg-config --exists sndfile; then
    echo "✅ libsndfile found"
else
    echo "⚠️  libsndfile not found. You'll need to install it:"
    echo "   On Ubuntu/Debian: sudo apt install libsndfile1-dev"
    echo "   On macOS: brew install libsndfile"
    echo "   On Windows: Download from http://www.mega-nerd.com/libsndfile/"
fi

# Check for SFML
if pkg-config --exists sfml-all; then
    echo "✅ SFML found"
else
    echo "⚠️  SFML not found. You'll need to install it for the original interface:"
    echo "   On Ubuntu/Debian: sudo apt install libsfml-dev"
    echo "   On macOS: brew install sfml"
    echo "   On Windows: Download from https://www.sfml-dev.org/download.php"
fi

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Next steps:"
echo "1. Install any missing dependencies listed above"
echo "2. Build the C++ backend:"
echo "   mkdir build && cd build"
echo "   cmake .."
echo "   make"
echo "3. Start the development server:"
echo "   npm run dev"
echo "4. Open http://localhost:5173 in your browser"
echo ""
echo "For more information, see README.md" 