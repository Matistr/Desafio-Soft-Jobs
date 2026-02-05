const fs = require('fs')
const dotenv = require('dotenv')

const envResult = dotenv.config()
if (envResult.error) {
  try {
    const examplePath = '.env.example'
    if (fs.existsSync(examplePath)) {
      const parsed = dotenv.parse(fs.readFileSync(examplePath))
      Object.keys(parsed).forEach(k => {
        if (process.env[k] === undefined) process.env[k] = parsed[k]
      })
      console.log('Loaded environment from .env.example as fallback')
    } else {
      console.log('.env not found and no .env.example present; proceeding with process.env')
    }
  } catch (e) {
    console.warn('Failed to load .env.example fallback:', e)
  }
}
console.log('server: loaded dotenv, env PORT=' + (process.env.PORT || 'undefined'))

const LOGFILE = 'run.log'
const appendLog = (level, msg) => {
  const line = `[${new Date().toISOString()}] ${level}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}\n`
  try { fs.appendFileSync(LOGFILE, line) } catch (e) { /* ignore */ }
}
appendLog('INFO', 'start index.js, env PORT=' + (process.env.PORT || 'undefined'))

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION', err && err.stack ? err.stack : err)
  appendLog('ERROR', err && err.stack ? err.stack : err)
})
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION', reason)
  appendLog('ERROR', reason)
})

const express = require('express')
const cors = require('cors')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const pool = require('./db')
const { requestLogger, checkCredentials, verifyToken } = require('./middlewares')

// Ensure users table has a column for per-user jwt secret
pool.query('ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS jwt_secret VARCHAR(200);')
  .then(() => console.log('Ensured usuarios.jwt_secret column exists'))
  .catch(err => console.warn('Could not ensure jwt_secret column:', err && err.message ? err.message : err))

const app = express()
app.use(cors())
app.use(express.json())
app.use(requestLogger)

// Nuevo Usuario
app.post('/usuarios', checkCredentials, async (req, res, next) => {
  try {
    const { email, password, rol = null, lenguage = null } = req.body

    const { rows: existing } = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email])
    if (existing.length) return res.status(409).json({ message: 'El email ya está registrado.' })

    const hashed = await bcrypt.hash(password, 10)
    const userSecret = crypto.randomBytes(32).toString('hex')
    const { rows } = await pool.query(
      'INSERT INTO usuarios (email, password, rol, lenguage, jwt_secret) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, rol, lenguage',
      [email, hashed, rol, lenguage, userSecret]
    )

    // Create JWT signed with the per-user secret and return it alongside the user
    const token = jwt.sign({ email: rows[0].email }, userSecret, { expiresIn: '1h' })
    res.status(201).json({ user: rows[0], token })
  } catch (err) {
    next(err)
  }
})

// Login
app.post('/login', checkCredentials, async (req, res, next) => {
  try {
    const { email, password } = req.body
    const { rows } = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email])
    if (!rows.length) return res.status(401).json({ message: 'Credenciales incorrectas.' })

    const user = rows[0]
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) return res.status(401).json({ message: 'Credenciales incorrectas.' })

    const userSecret = user.jwt_secret || crypto.randomBytes(32).toString('hex')
    const token = jwt.sign({ email: user.email }, userSecret, { expiresIn: '1h' })
    res.json({ token })
  } catch (err) {
    next(err)
  }
})

// Get user (protected)
app.get('/usuarios', verifyToken, async (req, res, next) => {
  try {
    const email = req.userEmail
    const { rows } = await pool.query('SELECT id, email, rol, lenguage FROM usuarios WHERE email = $1', [email])
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 3000
console.log('server: starting listener on port', PORT)
const server = app.listen(PORT, () => console.log(`SoftJobs server running on port ${PORT}`))
server.on('error', (err) => {
  console.error('server listen error:', err)
})
