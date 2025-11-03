import { Sequelize } from 'sequelize';

// Prefer environment variables when provided; otherwise use the provided Render credentials by default
const hasEnvDb = !!process.env.DB_HOST;

let sequelizeInstance: Sequelize;

if (hasEnvDb) {
	const dbName = process.env.DB_NAME || 'investo';
	const dbUser = process.env.DB_USER || 'postgres';
	const dbPass = process.env.DB_PASSWORD || '';
	const dbHost = process.env.DB_HOST || '127.0.0.1';
	const dbPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432;

	sequelizeInstance = new Sequelize(dbName, dbUser, dbPass, {
		host: dbHost,
		port: dbPort,
		dialect: 'postgres',
		logging: false,
		dialectOptions: process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : undefined,
		pool: { max: 10, min: 0, acquire: 60000, idle: 20000 }
	});
} else {
	// Default to the user's Render database credentials
	const cfg = {
		HOST: 'dpg-d41rn4juibrs73flltn0-a.singapore-postgres.render.com',
		USER: 'investo_3mo3_user',
		PASSWORD: '8UExBu4D44YsoQOEtGa9PTw9do3XUQ5E',
		DB: 'investo_3mo3'
	};

	sequelizeInstance = new Sequelize(cfg.DB, cfg.USER, cfg.PASSWORD, {
		host: cfg.HOST,
		port: 5432,
		dialect: 'postgres',
		logging: false,
		dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
		pool: { max: 10, min: 0, acquire: 60000, idle: 20000 }
	});
}

export const sequelize = sequelizeInstance;



