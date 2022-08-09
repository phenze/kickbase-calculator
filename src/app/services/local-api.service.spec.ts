import { TestBed } from '@angular/core/testing';

import { LocalApiService } from './local-api.service';

describe('LocalApiService', () => {
  let service: LocalApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LocalApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
