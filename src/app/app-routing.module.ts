import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SpotifyAlbumSortComponent } from './components/spotify-album-sort/spotify-album-sort.component';
import { AnniversifyComponent } from './anniversify/anniversify.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'spotify-album-sort', component: SpotifyAlbumSortComponent },
  { path: 'anniversify', component: AnniversifyComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
