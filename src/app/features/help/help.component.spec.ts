import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HelpComponent } from './help.component';

describe('HelpComponent', () => {
  let component: HelpComponent;
  let fixture: ComponentFixture<HelpComponent>;

  const header = (): HTMLElement => fixture.nativeElement.querySelector('[role="button"]');
  const wrapper = (): HTMLElement => fixture.nativeElement.querySelector('.collapsible-wrapper');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HelpComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HelpComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('sollte erstellt werden', () => {
    expect(component).toBeTruthy();
  });

  it('sollte eingeklappt starten', () => {
    expect(component.isHelpExpanded).toBeFalse();
    expect(wrapper().classList).not.toContain('expanded');
    expect(header().getAttribute('aria-expanded')).toBe('false');
  });

  it('sollte per Klick auf- und wieder zuklappen', () => {
    header().click();
    fixture.detectChanges();

    expect(component.isHelpExpanded).toBeTrue();
    expect(wrapper().classList).toContain('expanded');
    expect(header().getAttribute('aria-expanded')).toBe('true');

    header().click();
    fixture.detectChanges();

    expect(component.isHelpExpanded).toBeFalse();
    expect(wrapper().classList).not.toContain('expanded');
  });
});
