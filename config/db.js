const Pool = require('pg').Pool

module.exports =  new Pool({
    user: process.env.POSTGRES_USERNAME,
    host: process.env.HOST,
    database: 'ecommerece',
    password: process.env.POSTGRES_PASSWORD,
    port: process.env.DB_PORT,
})
