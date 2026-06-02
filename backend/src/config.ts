const isProd = process.env.NODE_ENV === "production";

if (isProd && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set in production. Refusing to start with default secret."
  );
}

const JWT_SECRET = process.env.JWT_SECRET ?? "super-secret-key-x-clone-dev-only";

export { JWT_SECRET };
