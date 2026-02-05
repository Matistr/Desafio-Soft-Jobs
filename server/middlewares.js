const jwt = require('jsonwebtoken')
require('dotenv').config()

const requestLogger = (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`)
  next()
}

const checkCredentials = (req, res, next) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'Email y password son obligatorios.' })
  next()
}

const verifyToken = (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth) return res.status(401).json({ message: 'Token no proporcionado.' })

    const parts = auth.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ message: 'Formato de token inválido.' })

    const token = parts[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret')
    req.userEmail = decoded.email
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
