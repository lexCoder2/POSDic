import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";

export interface ToastMessage {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
}

@Injectable({ providedIn: "root" })
export class ToastService {
  private subject = new Subject<ToastMessage>();
  private _id = 0;

  show(message: string, type: ToastMessage["type"] = "info", duration = 2000) {
    const payload: ToastMessage = {
      id: ++this._id,
      message,
      type,
      duration,
    };
    this.subject.next(payload);
    return payload.id;
  }

  onToast(): Observable<ToastMessage> {
    return this.subject.asObservable();
  }
}
