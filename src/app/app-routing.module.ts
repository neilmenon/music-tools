import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SpotifyAlbumSortComponent } from './components/spotify-album-sort/spotify-album-sort.component';
import { AnniversifyComponent } from './anniversify/anniversify.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { 
    path: 'spotify-album-sort', component: SpotifyAlbumSortComponent,
    data: {
      title: 'Spotify Library Album Sort',
      description: 'Provides some more ways to sort albums in your Spotify library.',
    }
  },
  { 
    path: 'anniversify', component: AnniversifyComponent,
    data: {
      title: 'Spotify Library Album Sort',
      description: 'Notifies you when an album in your Spotify Library has an anniversary.',
    }
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
