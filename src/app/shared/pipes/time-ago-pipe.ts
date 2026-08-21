import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {

  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `Há ${minutes}min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Há ${hours}h`;

    const days = Math.floor(hours / 24);
    return `Há ${days}d`;
  }
}
