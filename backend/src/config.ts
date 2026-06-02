const isProd = process.env.NODE_ENV === "production";

const INSECURE_DEV_DEFAULT = "super-secret-key-x-clone-dev-only";
const INSECURE_DEMO_DEFAULT = "INSECURE-DEMO-SECRET-DO-NOT-USE-IN-PRODUCTION";
const KNOWN_WEAK_SECRETS = new Set([INSECURE_DEV_DEFAULT, INSECURE_DEMO_DEFAULT, "change-me-in-production"]);

if (isProd && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set in production. Refusing to start with default secret."
  );
}

const JWT_SECRET = process.env.JWT_SECRET ?? INSECURE_DEV_DEFAULT;

if (isProd && KNOWN_WEAK_SECRETS.has(JWT_SECRET)) {
  console.warn(
    "\n⚠️  SECURITY WARNING: JWT_SECRET is set to a publicly-known weak default.\n" +
    "   This is fine for evaluator/demo Docker runs, but UNSAFE for any real deployment.\n" +
    "   Generate a strong one with: node -e \"console.log(require('crypto').randomBytes(48).toString('base64'))\"\n"
  );
}

export { JWT_SECRET };
