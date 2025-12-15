import { Pipe, PipeTransform, ChangeDetectorRef, inject } from "@angular/core";
import { TranslationService } from "../services/translation.service";

@Pipe({
  name: "translate",
  pure: false,
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  private t = inject(TranslationService);
  private cdr = inject(ChangeDetectorRef);

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {
    // When translations change (loaded or language switched), mark for check
    this.t.translationsChanged$.subscribe(() => {
      try {
        this.cdr.markForCheck();
      } catch (e) {
        // ignore errors during markForCheck
      }
    });
  }

  transform(key: string, params?: Record<string, any>): string {
    return this.t.translate(key, params);
  }
}
