import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-help',
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class HelpComponent implements OnInit {
  public showHelp = false;

  constructor() {}

  ngOnInit(): void {}

  public isHelpExpanded: boolean = false;
}
