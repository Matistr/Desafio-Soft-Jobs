const jwt = require('jsonwebtoken')
require('dotenv').config()
const pool = require('./db')

const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
}

const checkCredentials = (req, res, next) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email y password son obligatorios.' })
  next()
}

const verifyToken = async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth) return res.status(401).json({ message: 'Token no proporcionado.' })

    const parts = auth.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Formato de token inválido.' })

    const token = parts[1]
    // Decode first to get email, then fetch user's secret to verify
    const decoded = jwt.decode(token)
    if (!decoded || !decoded.email) return res.status(401).json({ message: 'Token inválido.' })

    const { rows } = await pool.query('SELECT jwt_secret FROM usuarios WHERE email = $1', [decoded.email])
    if (!rows.length) return res.status(401).json({ message: 'Usuario no encontrado.' })

    const secret = rows[0].jwt_secret || process.env.JWT_SECRET || 'secret'
    const verified = jwt.verify(token, secret)
    req.userEmail = verified.email
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token inválido o expirado.' })
  }
}

module.exports = {
  requestLogger,
  checkCredentials,
  verifyToken
}
