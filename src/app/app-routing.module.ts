import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { SpotifyAlbumSortComponent } from './components/spotify-album-sort/spotify-album-sort.component';
import { AnniversifyComponent } from './components/anniversify/anniversify.component';
import { AnniversifyReportComponent } from './components/anniversify/anniversify-report/anniversify-report.component';

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
  { 
    path: 'anniversify/report/:date/:numReleases/:playlistId', component: AnniversifyReportComponent,
    data: {
      title: 'Anniversify Report',
      description: 'Your latest report from Anniversify.',
    }
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
