/**
 * Elysia Authentication Module
 * This module provides authentication utilities for the Elysia WebRTC signaling server. It includes functions to authenticate incoming HTTP requests before upgrading them to WebSocket connections, as well as any related types and constants.
 * The main authentication logic is implemented in the `authenticateRequest` function, which checks for valid credentials in the request headers and returns an appropriate response.
 * This module is designed to be easily integrated into the Elysia server setup, allowing for secure handling of WebSocket connections based on authenticated HTTP requests.
 */
export * from './utils';