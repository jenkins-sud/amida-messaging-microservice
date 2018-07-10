import Joi from 'joi';
// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();

// define validation for all the env vars
const envVarsSchema = Joi.object({
    NODE_ENV: Joi.string()
        .allow(['development', 'production', 'test', 'provision'])
        .default('development'),
    MESSAGING_SERVICE_PORT: Joi.number()
        .default(4001),
    JWT_SECRET: Joi.string().required()
        .description('JWT Secret required to sign'),
    MESSAGING_SERVICE_PG_DB: Joi.string().required()
        .description('Postgres database name'),
    MESSAGING_SERVICE_PG_PORT: Joi.number()
        .default(5432),
    MESSAGING_SERVICE_PG_HOST: Joi.string()
        .default('localhost'),
    MESSAGING_SERVICE_PG_USER: Joi.string().required()
        .description('Postgres username'),
    MESSAGING_SERVICE_PG_PASSWORD: Joi.string().allow('')
        .description('Postgres password'),
    MESSAGING_SERVICE_PG_SSL: Joi.bool()
        .default(false)
        .description('Enable SSL connection to PostgreSQL'),
    MESSAGING_SERVICE_PG_CERT_CA: Joi.string()
        .description('SSL certificate CA'), // Certificate itself, not a filename
    TEST_TOKEN: Joi.string().allow('')
        .description('Test auth token'),
    AUTH_MICROSERVICE_URI: Joi.string().allow('')
        .description('Auth microservice endpoint'),
    NOTIFICATION_MICROSERVICE_URI: Joi.string().allow('')
        .description('Notification Microservice endpoint'),
    MICROSERVICE_ACCESS_KEY: Joi.string().allow('')
        .description('Microservice Access Key'),
    MICROSERVICE_PASSWORD: Joi.string().allow('')
        .description('Microservice Password'),
    ENABLE_PUSH_NOTIFICATIONS: Joi.bool()
        .default(false),
}).unknown()
    .required();

const { error, value: envVars } = Joi.validate(process.env, envVarsSchema);
if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const config = {
    env: envVars.NODE_ENV,
    port: envVars.MESSAGING_SERVICE_PORT,
    jwtSecret: envVars.JWT_SECRET,
    testToken: envVars.TEST_TOKEN,
    authMicroService: envVars.AUTH_MICROSERVICE_URI,
    notificationMicroservice: envVars.NOTIFICATION_MICROSERVICE_URI,
    microserviceAccessKey: envVars.MICROSERVICE_ACCESS_KEY,
    microservicePassword: envVars.MICROSERVICE_PASSWORD,
    enablePushNotifications: envVars.ENABLE_PUSH_NOTIFICATIONS,
    postgres: {
        db: envVars.MESSAGING_SERVICE_PG_DB,
        port: envVars.MESSAGING_SERVICE_PG_PORT,
        host: envVars.MESSAGING_SERVICE_PG_HOST,
        user: envVars.MESSAGING_SERVICE_PG_USER,
        passwd: envVars.MESSAGING_SERVICE_PG_PASSWORD,
        ssl: envVars.MESSAGING_SERVICE_PG_SSL,
        ssl_ca_cert: envVars.MESSAGING_SERVICE_PG_CERT_CA,
    },
};

export default config;
