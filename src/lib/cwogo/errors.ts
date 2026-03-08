export class CwogoError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "CwogoError";
    this.status = status;
  }
}

export function invariant(condition: unknown, message: string, status = 400): asserts condition {
  if (!condition) {
    throw new CwogoError(status, message);
  }
}
