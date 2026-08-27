import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { ApiService } from './api.service';
import { ErrorService } from './error.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;
  let errorServiceSpy: jasmine.SpyObj<ErrorService>;

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['getToken', 'refreshToken', 'logout']);
    errorServiceSpy = jasmine.createSpyObj('ErrorService', ['showError']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: apiServiceSpy },
        { provide: ErrorService, useValue: errorServiceSpy },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sollte den Authorization-Header mitsenden, wenn ein Token vorhanden ist', () => {
    apiServiceSpy.getToken.and.returnValue('fake-jwt-token');

    http.get('/v4/leagues').subscribe();

    const req = httpMock.expectOne('/v4/leagues');
    expect(req.request.headers.get('Authorization')).toBe('Bearer fake-jwt-token');
  });

  it('sollte bei 401/403 auf normale Endpunkte einen Token-Refresh ausführen und den Request wiederholen', () => {
    apiServiceSpy.getToken.and.returnValue('old-token');
    apiServiceSpy.refreshToken.and.returnValue(of('new-token'));

    http.get('/v4/leagues').subscribe();

    // 1. Erstaufruf schlägt mit 403 fehl
    const firstReq = httpMock.expectOne('/v4/leagues');
    firstReq.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(apiServiceSpy.refreshToken).toHaveBeenCalled();

    // 2. Erneuter Aufruf mit neuem Token
    const retryReq = httpMock.expectOne('/v4/leagues');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
  });

  it('sollte ausloggen und ein Error-Banner anzeigen, wenn der Refresh fehlschlägt', () => {
    apiServiceSpy.getToken.and.returnValue('old-token');
    apiServiceSpy.refreshToken.and.returnValue(throwError(() => new Error('Refresh Failed')));

    http.get('/v4/leagues').subscribe({
      error: () => {
        expect(apiServiceSpy.logout).toHaveBeenCalled();
        expect(errorServiceSpy.showError).toHaveBeenCalledWith(
          'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
        );
      },
    });

    const firstReq = httpMock.expectOne('/v4/leagues');
    firstReq.flush({}, { status: 401, statusText: 'Unauthorized' });
  });

  it('sollte bei 401 auf Auth-Endpunkten (Login/Token) direkt ausloggen ohne Refresh-Versuch', () => {
    apiServiceSpy.getToken.and.returnValue('old-token');

    http.post('/v4/user/login', {}).subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      },
    });

    const req = httpMock.expectOne('/v4/user/login');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    // Prüfungen synchron nach dem flush ausführen
    expect(apiServiceSpy.refreshToken).not.toHaveBeenCalled();
    expect(apiServiceSpy.logout).toHaveBeenCalled();
  });
});
