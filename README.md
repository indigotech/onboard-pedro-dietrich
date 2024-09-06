# Onboarding Backend Project

Pedro Martins Dietrich

## Description

This is a small project for learning the basics of Git and other tools used for backend software development, as well as common practices used in the Taqtile.

# Environment and Tools

The operational system used for development is **Ubuntu 22.04**.

This project uses **Node.js** `v20.16.0` and **npm** `10.8.1`.

**Docker** must be installed to run necessary containers.

A tool such as **TablePlus** might be useful for managing the database, although it is not required.

# Setup and Executing

To install the dependencies, run `npm install`.

Start the Postgresql containers using `docker compose up -d`, as it is required to run the server.
It can be shut down later with `docker compose stop`.

To start the server at `localhost:4000`, run `npm start`.
For development, use `npm run dev` instead, which starts the server with hot realoading.

# Testing

To run the tests, use `npm test`.

Additionally, it is recommended to also verify the formatting of the code, which can be done with `npm run lint`.
