import { inject } from "@angular/core";
import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { catchError, throwError } from "rxjs";
import { AuthService } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Clone the request and add the authorization header if token exists
  const authReq = token
    ? req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      })
    : req;

  // Handle the request and catch any errors
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't logout on 401 if this is a login request (let component handle it)
      const isLoginRequest = req.url.includes("/auth/login");

      if (error.status === 401 && !isLoginRequest) {
        // Unauthorized - logout and redirect to login
        authService.logout();
      }
      return throwError(() => error);
    })
  );
};
