// SPDX-License-Identifier: AGPL-3.0-only
import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyError } from "fastify";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public details?: Record<string, unknown>) {
    super(message);
    this.name = "AppError";
  }
}

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler<Error>((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(422).send({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: { issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) } } });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    const fastifyError = error as FastifyError;
    if (fastifyError.validation) {
      return reply.status(422).send({ error: { code: "VALIDATION_ERROR", message: "Request validation failed", details: { issues: fastifyError.validation } } });
    }
    fastify.log.error(error);
    return reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
  });
};

export default fp(errorHandlerPlugin, { name: "error-handler" });
