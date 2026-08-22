import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { KickbaseGroup } from 'src/app/model/kickbase-group';
import { KickbasePlayer } from 'src/app/model/kickbase-player';
import { ApiService } from 'src/app/services/api.service';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
    selector: 'app-player-item',
    templateUrl: './player-item.component.html',
    styleUrls: ['./player-item.component.scss'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: true,
    imports: [FormsModule, AngularSvgIconModule]
})
export class PlayerItemComponent implements OnInit {

  @Input({ required: true }) player!: KickbasePlayer;
  @Input({ required: true }) printMode!: boolean;
  @Input() isMarketOverview = false;
  @Input() achievementsDisabled = false;



  @Output() removePlayer = new EventEmitter();
  @Output() loadDetails = new EventEmitter();

  @Output() playerChanged = new EventEmitter();
  constructor(public apiService: ApiService) { }

  ngOnInit(): void {
  }

  onLoadAllDetailsForPlayer = async () => {
    this.loadDetails.emit();
  }

  onRemovePlayer() {
    this.removePlayer.emit();
  }

  errorHandler(event: Event) {
    console.debug(event);
    const target = event.target as HTMLImageElement | null;
    if (target !== null) {
      target.src = "https://cdn.browshot.com/static/images/not-found.png";
    }
  }


  onSetPlayerPermanentDeleted(event: MouseEvent, player: KickbasePlayer, deleted: boolean) {
    event.stopImmediatePropagation();
    event.preventDefault();
    player.isFixedSquad = deleted;
    this.apiService.setPlayerPermanentDeleted(player.leagueId, player.id, deleted);
    this.playerChanged.emit()
  }

}
