import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { lucideCheck, lucideChevronDown, lucideSearch, lucideX } from '@ng-icons/lucide';
import { SetGroup, matchesSetQuery } from '../collection-sets';

/**
 * Folha de filtro por coleção.
 *
 * Não é pílula como cor e tipo porque edição não é valor fechado: a lista
 * cresce a cada importação, e quinze pílulas viram sessenta. A folha lista
 * **só o que existe na sua estante**, com busca — e é por isso que ela cabe em
 * poucos toques.
 *
 * A família vem fechada. Marcar "The Hobbit" leva o Eternal junto, que é como
 * se fala dela; quem quiser separar abre a linha e marca só o filho.
 */
@Component({
  selector: 'app-set-filter',
  standalone: true,
  imports: [NgIcon, HlmIcon],
  providers: [provideIcons({ lucideSearch, lucideCheck, lucideChevronDown, lucideX })],
  templateUrl: './set-filter.html',
  styleUrl: './set-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetFilter {
  groups = input.required<SetGroup[]>();
  selected = input.required<string[]>();

  toggled = output<string>();
  cleared = output<void>();
  closed = output<void>();

  protected query = signal('');
  protected expanded = signal<string[]>([]);

  protected visible = computed(() =>
    this.groups().filter(group => matchesSetQuery(group, this.query())),
  );

  protected isOn(code: string): boolean {
    return this.selected().includes(code.toLowerCase());
  }

  /** A família acende quando ela ou qualquer filho está marcado. */
  protected isTouched(group: SetGroup): boolean {
    return this.isOn(group.code) || group.members.some(member => this.isOn(member.code));
  }

  protected isExpanded(code: string): boolean {
    return this.expanded().includes(code);
  }

  protected expand(code: string): void {
    this.expanded.update(list =>
      list.includes(code) ? list.filter(item => item !== code) : [...list, code],
    );
  }

  protected toggle(code: string): void {
    this.toggled.emit(code.toLowerCase());
  }

  protected close(): void {
    this.closed.emit();
  }

  /** Uma família com um filho só não tem o que separar. */
  protected splittable(group: SetGroup): boolean {
    return group.members.length > 1;
  }
}
