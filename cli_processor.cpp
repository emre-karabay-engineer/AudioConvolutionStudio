#include <sndfile.hh>
#include <vector>
#include <string>
#include <complex>
#include <fftw3.h>
#include <iostream>

using namespace std;

// Function to pad zeros at the end of input signals
void pad_zeros(std::vector<double>& x, int n) {
    while(x.size() < n) {
        x.push_back(0);
    }
}

// Function to perform Fast Fourier Transform
void fft(std::vector<std::complex<double>>& x) {
    fftw_complex *in, *out;
    fftw_plan p;

    in = (fftw_complex*) fftw_malloc(sizeof(fftw_complex) * x.size());
    out = (fftw_complex*) fftw_malloc(sizeof(fftw_complex) * x.size());

    for(size_t i = 0; i < x.size(); ++i) {
        in[i][0] = x[i].real();
        in[i][1] = x[i].imag();
    }

    p = fftw_plan_dft_1d(x.size(), in, out, FFTW_FORWARD, FFTW_ESTIMATE);
    fftw_execute(p);

    for(size_t i = 0; i < x.size(); ++i) {
        x[i] = {out[i][0], out[i][1]};
    }

    fftw_destroy_plan(p);
    fftw_free(in);
    fftw_free(out);
}

// Function to perform Inverse Fast Fourier Transform
void ifft(std::vector<std::complex<double>>& x) {
    fftw_complex *in, *out;
    fftw_plan p;

    in = (fftw_complex*) fftw_malloc(sizeof(fftw_complex) * x.size());
    out = (fftw_complex*) fftw_malloc(sizeof(fftw_complex) * x.size());

    for(size_t i = 0; i < x.size(); ++i) {
        in[i][0] = x[i].real();
        in[i][1] = x[i].imag();
    }

    p = fftw_plan_dft_1d(x.size(), in, out, FFTW_BACKWARD, FFTW_ESTIMATE);
    fftw_execute(p);

    for(size_t i = 0; i < x.size(); ++i) {
        x[i] = {out[i][0] / x.size(), out[i][1] / x.size()};
    }

    fftw_destroy_plan(p);
    fftw_free(in);
    fftw_free(out);
}

// Function to perform convolution using FFT
std::vector<double> convolve_fft(std::vector<double> x, std::vector<double> h) {
    int n = x.size() + h.size() - 1;
    pad_zeros(x, n);
    pad_zeros(h, n);

    std::vector<std::complex<double>> X(x.begin(), x.end());
    std::vector<std::complex<double>> H(h.begin(), h.end());

    fft(X);
    fft(H);

    std::vector<std::complex<double>> Y(n);
    for(int i = 0; i < n; ++i) {
        Y[i] = X[i] * H[i];
    }

    ifft(Y);

    std::vector<double> y(n);
    for(int i = 0; i < n; ++i) {
        y[i] = Y[i].real();
    }

    return y;
}

// Function to apply low-pass filter using FFT
std::vector<double> apply_lowpass_filter(std::vector<double>& signal, double cutoffFreq, int sampleRate) {
    int n = signal.size();
    std::vector<std::complex<double>> X(signal.begin(), signal.end());
    
    fft(X);
    
    // Create frequency domain filter
    for (int i = 0; i < n; ++i) {
        double freq = (double)i * sampleRate / n;
        if (freq > cutoffFreq) {
            X[i] = 0.0;
        }
    }
    
    ifft(X);
    
    std::vector<double> filtered(n);
    for (int i = 0; i < n; ++i) {
        filtered[i] = X[i].real();
    }
    
    return filtered;
}

// Function to apply high-pass filter using FFT
std::vector<double> apply_highpass_filter(std::vector<double>& signal, double cutoffFreq, int sampleRate) {
    int n = signal.size();
    std::vector<std::complex<double>> X(signal.begin(), signal.end());
    
    fft(X);
    
    // Create frequency domain filter
    for (int i = 0; i < n; ++i) {
        double freq = (double)i * sampleRate / n;
        if (freq < cutoffFreq) {
            X[i] = 0.0;
        }
    }
    
    ifft(X);
    
    std::vector<double> filtered(n);
    for (int i = 0; i < n; ++i) {
        filtered[i] = X[i].real();
    }
    
    return filtered;
}

