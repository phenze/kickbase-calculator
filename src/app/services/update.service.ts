import { Injectable, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private swUpdate = inject(SwUpdate);

  // Wandelt den Stream direkt in ein Signal um
  readonly versionEvent = toSignal(this.swUpdate.versionUpdates);

  // Computed Signal prüft, ob ein Update bereitsteht
  readonly isUpdateAvailable = computed(() => {
    const event = this.versionEvent();
    return event?.type === 'VERSION_READY';
  });

  reloadPage(): void {
    document.location.reload();
  }
}
