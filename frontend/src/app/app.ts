import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styles: []
})
export class App implements OnInit {
  private themeService = inject(ThemeService);

  ngOnInit() {
    // Delegate theme initialization to ThemeService
    // It reads stored mode and applies it (including system/OS preference)
    this.themeService.init();
  }
}
