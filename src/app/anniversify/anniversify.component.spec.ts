import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnniversifyComponent } from './anniversify.component';

describe('AnniversifyComponent', () => {
  let component: AnniversifyComponent;
  let fixture: ComponentFixture<AnniversifyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AnniversifyComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AnniversifyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
