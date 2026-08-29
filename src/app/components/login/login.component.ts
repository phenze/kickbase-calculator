import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
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
export class LoginComponent {
  @Output() login = new EventEmitter<LoginPayload>();
  @Input() doLogin: boolean = false;

  public username = '';
  public password = '';

  loginPrivate() {
    this.login.emit({
      username: this.username,
      password: this.password,
    });
  }
}
