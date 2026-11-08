export interface Logger {
  error(obj: object, msg?: string): void;
}

export const loggerNulo: Logger = {
  error() {},
};
