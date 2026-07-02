export class AppError extends Error {
  public code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
