cmake_minimum_required(VERSION 3.15)
project(AudioConvolutionStudio)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(PkgConfig REQUIRED)

# Find FFTW3
pkg_check_modules(FFTW3 REQUIRED fftw3)

# Find libsndfile
find_library(SNDFILE_LIBRARY NAMES sndfile libsndfile)
find_path(SNDFILE_INCLUDE_DIR NAMES sndfile.h)

if(NOT SNDFILE_LIBRARY OR NOT SNDFILE_INCLUDE_DIR)
    message(FATAL_ERROR "libsndfile not found. Please install libsndfile-dev")
endif()

# Include directories
include_directories(${FFTW3_INCLUDE_DIRS} ${SNDFILE_INCLUDE_DIR})

# Add linker search path for Homebrew libraries
link_directories(/usr/local/lib)

# Create the CLI processor executable
add_executable(cli_processor
    cli_processor.cpp
)

target_link_libraries(cli_processor
    ${FFTW3_LIBRARIES}
    ${SNDFILE_LIBRARY}
)

target_compile_options(cli_processor PRIVATE ${FFTW3_CFLAGS_OTHER})

# Print configuration summary
message(STATUS "Audio Convolution Studio Configuration:")
message(STATUS "  FFTW3: ${FFTW3_LIBRARIES}")
message(STATUS "  libsndfile: ${SNDFILE_LIBRARY}")
message(STATUS "  Build type: ${CMAKE_BUILD_TYPE}") 