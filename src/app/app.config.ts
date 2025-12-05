import { ApplicationConfig, APP_INITIALIZER } from "@angular/core";
import { provideRouter } from "@angular/router";
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { routes } from "./app.routes";
import { authInterceptor } from "./interceptors/auth.interceptor";
import { AppInitService } from "./services/app-init.service";

export function initializeApp(appInitService: AppInitService) {
  return () => appInitService.initializeApp();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AppInitService],
      multi: true,
    },
  ],
};
