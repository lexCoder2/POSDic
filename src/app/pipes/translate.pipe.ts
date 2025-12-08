import { Pipe, PipeTransform, ChangeDetectorRef } from "@angular/core";
import { TranslationService } from "../services/translation.service";

@Pipe({
  name: "translate",
  pure: false,
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  constructor(
    private t: TranslationService,
    private cdr: ChangeDetectorRef
  ) {
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
