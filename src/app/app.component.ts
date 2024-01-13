import { ApplicationRef, Component } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { MessageService } from './services/message.service';
import { concat, first, interval, takeWhile } from 'rxjs';
import { config } from './config/config';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'music-tools';
  isStandalone: boolean = (navigator as any)?.standalone
  isIOSSafari = this.getIOSSafari()
  isMobile = this.getIsMobile()
  updateFound: boolean

  constructor(
    private swUpdate: SwUpdate,
    private messageService: MessageService,
    appRef: ApplicationRef
  ) {
    // Allow the app to stabilize first, before starting
    // polling for updates with `interval()`.
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true))
    const secondsInterval: number = this.isLocal ? 5 : 120
    const intervalOnceStable$ = concat(appIsStable$, interval(secondsInterval * 1000))
    intervalOnceStable$.pipe(takeWhile(() => !this.updateFound)).subscribe(async () => {
      // console.log("Checking for app updates...")
      try {
        this.updateFound = await swUpdate.checkForUpdate()
        if (this.updateFound) {
          if (this.isLocal) {
            window.location.reload()
          } else {
            this.messageService.open("New app version is available!", "center", true)
          }

        }
      } catch (err) {
        console.error('Failed to check for updates: ', err);
      }
    })
  }

  get showAddToHomescreen(): boolean {
    return config.spotify.redirectUri.includes('localhost') ? (localStorage.getItem("dismissAddToHomescreen") != "true") :
      !this.isStandalone &&
      this.isMobile &&
      localStorage.getItem("dismissAddToHomescreen") != "true"
  }

  get isLocal(): boolean {
    return config.spotify.redirectUri.includes("localhost")
  }

  getIsMobile(): boolean {
    return /iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone/i.test(navigator.userAgent);
  }

  getIOSSafari(): boolean {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    const isSafari = /^((?!Chrome|Android).)*Safari/.test(userAgent);

    return isIOS && isSafari;
  }
}