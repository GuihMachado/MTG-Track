import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  model,
  output,
  signal,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIcon } from '@spartan-ng/helm/icon';
import {
  lucideCircleCheck,
  lucideClipboardPaste,
  lucideDownload,
  lucideLink,
  lucideLoader,
} from '@ng-icons/lucide';
import { NotificationService } from '../../../../shared/notification/notification.service';
import { ImportService } from '../../../../services/import-service';
import { ImportSource } from '../../../../models/collection.models';
import { parseList, totalCards } from '../parse-list';

/** As quatro fontes que o campo de link reconhece pelo domínio. */
const SOURCES: { id: ImportSource; label: string }[] = [
  { id: 'moxfield', label: 'Moxfield' },
  { id: 'archidekt', label: 'Archidekt' },
  { id: 'deckstats', label: 'Deckstats' },
  { id: 'tappedout', label: 'TappedOut' },
];

const PLACEHOLDER = `1 Sol Ring (C21) 263
1 Rhystic Study (JR)
1 Cyclonic Rift
1 Command Tower`;

/**
 * As três entradas de uma lista — link, colar e arquivo — que a importação e o
 * formulário de deck compartilham. O resultado é sempre **texto** no campo de
 * colar: a lista buscada fica visível e revisável, em vez de virar um deck que
 * ninguém viu. Quem lê e grava é a tela que usa este bloco.
 */
@Component({
  selector: 'app-list-source',
  standalone: true,
  imports: [NgIcon, HlmIcon],
  providers: [
    provideIcons({ lucideLink, lucideCircleCheck, lucideClipboardPaste, lucideDownload, lucideLoader }),
  ],
  templateUrl: './list-source.html',
  styleUrl: './list-source.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListSource {
  text = model('');
  /** Nome do deck vindo da fonte externa, quando ela informa. */
  fetchedName = output<string | null>();

  private importService = inject(ImportService);
  private notify = inject(NotificationService);

  protected readonly sources = SOURCES;
  protected readonly placeholder = PLACEHOLDER;

  protected url = signal('');
  protected fetching = signal(false);

  protected source = computed(() => this.importService.detectSource(this.url()));

  protected parsed = computed(() => parseList(this.text()));
  protected lineCount = computed(() => this.parsed().length);
  protected cardCount = computed(() => totalCards(this.parsed()));

  /** Domínio conhecido mas sem API aberta: dizer isso é melhor que fingir. */
  protected urlWarning = computed(() => {
    const url = this.url().trim();
    if (!url) return null;

    if (this.source() === null) {
      return 'Não conheço esse site. Cole a lista em texto que eu leio.';
    }

    if (this.source() === 'moxfield') {
      return 'O Moxfield não libera a lista para outros aplicativos. Abra o deck, use Export e cole aqui.';
    }

    return null;
  });

  protected fetchFromUrl(): void {
    const url = this.url().trim();
    if (!url || this.fetching()) return;

    this.fetching.set(true);
    this.importService.fromUrl(url).subscribe({
      next: fetched => {
        this.fetching.set(false);
        this.text.set(fetched.text);
        this.fetchedName.emit(fetched.deckName);
        this.notify.success(`Lista do ${fetched.source} carregada. Confira antes de ler.`);
      },
      error: error => {
        this.fetching.set(false);
        this.notify.apiError(error, { fallback: 'Não consegui buscar esse deck.' });
      },
    });
  }

  protected async paste(): Promise<void> {
    try {
      const clipboard = await navigator.clipboard.readText();
      if (clipboard.trim()) this.text.set(clipboard);
    } catch {
      // Sem permissão de área de transferência (ou navegador sem suporte): o
      // campo continua editável, então o Ctrl+V à mão resolve.
      this.notify.warning('Seu navegador não deixou eu ler a área de transferência. Cole com Ctrl+V.');
    }
  }

  protected openFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    file
      .text()
      .then(content => this.text.set(content))
      .catch(() => this.notify.error('Não consegui ler esse arquivo.'));

    // Zera para o mesmo arquivo poder ser escolhido de novo.
    input.value = '';
  }
}
