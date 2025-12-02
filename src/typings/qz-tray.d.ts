// Type definitions for qz-tray (minimal, for Angular usage)
declare module "qz-tray" {
  export namespace websocket {
    function connect(): Promise<void>;
    function isActive(): boolean;
    function disconnect(): Promise<void>;
  }
  export namespace configs {
    function create(printer: string): any;
  }
  export function print(config: any, data: any[]): Promise<void>;
  export namespace printers {
    function find(): Promise<string[]>;
  }
}
