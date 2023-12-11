import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-anniversify-report',
  templateUrl: './anniversify-report.component.html',
  styleUrl: './anniversify-report.component.css'
})
export class AnniversifyReportComponent implements OnInit {
  date: string
  numReleases: number
  playlistId: string

  constructor(public router: Router, public route: ActivatedRoute) {

  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.date = params['date']
      this.numReleases = params['numReleases']
      this.playlistId = params['playlistId']
    });
  }
}
