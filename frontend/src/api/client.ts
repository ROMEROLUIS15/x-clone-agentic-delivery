export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, token, signal } = options;

  // FormData (file uploads) must NOT carry a manual Content-Type — the browser
  // sets the multipart boundary itself.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined,
    signal,
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // empty body or non-JSON response
  }

  if (!res.ok) {
    if (res.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    const message =
      (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
        ? (data as { error: string }).error
        : `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const api = {
  get: <T = unknown>(path: string, token?: string | null, signal?: AbortSignal) =>
    apiRequest<T>(path, { method: "GET", token, signal }),
  post: <T = unknown>(path: string, body?: unknown, token?: string | null) =>
    apiRequest<T>(path, { method: "POST", body, token }),
  patch: <T = unknown>(path: string, body?: unknown, token?: string | null) =>
    apiRequest<T>(path, { method: "PATCH", body, token }),
  delete: <T = unknown>(path: string, token?: string | null) =>
    apiRequest<T>(path, { method: "DELETE", token }),
  /** Uploads a single image under the `image` field and returns `{ url }`. */
  upload: <T = unknown>(path: string, file: File, token?: string | null) => {
    const form = new FormData();
    form.append("image", file);
    return apiRequest<T>(path, { method: "POST", body: form, token });
  },
};
