import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
    selector: 'app-modal',
    templateUrl: './modal.component.html',
    styleUrls: ['./modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true
})
export class ModalComponent implements OnInit {

  title = '';
  closeBtnName = '';
  list: any[] = [];

  constructor(public bsModalRef: BsModalRef) { }

  ngOnInit() {
  }

}
