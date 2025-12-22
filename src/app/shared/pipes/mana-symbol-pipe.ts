import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'manaSymbol',
  standalone: true
})
export class ManaSymbolPipe implements PipeTransform {

  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';

    const formattedText = value.replace(/\{([^}]+)\}/g, (match, symbol) => {
      let key = symbol.toLowerCase();

      const exceptions: { [key: string]: string } = {
        't': 'tap',
        'q': 'untap',
        's': 'snow'
      };

      if (exceptions[key]) {
        key = exceptions[key];
      }

      return `<i class="ms ms-${key} ms-cost text-xs!"></i>`;
    });

    return this.sanitizer.bypassSecurityTrustHtml(formattedText);
  }
}