import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
    selector: 'app-help',
    templateUrl: './help.component.html',
    styleUrls: ['./help.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class HelpComponent implements OnInit {


  @Input() withoutApi: boolean;
  public showHelp = false;

  constructor() { }

  ngOnInit(): void {
  }

}
