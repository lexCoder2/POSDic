import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from "@angular/core/testing";
import { Subject } from "rxjs";
import { ToastComponent } from "./toast.component";
import { ToastService, ToastMessage } from "../../services/toast.service";

describe("ToastComponent", () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastSubject: Subject<ToastMessage>;
  let toastServiceSpy: any;

  beforeEach(async () => {
    toastSubject = new Subject<ToastMessage>();
    toastServiceSpy = {
      onToast: jest.fn().mockReturnValue(toastSubject.asObservable()),
    };

    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [{ provide: ToastService, useValue: toastServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should start with empty toasts array", () => {
    expect(component.toasts).toEqual([]);
  });

  it("should add toast when service emits", fakeAsync(() => {
    const toast: ToastMessage = {
      id: 1,
      message: "Hello",
      type: "success",
      duration: 5000,
    };
    toastSubject.next(toast);
    expect(component.toasts).toHaveLength(1);
    expect(component.toasts[0].message).toBe("Hello");
    tick(5000);
  }));

  it("should remove toast after duration", fakeAsync(() => {
    const toast: ToastMessage = {
      id: 1,
      message: "Bye",
      type: "info",
      duration: 100,
    };
    toastSubject.next(toast);
    expect(component.toasts).toHaveLength(1);
    tick(100);
    expect(component.toasts).toHaveLength(0);
  }));

  it("should remove toast by id via remove()", () => {
    component.toasts = [
      { id: 1, message: "A", type: "success" },
      { id: 2, message: "B", type: "error" },
    ];
    component.remove(1);
    expect(component.toasts).toHaveLength(1);
    expect(component.toasts[0].id).toBe(2);
  });
});
