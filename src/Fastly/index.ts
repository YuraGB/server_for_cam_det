/**
 * This file is the entry point of the application. It imports the necessary modules and starts the server.
 * This is alternative to using Elysia, we can switch to Fastly (example) if we want to use nodejs instead of Elysia, but for now we will use Elysia as it is more modern and faster than nodejs.
 * After starting the WebSocket server, it also starts the gRPC stream to handle incoming frames and broadcast them to connected WebSocket clients.
 * Todo: Implementation of Fastly server if we decide to switch from Elysia.
 */