import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { marked } from 'marked';
import { Observable, map } from 'rxjs';

/** Raw-URL der CHANGELOG.md im GitHub-Repository. */
const CHANGELOG_URL =
  'https://raw.githubusercontent.com/phenze/kickbase-calculator/main/CHANGELOG.md';

@Injectable({
  providedIn: 'root',
})
export class ChangelogService {
  private readonly http = inject(HttpClient);

  /** Laedt die CHANGELOG.md und gibt sie als gerendertes HTML zurueck. */
  loadAsHtml(): Observable<string> {
    return this.http
      .get(CHANGELOG_URL, { responseType: 'text' })
      .pipe(map((markdown) => marked.parse(markdown) as string));
  }
}
