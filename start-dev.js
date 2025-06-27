import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('Starting development servers...')

// Start the backend server
const backend = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit'
})

// Wait a moment for backend to start, then start frontend
setTimeout(() => {
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit'
  })

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\nShutting down servers...')
    backend.kill()
    frontend.kill()
    process.exit(0)
  })

  frontend.on('close', (code) => {
    console.log(`Frontend server exited with code ${code}`)
    backend.kill()
    process.exit(code)
  })
}, 2000)

backend.on('close', (code) => {
  console.log(`Backend server exited with code ${code}`)
  process.exit(code)
})

console.log('Backend server starting on port 3001...')
console.log('Frontend server will start on port 5173...') 