// Function to apply stereo width processing
void apply_stereo_width(std::vector<double>& left, std::vector<double>& right, double width) {
    // Width should be between 0% and 200%
    // 100% = normal stereo
    // 0% = mono (L+R)
    // 200% = maximum width (L-R)
    
    double widthRatio = width / 100.0;
    
    for (size_t i = 0; i < left.size() && i < right.size(); ++i) {
        double mid = (left[i] + right[i]) / 2.0;
        double side = (left[i] - right[i]) / 2.0;
        
        // Apply width to the side signal
        side *= widthRatio;
        
        // Reconstruct left and right
        left[i] = mid + side;
        right[i] = mid - side;
    }
}

int main(int argc, char* argv[]) {
    if (argc < 4) {
        std::cerr << "Usage: " << argv[0] << " <input_audio.wav> <impulse_response.wav> <output.wav> [settings_json]" << std::endl;
        std::cerr << "Settings JSON format: {\"dryWet\":50,\"inputGain\":0,\"outputGain\":0,\"impulseGain\":0,\"lowPassFreq\":20000,\"highPassFreq\":20,\"stereoWidth\":100,\"normalize\":true}" << std::endl;
        return 1;
    }

    std::string inputPath = argv[1];
    std::string impulseResponsePath = argv[2];
    std::string outputPath = argv[3];
    
    // Default settings
    double dryWet = 50.0; // 50% wet
    double inputGain = 0.0; // 0dB
    double outputGain = 0.0; // 0dB
    double impulseGain = 0.0; // 0dB
    double lowPassFreq = 20000.0; // 20kHz
    double highPassFreq = 20.0; // 20Hz
    double stereoWidth = 100.0; // 100%
    bool normalize = true;
    
    // Parse settings if provided
    if (argc > 4) {
        std::string settingsJson = argv[4];
        // Simple JSON parsing for our specific format
        // This is a basic implementation - in production you'd want a proper JSON parser
        
        // Extract dryWet
        size_t pos = settingsJson.find("\"dryWet\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 9);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                dryWet = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract inputGain
        pos = settingsJson.find("\"inputGain\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 12);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                inputGain = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract outputGain
        pos = settingsJson.find("\"outputGain\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 13);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                outputGain = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract impulseGain
        pos = settingsJson.find("\"impulseGain\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 14);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                impulseGain = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract lowPassFreq
        pos = settingsJson.find("\"lowPassFreq\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 14);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                lowPassFreq = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract highPassFreq
        pos = settingsJson.find("\"highPassFreq\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 15);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                highPassFreq = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract stereoWidth
        pos = settingsJson.find("\"stereoWidth\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 14);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                stereoWidth = std::stod(settingsJson.substr(start, end - start));
            }
        }
        
        // Extract normalize
        pos = settingsJson.find("\"normalize\":");
        if (pos != std::string::npos) {
            size_t start = settingsJson.find_first_not_of(" \t", pos + 12);
            size_t end = settingsJson.find_first_of(",}", start);
            if (start != std::string::npos && end != std::string::npos) {
                std::string normStr = settingsJson.substr(start, end - start);
                normalize = (normStr == "true");
            }
        }
        
        std::cout << "Using settings: dryWet=" << dryWet << "%, inputGain=" << inputGain << "dB, outputGain=" << outputGain << "dB, impulseGain=" << impulseGain << "dB, lowPassFreq=" << lowPassFreq << "Hz, highPassFreq=" << highPassFreq << "Hz, stereoWidth=" << stereoWidth << "%, normalize=" << (normalize ? "true" : "false") << std::endl;
    }

    try {
        // Open the input files
        SndfileHandle file1 = SndfileHandle(inputPath);
        SndfileHandle file2 = SndfileHandle(impulseResponsePath);
        
        if (file1.error() != 0) {
            std::cerr << "Error opening input file: " << file1.strError() << std::endl;
            return 1;
        }
        
        if (file2.error() != 0) {
            std::cerr << "Error opening impulse response file: " << file2.strError() << std::endl;
            return 1;
        }

        std::cout << "Input signal size: " << file1.frames() << std::endl;
        std::cout << "Impulse response size: " << file2.frames() << std::endl;

        // Read the input files
        std::vector<double> signal1(file1.frames() * file1.channels());
        std::vector<double> signal2(file2.frames() * file2.channels());
        file1.read(signal1.data(), file1.frames() * file1.channels());
        file2.read(signal2.data(), file2.frames() * file2.channels());

        // Apply input gain to the audio signal
        double inputGainLinear = std::pow(10.0, inputGain / 20.0);
        for (double& sample : signal1) {
            sample *= inputGainLinear;
        }

        // Apply impulse gain to the impulse response
        double impulseGainLinear = std::pow(10.0, impulseGain / 20.0);
        for (double& sample : signal2) {
            sample *= impulseGainLinear;
        }

        // Separate the stereo audio into two mono audio channels
        std::vector<double> left1(file1.frames()), right1(file1.frames());
        std::vector<double> left2(file2.frames()), right2(file2.frames());

        for (int i = 0; i < file1.frames(); ++i) {
            left1[i] = signal1[2 * i];
            right1[i] = signal1[2 * i + 1];
        }

        for (int i = 0; i < file2.frames(); ++i) {
            left2[i] = signal2[2 * i];
            right2[i] = signal2[2 * i + 1];
        }

        // Convolve the signals for each channel
        std::vector<double> leftOutput = convolve_fft(left1, left2);
        std::vector<double> rightOutput = convolve_fft(right1, right2);
        std::cout << "Output signal size: " << leftOutput.size() << std::endl;

        // Apply filters to the convolved output
        if (lowPassFreq < 20000.0) {
            std::cout << "Applying low-pass filter at " << lowPassFreq << " Hz" << std::endl;
            leftOutput = apply_lowpass_filter(leftOutput, lowPassFreq, file1.samplerate());
            rightOutput = apply_lowpass_filter(rightOutput, lowPassFreq, file1.samplerate());
        }
        
        if (highPassFreq > 20.0) {
            std::cout << "Applying high-pass filter at " << highPassFreq << " Hz" << std::endl;
            leftOutput = apply_highpass_filter(leftOutput, highPassFreq, file1.samplerate());
            rightOutput = apply_highpass_filter(rightOutput, highPassFreq, file1.samplerate());
        }
        
        // Apply stereo width processing
        if (stereoWidth != 100.0) {
            std::cout << "Applying stereo width: " << stereoWidth << "%" << std::endl;
            apply_stereo_width(leftOutput, rightOutput, stereoWidth);
        }

        // Apply dry/wet mix
        double wetRatio = dryWet / 100.0;
        double dryRatio = 1.0 - wetRatio;
        
        // Mix dry and wet signals
        for (int i = 0; i < leftOutput.size(); ++i) {
            double dryLeft = (i < left1.size()) ? left1[i] : 0.0;
            double dryRight = (i < right1.size()) ? right1[i] : 0.0;
            
            leftOutput[i] = dryLeft * dryRatio + leftOutput[i] * wetRatio;
            rightOutput[i] = dryRight * dryRatio + rightOutput[i] * wetRatio;
        }

        // Apply output gain
        double outputGainLinear = std::pow(10.0, outputGain / 20.0);
        for (double& sample : leftOutput) {
            sample *= outputGainLinear;
        }
        for (double& sample : rightOutput) {
            sample *= outputGainLinear;
        }

        // Normalize the left and right output separately (if enabled)
        if (normalize) {
            double max_val = *std::max_element(leftOutput.begin(), leftOutput.end(), [](double a, double b) {
                return std::abs(a) < std::abs(b);
            });
            if (std::abs(max_val) > 1.0) {
                for (double& sample : leftOutput) {
                    sample /= max_val;
                }
            }

            max_val = *std::max_element(rightOutput.begin(), rightOutput.end(), [](double a, double b) {
                return std::abs(a) < std::abs(b);
            });
            if (std::abs(max_val) > 1.0) {
                for (double& sample : rightOutput) {
                    sample /= max_val;
                }
            }
        }

        // Interleave the mono audio back into stereo audio
        std::vector<double> outputSignal(leftOutput.size() * 2);
        for (int i = 0; i < leftOutput.size(); ++i) {
            outputSignal[2 * i] = leftOutput[i];
            outputSignal[2 * i + 1] = rightOutput[i];
        }

        SndfileHandle fileOut = SndfileHandle(outputPath, SFM_WRITE, SF_FORMAT_WAV | SF_FORMAT_PCM_24, file1.channels(), file1.samplerate());

        if (fileOut.error() != 0) {
            std::cerr << "Error creating output file: " << fileOut.strError() << std::endl;
            return 1;
        }

        std::cout << "Writing to file: " << outputPath << std::endl;
        sf_count_t count = fileOut.writef(outputSignal.data(), outputSignal.size()/2);
        std::cout << "Number of items written: " << count << std::endl;
        std::cout << "Processing complete!" << std::endl;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
} 