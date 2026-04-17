import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, forkJoin } from 'rxjs';
import { ChatService } from '../../services/chat.service';
import { OpenRouterService } from '../../services/openrouter.service';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { MarkdownPipe } from '../../pipes/markdown.pipe';
import { Message } from '../../models';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent, MarkdownPipe],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnDestroy {
  route = inject(ActivatedRoute);
  router = inject(Router);
  chatService = inject(ChatService);
  ai = inject(OpenRouterService);
  auth = inject(AuthService);
  i18n = inject(TranslationService);

  currentChatId = signal<number | null>(null);
  messages = signal<Message[]>([]);
  isTyping = signal(false);
  userInput = '';
  selectedModel = 'n0ne';
  selectedThink = 'Medium';

  attachedImages: string[] = [];

  showModelDropdown = false;
  showThinkDropdown = false;
  
  private thinkIcons: Record<string, string> = {
    'High': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 92 92" fill="currentColor"><path d="M46 23.7c-12.3 0-22.3 10-22.3 22.3s10 22.3 22.3 22.3 22.3-10 22.3-22.3-10-22.3-22.3-22.3zm0 36.6c-7.9 0-14.3-6.4-14.3-14.3S38.1 31.7 46 31.7 60.3 38.1 60.3 46 53.9 60.3 46 60.3zm-4-48V4c0-2.2 1.8-4 4-4s4 1.8 4 4v8.3c0 2.2-1.8 4-4 4s-4-1.8-4-4zM92 46c0 2.2-1.8 4-4 4h-8.3c-2.2 0-4-1.8-4-4s1.8-4 4-4H88c2.2 0 4 1.8 4 4zM50 79.7V88c0 2.2-1.8 4-4 4s-4-1.8-4-4v-8.3c0-2.2 1.8-4 4-4s4 1.8 4 4zM12.3 50H4c-2.2 0-4-1.8-4-4s1.8-4 4-4h8.3c2.2 0 4 1.8 4 4s-1.8 4-4 4zM67 25c-1.6-1.6-1.6-4.1 0-5.7l5.8-5.8c1.6-1.6 4.1-1.6 5.7 0 1.6 1.6 1.6 4.1 0 5.7L72.7 25c-.8.8-1.8 1.2-2.8 1.2s-2.1-.4-2.9-1.2zm11.5 47.9c1.6 1.6 1.6 4.1 0 5.7-.8.8-1.8 1.2-2.8 1.2s-2-.4-2.8-1.2L67 72.7c-1.6-1.6-1.6-4.1 0-5.7 1.6-1.6 4.1-1.6 5.7 0l5.8 5.9zM25 67c1.6 1.6 1.6 4.1 0 5.7l-5.8 5.8c-.8.8-1.8 1.2-2.8 1.2s-2-.4-2.8-1.2c-1.6-1.6-1.6-4.1 0-5.7l5.8-5.8c1.5-1.5 4-1.5 5.6 0zM13.5 19.1c-1.6-1.6-1.6-4.1 0-5.7 1.6-1.6 4.1-1.6 5.7 0l5.8 5.8c1.6 1.6 1.6 4.1 0 5.7-.8.8-1.8 1.2-2.8 1.2-1 0-2-.4-2.8-1.2l-5.9-5.8z"></path></svg>`,
    'Medium': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18c3.308594 0 6-2.691406 6-6s-2.691406-6-6-6-6 2.691406-6 6S8.691406 18 12 18zM12 8c2.205566 0 4 1.794434 4 4s-1.794434 4-4 4-4-1.794434-4-4S9.794434 8 12 8zM13 4V3c0-.552246-.447754-1-1-1s-1 .447754-1 1v1c0 .552246.447754 1 1 1S13 4.552246 13 4zM18.36377 7.050293l.707031-.707031c.390625-.390625.390625-1.023438 0-1.414062s-1.023438-.390625-1.414062 0L16.949707 5.63623c-.390625.390625-.390625 1.023438 0 1.414062.195312.195312.451172.292969.707031.292969S18.168457 7.245605 18.36377 7.050293zM20 11c-.552246 0-1 .447754-1 1s.447754 1 1 1h1c.552246 0 1-.447754 1-1s-.447754-1-1-1H20zM18.36377 19.36377c.255859 0 .511719-.097656.707031-.292969.390625-.390625.390625-1.023438 0-1.414062l-.707031-.707031c-.390625-.390625-1.023438-.390625-1.414062 0s-.390625 1.023438 0 1.414062l.707031.707031C17.852051 19.266113 18.10791 19.36377 18.36377 19.36377zM12 22c.552246 0 1-.447754 1-1v-1c0-.552246-.447754-1-1-1s-1 .447754-1 1v1C11 21.552246 11.447754 22 12 22zM4.929199 19.070801c.195312.195312.451172.292969.707031.292969s.511719-.097656.707031-.292969l.707031-.707031c.390625-.390625.390625-1.023438 0-1.414062s-1.023438-.390625-1.414062 0l-.707031.707031C4.538574 18.047363 4.538574 18.680176 4.929199 19.070801zM3 13h1c.552246 0 1-.447754 1-1s-.447754-1-1-1H3c-.552246 0-1 .447754-1 1S2.447754 13 3 13zM7.050293 7.050293c.390625-.390625.390625-1.023438 0-1.414062L6.343262 4.929199c-.390625-.390625-1.023438-.390625-1.414062 0s-.390625 1.023438 0 1.414062L5.63623 7.050293c.195312.195312.451172.292969.707031.292969S6.85498 7.245605 7.050293 7.050293z"></path></svg>`,
    'Low': `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18 12c0-3.308594-2.691406-6-6-6s-6 2.691406-6 6 2.691406 6 6 6S18 15.308594 18 12zM12 16c-2.205566 0-4-1.794434-4-4s1.794434-4 4-4 4 1.794434 4 4S14.205566 16 12 16zM11.290039 4.709961C11.389648 4.799805 11.5 4.869629 11.619629 4.919922 11.739746 4.97998 11.869629 5 12 5c.259766 0 .52002-.110352.709961-.290039C12.889648 4.52002 13 4.259766 13 4c0-.130371-.02002-.260254-.080078-.380371C12.869629 3.5 12.799805 3.389648 12.709961 3.290039c-.290039-.280273-.720215-.370117-1.090332-.210449C11.5 3.129883 11.389648 3.199707 11.290039 3.290039 11.199707 3.389648 11.129883 3.5 11.07959 3.619629 11.029785 3.739746 11 3.869629 11 4 11 4.259766 11.109863 4.52002 11.290039 4.709961zM17.27002 7.27002c.05957.02002.129883.040039.189941.049805.069824.02002.129883.02002.199707.02002.260254 0 .52002-.100098.700195-.290039.189941-.180176.299805-.439941.299805-.709961 0-.060059-.009766-.129883-.02002-.189941C18.629883 6.07959 18.609863 6.02002 18.57959 5.959961c-.019531-.060059-.05957-.120117-.089844-.169922-.040039-.060059-.080078-.110352-.129883-.150391-.359863-.379883-1.040039-.379883-1.410156 0-.189941.180176-.290039.439941-.290039.700195 0 .27002.100098.529785.290039.709961C17 7.099609 17.049805 7.139648 17.099609 7.179688 17.159668 7.209961 17.209961 7.239746 17.27002 7.27002zM20.919922 11.619629c-.050293-.119629-.120117-.22998-.209961-.32959-.100098-.090332-.200195-.160156-.330078-.210449-.240234-.099609-.52002-.099609-.760254 0-.119629.050293-.22998.120117-.32959.210449-.090332.099609-.160156.209961-.210449.32959C19.029785 11.739746 19 11.869629 19 12c0 .129883.029785.259766.07959.379883.050293.129883.120117.22998.210449.330078.099609.089844.209961.159668.32959.209961C19.739746 12.969727 19.869629 13 20 13c.129883 0 .259766-.030273.379883-.080078.129883-.050293.22998-.120117.330078-.209961.089844-.090332.159668-.200195.209961-.330078C20.969727 12.259766 21 12.129883 21 12 21 11.869629 20.969727 11.739746 20.919922 11.619629zM16.949707 18.359863C17 18.409668 17.049805 18.449707 17.099609 18.489746c.060059.030273.110352.070312.17041.089844.05957.030273.129883.050293.189941.060059.069824.010254.129883.02002.199707.02002.060059 0 .130371-.009766.189941-.02002.070312-.009766.130371-.029785.19043-.060059.05957-.019531.119629-.05957.169922-.089844.060059-.040039.109863-.080078.149902-.129883.100098-.089844.169922-.200195.219727-.319824.050293-.120117.080078-.25.080078-.380371 0-.129883-.029785-.259766-.080078-.389648-.049805-.120117-.119629-.22998-.219727-.320312-.22998-.22998-.569824-.339844-.899902-.27002-.060059.010254-.130371.030273-.189941.050293-.060059-.029785-.110352-.060059-.17041.099609C17.049805 16.859863 17 16.899902 16.949707 16.949707c-.089844.090332-.169922.200195-.219727.320312-.050293.129883-.070312.259766-.070312.389648 0 .130371.02002.260254.070312.380371C16.779785 18.159668 16.859863 18.27002 16.949707 18.359863zM11.619629 19.07959c-.119629.050293-.22998.120117-.32959.210449-.090332.099609-.160156.209961-.210449.32959C11.029785 19.739746 11 19.869629 11 20c0 .259766.109863.52002.290039.709961.099609.089844.209961.159668.32959.209961C11.739746 20.97998 11.869629 21 12 21c.259766 0 .52002-.110352.709961-.290039C12.889648 20.52002 13 20.259766 13 20c0-.130371-.02002-.260254-.080078-.380371-.050293-.119629-.120117-.22998-.209961-.32959C12.419922 19.009766 11.989746 18.919922 11.619629 19.07959zM5.419922 18.040039c.049805.119629.120117.22998.219727.32959.040039.040039.090332.080078.150391.120117.049805.030273.109863.070312.169922.089844.060059.030273.119629.050293.189941.060059.060059.010254.129883.02002.189941.02002.129883 0 .259766-.029785.390137-.080078.119629-.049805.22998-.119629.319824-.209961.089844-.099609.169922-.209961.220215-.32959.049805-.120117.069824-.25.069824-.380371 0-.27002-.100098-.52002-.290039-.709961-.089844-.089844-.200195-.169922-.319824-.219727-.189941-.070312-.390137-.090332-.580078-.050293C6.07959 16.689941 6.02002 16.709961 5.959961 16.72998c-.060059.029785-.120117.060059-.169922.099609-.060059.030273-.110352.070312-.150391.120117-.189941.189941-.299805.439941-.299805.709961C5.339844 17.790039 5.369629 17.919922 5.419922 18.040039zM3.07959 12.379883C3.099609 12.439941 3.129883 12.5 3.169922 12.560059 3.209961 12.609863 3.25 12.659668 3.290039 12.709961 3.47998 12.889648 3.739746 13 4 13c.129883 0 .259766-.030273.379883-.080078.129883-.050293.22998-.120117.330078-.209961C4.889648 12.52002 5 12.27002 5 12c0-.260254-.110352-.52002-.290039-.709961-.100098-.090332-.200195-.160156-.330078-.210449-.359863-.159668-.810059-.069824-1.089844.210449C3.109863 11.47998 3 11.739746 3 12c0 .069824.009766.129883.02002.199707C3.029785 12.259766 3.049805 12.319824 3.07959 12.379883zM5.509766 6.899902C5.549805 6.949707 5.589844 7 5.639648 7.049805 5.819824 7.239746 6.07959 7.339844 6.339844 7.339844c.140137 0 .259766-.02002.390137-.069824.119629-.050293.22998-.130371.319824-.220215.189941-.180176.290039-.439941.290039-.709961 0-.129883-.02002-.260254-.069824-.379883C7.219727 5.839844 7.139648 5.72998 7.049805 5.639648 6.959961 5.540039 6.849609 5.469727 6.72998 5.419922 6.359863 5.27002 5.909668 5.359863 5.639648 5.639648 5.540039 5.72998 5.469727 5.839844 5.419922 5.959961c-.050293.119629-.080078.25-.080078.379883 0 .069824.009766.140137.02002.200195.02002.05957.040039.129883.060059.189941C5.449707 6.790039 5.47998 6.839844 5.509766 6.899902z"></path></svg>`
  };

  getThinkIcon(level: string): string {
    return this.thinkIcons[level] || this.thinkIcons['Medium'];
  }

  modelSearch = '';

  thinkOptions = ['Low', 'Medium', 'High'];

  private routeSub?: Subscription;
  private chatEvtSub?: Subscription;
  private chatErrSub?: Subscription;

  get filteredModels() {
    const q = this.modelSearch.toLowerCase();
    return this.ai.availableModels.filter(m =>
      m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    );
  }

  get selectedModelName() {
    return this.ai.availableModels.find(m => m.id === this.selectedModel)?.name || this.selectedModel;
  }

  get isVisionSupported() {
    const m = this.ai.availableModels.find(m => m.id === this.selectedModel);
    return m?.vision === true;
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.attachedImages.push(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  removeAttachedImage(index: number) {
    this.attachedImages.splice(index, 1);
  }

  ngOnInit() {
    this.chatService.refreshSettings();

    this.routeSub = this.route.params.subscribe(params => {
      this.messages.set([]);
      this.isTyping.set(false);

      const id = params['id'];
      if (id) {
        const numId = Number(id);
        if (!Number.isFinite(numId) || numId <= 0) {
          this.router.navigate(['/chat'], { replaceUrl: true });
          return;
        }
        this.currentChatId.set(numId);
        this.loadMessages(numId);
      } else {
        this.currentChatId.set(null);
      }
    });

    this.chatEvtSub = this.chatService.newMessageEvent.subscribe(evt => {
      if (this.currentChatId() === evt.chatId) {
        this.messages.update(m => [...m, evt.message]);
        this.isTyping.set(this.chatService.activeGenerations.has(evt.chatId));
        this.scrollToBottom();
      }
    });

    this.chatErrSub = this.chatService.errorEvent.subscribe(evt => {
      if (this.currentChatId() === evt.chatId) {
        this.messages.update(m => [...m, { role: 'assistant', content: `⚠ Error: ${evt.error}` }]);
        this.isTyping.set(this.chatService.activeGenerations.has(evt.chatId));
        this.scrollToBottom();
      }
    });
  }

  ngOnDestroy() {
    this.routeSub?.unsubscribe();
    this.chatEvtSub?.unsubscribe();
    this.chatErrSub?.unsubscribe();
  }

  loadMessages(id: number) {
    forkJoin({
      chat: this.chatService.getChat(id),
      messages: this.chatService.getMessages(id)
    }).subscribe({
      next: ({ chat, messages }) => {
        this.selectedModel = chat.model;
        this.selectedThink = localStorage.getItem(`chat_think_${id}`) ?? 'Medium';
        this.messages.set(messages);
        this.isTyping.set(this.chatService.activeGenerations.has(id));
        this.scrollToBottom();
      },
      error: () => {
        this.currentChatId.set(null);
        this.router.navigate(['/chat'], { replaceUrl: true, state: { pendingToast: 'Chat not found or you don\'t have access to it.' } });
      }
    });
  }

  handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }

  sendMessage() {
    const text = this.userInput.trim();
    if ((!text && this.attachedImages.length === 0) || this.isTyping()) return;
    this.userInput = '';
    const images = [...this.attachedImages];
    this.attachedImages = [];

    if (!this.currentChatId()) {
      const title = text.substring(0, 40) || 'Image Chat';
      this.chatService.createChat(title, this.selectedModel).subscribe({
        next: (chat) => {
          this.currentChatId.set(chat.id);
          localStorage.setItem(`chat_think_${chat.id}`, this.selectedThink);
          this.performSend(text, chat.id, images);
          this.router.navigate(['/chat', chat.id]);
          this.chatService.chatListRefresh.next();
        },
        error: () => {}
      });
    } else {
      this.performSend(text, this.currentChatId()!, images);
    }
  }

  private performSend(text: string, chatId: number, images: string[]) {
    const userMsg: Message = { role: 'user', content: text, images };
    this.messages.update(m => [...m, userMsg]);
    this.scrollToBottom();
    this.chatService.saveMessage(chatId, userMsg).subscribe({ error: () => {} });

    this.chatService.activeGenerations.add(chatId);
    if (this.currentChatId() === chatId) {
      this.isTyping.set(true);
    }

    const resolvedModelId = this.ai.resolveModelId(this.selectedModel, this.selectedThink);
    this.chatService.requestCompletion(chatId, this.messages(), resolvedModelId);
  }

  quickMsg(text: string) {
    this.userInput = text;
    this.sendMessage();
  }

  selectModel(id: string) {
    this.selectedModel = id;
    this.showModelDropdown = false;
    this.modelSearch = '';
    if (this.currentChatId()) {
      this.chatService.updateChat(this.currentChatId()!, { model: id }).subscribe({ error: () => {} });
    }
  }

  selectThink(opt: string) {
    this.selectedThink = opt;
    this.showThinkDropdown = false;
    if (this.currentChatId()) {
      localStorage.setItem(`chat_think_${this.currentChatId()}`, opt);
    }
  }

  closeDropdowns() {
    this.showModelDropdown = false;
    this.showThinkDropdown = false;
  }

  private scrollToBottom() {
    setTimeout(() => {
      const el = document.querySelector('.messages-scroll');
      if (el) el.scrollTop = el.scrollHeight;
    }, 80);
  }

  getAvatarInitial() {
    const s = this.chatService.userSettings();
    const ds = s?.display_name;
    if (ds && ds.trim().length > 0) return ds.trim().charAt(0).toUpperCase();
    const uname = this.auth.currentUser()?.username;
    if (uname && uname.trim().length > 0) return uname.trim().charAt(0).toUpperCase();
    return 'U';
  }

  getIconPath(name: string): string {
    const paths: Record<string, string> = {
      bot: 'M12 8V4m0 0H8m4 0h4m-4 12v4m0 0H8m4 0h4M4 11h16M4 11a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5Z',
      brain: 'M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.73-2.73 2.5 2.5 0 0 1-3.47-3.47 2.5 2.5 0 0 1 2.3-4.14 2.5 2.5 0 0 1 6.36-7.6ZM14.5 2A2.5 2.5 0 1 0 12 4.5v15a2.5 2.5 0 1 0 5-4 2.5 2.5 0 1 0-1-5 2.5 2.5 0 1 0-4-6Z',
      sparkles: 'M12 3 L12.5 8 L17 8.5 L12.5 9 L12 14 L11.5 9 L7 8.5 L11.5 8 Z M5 3 L5.5 5 L7.5 5.5 L5.5 6 L5 8 L4.5 6 L2.5 5.5 L4.5 5 Z M19 16 L19.5 18 L21.5 18.5 L19.5 19 L19 21 L18.5 19 L16.5 18.5 L18.5 18 Z',
      zap: 'M13 2 L3 14 H12 L11 22 L21 10 H12 L13 2 Z',
      cpu: 'M4 4h16v16H4V4ZM9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3M9 9h6v6H9V9Z',
      terminal: 'm4 17 6-6-6-6M12 19h8',
      code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
      command: 'M18 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM6 3a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM18 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM6 15a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3ZM9 6h6M9 18h6M6 9v6M18 9v6',
      activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
      globe: 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2ZM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z',
      lightbulb: 'M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .5 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5m9 18h6m10 22h4',
      star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
      shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
      lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11Z',
      user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'
    };
    return paths[name] || '';
  }
}
