import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  transform(value: string | undefined): string {
    if (!value) return '';
    try {
      // Parse markdown to HTML
      const rawHtml = marked.parse(value, { breaks: true }) as string;
      // Sanitize the HTML to prevent XSS
      return DOMPurify.sanitize(rawHtml);
    } catch (e) {
      return value;
    }
  }
}
