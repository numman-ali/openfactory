// SPDX-License-Identifier: AGPL-3.0-only
import fp from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import websocket from "@fastify/websocket";

const websocketPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(websocket);

  fastify.get("/ws", { websocket: true }, (socket, _request) => {
    fastify.log.info("WebSocket client connected");

    socket.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        fastify.log.debug({ data }, "WebSocket message received");

        // Handle different message types
        switch (data.type) {
          case "subscribe":
            // Subscribe to project/document updates
            fastify.log.info({ channel: data.channel }, "Client subscribed");
            socket.send(JSON.stringify({ type: "subscribed", channel: data.channel }));
            break;

          case "unsubscribe":
            fastify.log.info({ channel: data.channel }, "Client unsubscribed");
            socket.send(JSON.stringify({ type: "unsubscribed", channel: data.channel }));
            break;

          case "ping":
            socket.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
            break;

          default:
            socket.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
        }
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      }
    });

    socket.on("close", () => {
      fastify.log.info("WebSocket client disconnected");
    });
  });
};

export default fp(websocketPlugin, { name: "websocket" });
