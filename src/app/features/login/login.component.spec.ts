import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { LoginComponent, LoginPayload } from './login.component';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const field = (id: string): HTMLInputElement => fixture.nativeElement.querySelector(`#${id}`);
  const submit = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sollte erstellt werden', () => {
    expect(component).toBeTruthy();
  });

  it('sollte die Eingaben in die Felder uebernehmen', fakeAsync(() => {
    type(field('exampleInputEmail1'), 'trainer@example.com');
    type(field('exampleInputPassword1'), 'geheim');
    tick();

    expect(component.username).toBe('trainer@example.com');
    expect(component.password).toBe('geheim');
  }));

  it('sollte beim Klick die eingegebenen Zugangsdaten melden', fakeAsync(() => {
    let payload: LoginPayload | undefined;
    component.login.subscribe((value) => (payload = value));

    type(field('exampleInputEmail1'), 'trainer@example.com');
    type(field('exampleInputPassword1'), 'geheim');
    tick();

    submit().click();

    expect(payload).toEqual({ username: 'trainer@example.com', password: 'geheim' });
  }));

  it('sollte waehrend des Logins einen Spinner statt der Beschriftung zeigen', () => {
    expect(submit().textContent?.trim()).toBe('Login');

    fixture.componentRef.setInput('doLogin', true);
    fixture.detectChanges();

    expect(submit().querySelector('.spinner-border')).toBeTruthy();
    expect(submit().textContent).toContain('Loading...');
  });
});
