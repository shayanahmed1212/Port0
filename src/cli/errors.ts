export const EXIT = {
  OK: 0,
  USAGE: 1,
  ENVIRONMENT: 2,
  SECRET: 3,
  IO: 4,
  VERIFY: 5,
} as const;

export class Port0Error extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode: number = EXIT.USAGE) {
    super(message);
    this.name = "Port0Error";
    this.exitCode = exitCode;
  }
}
