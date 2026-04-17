import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  isRegister = signal(false);
  loading = signal(false);
  errorMsg = signal('');

  // Form data
  username = ''; 
  password = '';
  password2 = '';
  email = '';

  // UI state
  showPassword = signal(false);
  showPassword2 = signal(false);
  isDarkTheme = signal(true);

  toggleMode() {
    this.isRegister.set(!this.isRegister());
    this.errorMsg.set('');
    this.username = '';
    this.email = '';
    this.password = '';
    this.password2 = '';
  }

  toggleTheme() {
    this.isDarkTheme.set(!this.isDarkTheme());
    document.documentElement.setAttribute('data-theme', this.isDarkTheme() ? 'dark' : 'light');
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    this.loading.set(true);
    this.errorMsg.set('');

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email)) {
      this.errorMsg.set('Please enter a valid email address.');
      this.loading.set(false);
      return;
    }

    if (this.isRegister()) {
      if (!this.email || !this.username || !this.password) {
        this.errorMsg.set('Please fill in all fields.');
        this.loading.set(false);
        return;
      }
      if (this.password.length < 6) {
        this.errorMsg.set('Password must be at least 6 characters.');
        this.loading.set(false);
        return;
      }
      if (!/[A-Z]/.test(this.password) || !/[a-z]/.test(this.password) || !/[0-9]/.test(this.password)) {
        this.errorMsg.set('Password must include uppercase, lowercase, and numeric characters.');
        this.loading.set(false);
        return;
      }
      if (this.password !== this.password2) {
        this.errorMsg.set('Passwords do not match.');
        this.loading.set(false);
        return;
      }

      this.authService.register({
        username: this.username,
        email: this.email,
        password: this.password,
        password2: this.password2
      }).subscribe({
        next: () => this.router.navigate(['/chat']),
        error: (err: any) => {
          this.errorMsg.set(err.error?.email?.[0] || err.message);
          this.loading.set(false);
        }
      });
    } else {
      this.authService.login({
        email: this.email,
        password: this.password
      }).subscribe({
        next: () => this.router.navigate(['/chat']),
        error: (err: Error) => {
          this.errorMsg.set(err.message);
          this.loading.set(false);
        }
      });
    }
  }
}
