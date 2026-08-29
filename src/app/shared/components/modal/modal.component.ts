import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
})
export class ModalComponent {
  title = '';
  closeBtnName = '';
  list: any[] = [];

  public readonly bsModalRef = inject(BsModalRef);
}
