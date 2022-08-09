import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerItemComponent } from './player-item.component';

describe('PlayerItemComponent', () => {
  let component: PlayerItemComponent;
  let fixture: ComponentFixture<PlayerItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlayerItemComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
