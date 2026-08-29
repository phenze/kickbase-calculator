import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ChangelogService } from './changelog.service';

describe('ChangelogService', () => {
  const changelogUrl =
    'https://raw.githubusercontent.com/phenze/kickbase-calculator/main/CHANGELOG.md';

  let service: ChangelogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ChangelogService, provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(ChangelogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sollte die CHANGELOG.md als Text anfordern', () => {
    service.loadAsHtml().subscribe();

    const request = httpMock.expectOne(changelogUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.responseType).toBe('text');

    request.flush('# Titel');
  });

  it('sollte das Markdown zu HTML rendern', () => {
    let html = '';
    service.loadAsHtml().subscribe((result) => (html = result));

    httpMock.expectOne(changelogUrl).flush('# Version 1.0\n\nEine Aenderung.');

    expect(html).toContain('<h1>Version 1.0</h1>');
    expect(html).toContain('<p>Eine Aenderung.</p>');
  });

  it('sollte einen Fehler durchreichen', () => {
    let failed = false;
    service.loadAsHtml().subscribe({ error: () => (failed = true) });

    httpMock.expectOne(changelogUrl).flush('kaputt', { status: 500, statusText: 'Server Error' });

    expect(failed).toBeTrue();
  });
});
