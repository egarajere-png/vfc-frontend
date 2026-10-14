export class ApiError extends Error {
  code: string;
  constructor(message: string, code = 'error') {
    super(message);
    this.code = code;
  }
}
