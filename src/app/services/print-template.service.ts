import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "@environments/environment";
import { PrintTemplate } from "../models";

@Injectable({
  providedIn: "root",
})
export class PrintTemplateService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/templates`;

  /** Inserted by Angular inject() migration for backwards compatibility */
  constructor(...args: unknown[]);

  constructor() {}

  getTemplates(): Observable<PrintTemplate[]> {
    return this.http.get<PrintTemplate[]>(this.apiUrl);
  }

  getDefaultTemplate(): Observable<PrintTemplate> {
    return this.http.get<PrintTemplate>(`${this.apiUrl}/default`);
  }

  getTemplate(id: string): Observable<PrintTemplate> {
    return this.http.get<PrintTemplate>(`${this.apiUrl}/${id}`);
  }

  createTemplate(template: Partial<PrintTemplate>): Observable<PrintTemplate> {
    return this.http.post<PrintTemplate>(this.apiUrl, template);
  }

  updateTemplate(
    id: string,
    template: Partial<PrintTemplate>
  ): Observable<PrintTemplate> {
    return this.http.put<PrintTemplate>(`${this.apiUrl}/${id}`, template);
  }

  deleteTemplate(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
