import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { HttpError } from "./error.middleware";

type Source = "body" | "query" | "params";

export function validate(schema: ZodSchema, source: Source = "body") {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const err = result.error as ZodError;
      const first = err.issues[0];
      throw new HttpError(400, first?.message ?? "Invalid request payload");
    }
    // Replace with parsed/transformed value (e.g. coercions)
    (req as unknown as Record<Source, unknown>)[source] = result.data;
    next();
  };
}
