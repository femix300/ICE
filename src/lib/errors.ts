export class AppError extends Error {
  public status: number;
  public errorCode: string;

  constructor(status: number, errorCode: string, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errorCode = errorCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
