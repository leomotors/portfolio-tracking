export class Logger {
  private static instance: Logger;
  private messages: string[] = [];
  private _hasWarning = false;
  private _hasError = false;

  public get hasWarning() {
    return this._hasWarning;
  }

  public get hasError() {
    return this._hasError;
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public reset() {
    this.messages = [];
  }

  public log(message: string) {
    this.messages.push(message);
    console.log(message);
  }

  public warn(message: string) {
    this.messages.push(message);
    console.warn(message);
    this._hasWarning = true;
  }

  public error(message: string) {
    this.messages.push(message);
    console.error(message);
    this._hasError = true;
  }

  public getMessages() {
    return this.messages;
  }
}

export const logger = Logger.getInstance();
