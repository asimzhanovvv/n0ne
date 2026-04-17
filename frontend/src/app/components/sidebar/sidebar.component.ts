import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Chat } from '../../models';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  chatService = inject(ChatService);
  auth = inject(AuthService);
  router = inject(Router);

  chats = signal<Chat[]>([]);
  loading = signal(false);
  collapsed = signal(false);

  ngOnInit() {
    this.loadChats();
    this.chatService.chatListRefresh.subscribe(() => this.loadChats());
  }

  toggleSidebar() {
    this.collapsed.set(!this.collapsed());
  }

  loadChats() {
    this.chatService.getChats().subscribe({
      next: (c) => this.chats.set(c),
      error: () => {}
    });
  }

  createNewChat() {
    this.router.navigate(['/chat']);
  }

  deleteChat(event: Event, id: number) {
    event.stopPropagation();
    event.preventDefault();
    this.chatService.deleteChat(id).subscribe({
      next: () => {
        this.loadChats();
        this.router.navigate(['/chat']);
      },
      error: () => {}
    });
  }
}
