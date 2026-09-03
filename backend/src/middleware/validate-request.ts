import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny } from "zod";
import { validationError, type ValidationIssue } from "../shared/errors/api-error";

type RequestValidationSchemas = {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
};

function formatField(path: Array<string | number>): string {
  return path.map(String).join(".") || "request";
}

function mapZodIssues(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    field: formatField(issue.path),
    message: issue.message
  }));
}

function applyValidation(
  request: Request,
  schemas: RequestValidationSchemas
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (schemas.body) {
    const result = schemas.body.safeParse(request.body);

    if (result.success) {
      const parsedBody: unknown = result.data;
      request.body = parsedBody;
    } else {
      issues.push(...mapZodIssues(result.error));
    }
  }

  if (schemas.params) {
    const result = schemas.params.safeParse(request.params);

    if (result.success) {
      const parsedParams: unknown = result.data;
      request.params = parsedParams as Request["params"];
    } else {
      issues.push(...mapZodIssues(result.error));
    }
  }

  if (schemas.query) {
    const result = schemas.query.safeParse(request.query);

    if (result.success) {
      const parsedQuery: unknown = result.data;
      request.query = parsedQuery as Request["query"];
    } else {
      issues.push(...mapZodIssues(result.error));
    }
  }

  return issues;
}

export function validateRequest(schemas: RequestValidationSchemas): RequestHandler {
  return (request: Request, _response: Response, next: NextFunction): void => {
    const issues = applyValidation(request, schemas);

    if (issues.length > 0) {
      next(validationError(issues));
      return;
    }

    next();
  };
}

export function validateBody(schema: ZodTypeAny): RequestHandler {
  return validateRequest({ body: schema });
}

export function validateParams(schema: ZodTypeAny): RequestHandler {
  return validateRequest({ params: schema });
}

export function validateQuery(schema: ZodTypeAny): RequestHandler {
  return validateRequest({ query: schema });
}
