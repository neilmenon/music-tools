import { NgModule, isDevMode } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { HomeComponent } from './components/home/home.component';
import { MatButtonModule } from '@angular/material/button';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpRequestIncerceptorService } from './services/http-request-incerceptor.service';

import { MatChipsModule } from '@angular/material/chips';
import { ConnectSpotifyComponent } from './components/connect-spotify/connect-spotify.component';
import { SpotifyAlbumSortComponent } from './components/spotify-album-sort/spotify-album-sort.component';
import { AlbumSortPipe } from './pipes/album-sort.pipe';
import { MatIconModule } from '@angular/material/icon';
import { PluralizePipe } from './pipes/pluralize.pipe';
import { MatTooltipModule } from '@angular/material/tooltip';



@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ConnectSpotifyComponent,
    SpotifyAlbumSortComponent,
    AlbumSortPipe,
    PluralizePipe
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NoopAnimationsModule,
    MatButtonModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: !isDevMode(),
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: !isDevMode() ? 'registerImmediately': 'registerWhenStable:30000'
    }),
    HttpClientModule,
    MatSnackBarModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: HttpRequestIncerceptorService, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
