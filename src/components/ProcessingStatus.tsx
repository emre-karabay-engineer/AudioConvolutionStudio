import { Loader2, CheckCircle, Clock } from 'lucide-react'

interface ProcessingStatusProps {
  isProcessing: boolean
  progress: number
  outputFile: string | null
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({ 
  isProcessing, 
  progress,
  outputFile 
}) => {
  const getStatusIcon = () => {
    if (isProcessing) {
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
    } else if (outputFile) {
      return <CheckCircle className="w-5 h-5 text-green-600" />
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = () => {
    if (isProcessing) {
      return 'Processing audio...'
    } else if (outputFile) {
      return 'Processing complete!'
    } else {
      return 'Ready to process'
    }
  }

  const getStatusColor = () => {
    if (isProcessing) {
      return 'text-blue-600'
    } else if (outputFile) {
      return 'text-green-600'
    } else {
      return 'text-gray-600'
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Processing Status</h3>
      
      <div className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
          {getStatusIcon()}
          <div>
            <p className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {isProcessing && (
              <p className="text-sm text-gray-500">
                This may take a few moments...
              </p>
            )}
          </div>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Processing...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Output File Information */}
        {outputFile && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Output File</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Generated: {outputFile}</p>
              <p className="text-green-600">✓ Ready for preview and download</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProcessingStatus 