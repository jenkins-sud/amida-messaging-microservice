# Amida Messaging Microservice

# Table of Contents

  - [Design](#design)
  - [Development](#development)
  - [Deployment](#deployment)
  - [Environment Variables](#Environment-Variables)

# Design

## API Spec

The spec can be viewed at https://amida-tech.github.io/amida-messaging-microservice/.

To update the spec, first edit the files in the `docs` directory. Then run `aglio -i docs/src/docs.md --theme flatly -o index.html`.

Merge the resulting changes to the `gh-pages` branch of the repository.

## Logging

Universal logging library [winston](https://www.npmjs.com/package/winston) is used for logging. It has support for multiple transports. A transport is essentially a storage device for your logs. Each instance of a winston logger can have multiple transports configured at different levels. For example, one may want error logs to be stored in a persistent remote location (like a database), but all logs output to the console or a local file. We just log to the console for simplicity, but you can configure more transports as per your requirement.

# Development

## Versions

`yarn start` fails if your Node.js version is v10.4.1. Exactly all of the Node.js versions that fail in this way are unknown.

Node.js v8.11.1 is known to work.

## Setup

Install yarn:
```js
npm install -g yarn
```

Install dependencies:
```sh
yarn
```

Set environment vars:
```sh
cp .env.example .env
cp .env .env.test
```

In .env, specify the enviroment variables you need.

Create the database:

When you `yarn start` the first time (see the [Development > Run](#Run) section), a script will automatically create the database schema. However, this will only work if your postgres instance has:

1. A database matching your `.env` file's `MESSAGING_SERVICE_PG_DB` name
2. A user matching your `.env` file's `MESSAGING_SERVICE_PG_USER` name, which has sufficient permissions to modify your `MESSAGING_SERVICE_PG_DB`.

Therefore, in your Postgres instance, create that user and database now.

## Run

```sh
# Start server
yarn start

# Selectively set DEBUG env var to get logs
DEBUG=amida-messaging-microservice:* yarn start
```

## Tests

Create a JWT with the username value 'user0' and set `MESSAGING_SERVICE_AUTOMATED_TEST_JWT={token}` in your .env file or an evironment variable. You can easily create a token using the amida-auth-microservice

```sh
# Run tests written in ES6
# Make sure .env.test exists
yarn test

# Run test along with code coverage
yarn test:coverage

# Run tests on file change
yarn test:watch

# Run tests enforcing code coverage (configured via .istanbul.yml)
yarn test:check-coverage
```

## Lint

```sh
# Lint code with ESLint
yarn lint

# Run lint on any file change
yarn lint:watch
```

## Other gulp tasks

```sh
# Wipe out dist and coverage directory
gulp clean

# Default task: Wipes out dist and coverage directory. Compiles using babel.
gulp
```

## Enabling Push Notifications with the Notifications Microservice

Note: This is optional. It is here in its own section because it is complicated and not necessary unless you are developing/testing something that uses push notifications.

- Set up and start the [Amida Notification Microservice](https://github.com/amida-tech/amida-notification-microservice)
- In your `.env` file, set the `NOTIFICATION_MICROSERVICE_URL` and push notifications -related environment variables with values matching those set in the `amida-notification-microserivce`

# Deployment

## Deployment Via Docker

Docker deployment requires two docker containers:
- An instance of the official Postgres docker image (see: https://hub.docker.com/_/postgres/).
- An instance of this service's docker image (see: https://hub.docker.com/r/amidatech/messaging-service/).

The Postgres container must be running _before_ the messaging-service container is started because, upon initial run, the messaging-service container defines the schema within the Postgres database.

Also, the containers communicate via a docker network. Therefore,

1. First, create the Docker network:

```sh
docker network create {DOCKER_NETWORK_NAME}
```

2. Start the postgres container:

```sh
docker run -d --name {MESSAGING_SERVICE_PG_HOST} --network {DOCKER_NETWORK_NAME} \
-e POSTGRES_DB={MESSAGING_SERVICE_PG_DB} \
-e POSTGRES_USER={MESSAGING_SERVICE_PG_USER} \
-e POSTGRES_PASSWORD={MESSAGING_SERVICE_PG_PASSWORD} \
postgres:9.6
```

3. Create a `.env` file for use by this service's docker container. A good starting point is `.env.production`.

Note: To make push notifications work, follow the steps in section [Enabling Push Notifications with the Notifications Microservice](#Enabling-Push-Notifications-with-the-Notifications-Microservice)

Note: If you are testing deploying this service in conjunction with other services or to connect to a specific front-end client it is vital that the JWT_SECRET environment variables match up between the different applications.

```sh
docker run -d -p 4001:4001 \
--name amida-messaging-microservice --network {DOCKER_NETWORK_NAME} \
-v {ABSOLUTE_PATH_TO_YOUR_ENV_FILE}:/app/.env:ro \
amidatech/messaging-service
```

### With docker-compose

Alternatively, there is also a docker-compose.yml file. Therefore, you can:

```sh
docker-compose up
```

## Deployment to AWS with Packer and Terraform

You will need to install [pakcer](https://www.packer.io/) and [terraform](https://www.terraform.io/) installed on your local machine.
Be sure to have your postgres host running and replace the `messaging_service_pg_host` value in the command below with the postgres host address.
1. First validate the AMI with a command similar to ```packer validate -var 'aws_access_key=myAWSAcessKey'
-var 'aws_secret_key=myAWSSecretKey'
-var 'build_env=development'
-var 'logstash_host=logstash.amida.com'
-var 'service_name=amida_messaging_microservice'
-var 'ami_name=api-messaging-service-boilerplate'
-var 'node_env=development'
-var 'jwt_secret=My-JWT-Token'
-var 'messaging_service_pg_host=amida-messages-packer-test.some_rand_string.us-west-2.rds.amazonaws.com'
-var 'messaging_service_pg_db=amida_messages'
-var 'messaging_service_pg_user=amida_messages'
-var 'messaging_service_pg_password=amida-messages' template.json```
2. If the validation from `1.` above succeeds, build the image by running the same command but replacing `validate` with `build`
3. In the AWS console you can test the build before deployment. To do this, launch an EC2 instance with the built image and visit the health-check endpoint at <host_address>:4000/api/health-check. Be sure to launch the instance with security groups that allow http access on the app port (currently 4000) and access from Postgres port of the data base. You should see an "OK" response.
4. Enter `aws_access_key` and `aws_secret_key` values in the vars.tf file
5. run `terraform plan` to validate config
6. run `terraform apply` to deploy
7. To get SNS Alarm notifications be sure that you are subscribed to SNS topic arn:aws:sns:us-west-2:844297601570:ops_team_alerts and you have confirmed subscription

Further details can be found in the `deploy` directory.

## Kubernetes Deployment

See the [paper](https://paper.dropbox.com/doc/Amida-Microservices-Kubernetes-Deployment-Xsz32zX8nwT9qctitGNVc) write-up for instructions on how to deploy with Kubernetes. The `kubernetes.yml` file contains the deployment definition for the project.

# Environment Variables

Environment variables are applied in this order, with the former overwritten by the latter:

1. Default values, which are set automatically by [joi](https://github.com/hapijs/joi) within `config.js`, even if no such environment variable is specified whatsoever.
2. Variables specified by the `.env` file.
3. Variables specified via the command line.

Variables are listed below in this format:

##### `VARIABLE_NAME` (Required (if it actually is)) [`the default value`]

A description of what the variable is or does.
- A description of what to set the variable to, whether that be an example, or what to set it to in development or production, or how to figure out how to set it, etc.
- Perhaps another example value, etc.

## Messaging Microservice

##### `NODE_ENV` (Required) [`development`]

- Valid values are `development`, `production`, and `test`.

##### `MESSAGING_SERVICE_PORT` (Required) [`4001`]

The port this server will run on.
- When in development, by default set to `4001`, because other Amida microservices run, by default, on other `400x` ports.

##### `MESSAGING_SERVICE_AUTOMATED_TEST_JWT` (Required by test scripts)

This is the `amida-auth-microservice` JWT that is used by this repo's automated test suite when it makes requests.

##### `MESSAGING_SERVICE_PG_HOST` (Required)

Hostname of machine the postgres instance is running on.
- When using docker, set to the name of the docker container running postgres. Setting to `amida-messaging-microservice-db` is recommended.

##### `MESSAGING_SERVICE_PG_PORT` (Required) [`5432`]

Port on the machine the postgres instance is running on.

##### `MESSAGING_SERVICE_PG_DB`

Postgres database name.
- Setting to `amida_messaging_microservice` is recommended because 3rd parties could be running Amida services using their Postgres instances--which is why the name begins with `amida_`.

##### `MESSAGING_SERVICE_PG_USER`

Postgres user that will perform operations on behalf of this microservice. Therefore, this user must have permissions to modify the database specified by `MESSAGING_SERVICE_PG_DB`.
- Setting to `amida_messaging_microservice` is recommended because 3rd parties could be running Amida services using their Postgres instances--which is why the name begins with `amida_`.

##### `MESSAGING_SERVICE_PG_PASSWORD`

Password of postgres user `MESSAGING_SERVICE_PG_USER`.

##### `MESSAGING_SERVICE_PG_SSL_ENABLED` [`false`]

Whether an SSL connection shall be used to connect to postgres.

##### `MESSAGING_SERVICE_PG_CA_CERT`

If SSL is enabled with `MESSAGING_SERVICE_PG_SSL_ENABLED` this can be set to a certificate to override the CAs that are trusted while initiating the SSL connection to postgres. Without this set, Mozilla's list of trusted CAs is used. Note that this variable should contain the certificate itself, not a filename.

## Integration With Amida Auth Microservice

##### `AUTH_MICROSERVICE_URL`

URL of the Auth Service API.
- `.env.production` sets this to to `https://amida-auth-microservice:4000/api/v1`, which assumes:
  - `amida-auth-microservice` is the name of the docker container running the Auth Service.
  - `4000` is the port the Auth Service is running on in its container.
  - The Auth Service's docker container and this service's docker container are a part of the same docker network.

##### `JWT_SECRET`

Must match value of the JWT secret being used by your `amida-auth-microservice` instance.
- See [that repo](https://github.com/amida-tech/amida-auth-microservice) for details.

## Integration With Amida Notification Microservice

##### `NOTIFICATION_MICROSERVICE_URL`

URL of Amida Notification Microservice API.
- `.env.production` sets this to to `https://amida-notification-microservice:4000/api/v1`, which assumes:
  - `amida-notification-microservice` is the name of the docker container running the Notification Service.
  - `4003` is the port the Notification Service is running on in its container.
  - The Notification Service's docker container and this service's docker container are a part of the same docker network.

##### `PUSH_NOTIFICATIONS_ENABLED` (Required) [`false`]

**WARNING**: When `true`, the other push notification-related environment variables must be set correctly. Not doing so is an unsupported state that is error and crash prone.

##### `PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME`

The username of the service user that authenticates against `amida-auth-microservice` and performs requests against the `amida-notification-microservice` API.
- `.env.example` sets this to `oucuYaiN6pha3ahphiiT`, which is for development only. In production, set this to a different value.

##### `PUSH_NOTIFICATIONS_SERVICE_USER_PASSWORD`

The password of the user specified by `PUSH_NOTIFICATIONS_SERVICE_USER_USERNAME`.
- `.env.example` sets this to `@TestTest1`, which is for development only. In production, set this to a different value.
