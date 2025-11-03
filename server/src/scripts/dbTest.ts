import dotenv from 'dotenv'
dotenv.config()

import { sequelize } from '../lib/sequelize'

async function main() {
    try {
        await sequelize.authenticate()
        console.log('DB connection OK')
        await sequelize.query('SELECT 1;')
        console.log('Simple query OK')
        process.exit(0)
    } catch (e) {
        console.error('DB connection failed:', e)
        process.exit(1)
    }
}

main()




