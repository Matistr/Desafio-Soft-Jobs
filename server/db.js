const { Pool } = require('pg')
require('dotenv').config()

if (process.env.PGPASSWORD !== undefined) {
  process.env.PGPASSWORD = String(process.env.PGPASSWORD)
}
console.log('Normalized env types:', {
  PGPASSWORD_type: typeof process.env.PGPASSWORD,
  DATABASE_URL_type: typeof process.env.DATABASE_URL
})

const rawPassword = process.env.PGPASSWORD
if (rawPassword !== undefined && typeof rawPassword !== 'string') {
  console.warn('Warning: PGPASSWORD is not a string (type=' + typeof rawPassword + '). Coercing to string for client.')
}
const password = rawPassword != null ? String(rawPassword) : ''

const mask = (s) => {
  if (!s) return '<empty>'
  const str = String(s)
  if (str.length <= 4) return '*'.repeat(str.length)
  return str.slice(0, 2) + '*'.repeat(Math.max(0, str.length - 4)) + str.slice(-2)
}
console.log('DB config (diagnostic):', {
  user: String(process.env.PGUSER || 'postgres'),
  host: String(process.env.PGHOST || 'localhost'),
  database: String(process.env.PGDATABASE || 'softjobs'),
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  password_type: typeof rawPassword,
  password_masked: mask(rawPassword)
})

const DB_USER = String(process.env.PGUSER || 'postgres')
const DB_HOST = String(process.env.PGHOST || 'localhost')
const DB_NAME = String(process.env.PGDATABASE || 'softjobs')
const DB_PORT = process.env.PGPORT ? Number(process.env.PGPORT) : 5432

const envUrl = process.env.DATABASE_URL
let pool
if (envUrl) {
  const masked = envUrl.replace(/:\/\/(.*?):(.*?)@/, '://$1:<pwd>@')
  console.log('Using DATABASE_URL (masked):', masked)
  pool = new Pool({ connectionString: envUrl })
} else {
  try {
    const connectionString = `postgresql://${encodeURIComponent(DB_USER)}:${encodeURIComponent(password)}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
    console.log('DB connectionString (masked):', connectionString.replace(/:(.*)@/, ':<pwd>@'))
    pool = new Pool({ connectionString })
  } catch (err) {
    console.error('Failed building connectionString:', err && err.message ? err.message : err)
    pool = new Pool({ user: DB_USER, host: DB_HOST, database: DB_NAME, password, port: DB_PORT })
  }
}

pool.connect()
  .then(client => {
    client.release()
    console.log('DB connection successful (diagnostic)')
  })
  .catch(err => {
    console.error('DB connection failed (diagnostic):', err && err.message ? err.message : err)
    if (err && err.stack) console.error(err.stack)
  })

module.exports = pool
