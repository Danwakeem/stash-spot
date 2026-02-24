export type ServiceErrorCode = "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "VALIDATION";

const STATUS_MAP: Record<ServiceErrorCode, number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  CONFLICT: 409,
  VALIDATION: 400,
};

export class ServiceError extends Error {
  constructor(
    public readonly code: ServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }

  get status(): number {
    return STATUS_MAP[this.code];
  }

  static notFound(message: string) {
    return new ServiceError("NOT_FOUND", message);
  }

  static forbidden(message: string) {
    return new ServiceError("FORBIDDEN", message);
  }

  static conflict(message: string) {
    return new ServiceError("CONFLICT", message);
  }

  static validation(message: string) {
    return new ServiceError("VALIDATION", message);
  }
}
