import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {


  @Output() loginWithoutAPI = new EventEmitter();
  @Output() login = new EventEmitter();
  @Input() doLogin: boolean = false;


  public username = '';
  public password = '';

  public isAdminMode: boolean = false;

  constructor(private route: ActivatedRoute) {
    this.isAdminMode = true;
  }

  ngOnInit(): void {
  }

  loginPrivate() {
    this.login.emit({
      username: this.username,
      password: this.password
    });
  }



}
