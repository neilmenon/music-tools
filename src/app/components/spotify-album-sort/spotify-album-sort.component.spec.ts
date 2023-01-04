import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpotifyAlbumSortComponent } from './spotify-album-sort.component';

describe('SpotifyAlbumSortComponent', () => {
  let component: SpotifyAlbumSortComponent;
  let fixture: ComponentFixture<SpotifyAlbumSortComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SpotifyAlbumSortComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SpotifyAlbumSortComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
