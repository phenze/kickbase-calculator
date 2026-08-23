import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface LoginPayload {
  username: string;
  password: string;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [FormsModule],
})
export class LoginComponent implements OnInit {
  @Output() login = new EventEmitter<LoginPayload>();
  @Input() doLogin: boolean = false;

  public username = '';
  public password = '';

  public isAdminMode: boolean = false;

  constructor() {
    this.isAdminMode = true;
  }

  ngOnInit(): void {}

  loginPrivate() {
    this.login.emit({
      username: this.username,
      password: this.password,
    });
  }
}
