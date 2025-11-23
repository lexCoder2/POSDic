declare module "html5-qrcode" {
  export class Html5Qrcode {
    constructor(elementIdOrConfig: string | HTMLElement);
    start(
      cameraConfig: any,
      config?: any,
      qrCodeSuccessCallback?: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: any) => void
    ): Promise<void>;
    stop(): Promise<void>;
    clear(): Promise<void>;
    static getCameras?(): Promise<any>;
  }

  export default Html5Qrcode;
}
