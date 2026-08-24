import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown, lucidePencil, lucidePlus, lucideRotateCcw } from '@ng-icons/lucide';
import { isMtgIcon, iconKey, MTG_ICONS } from '../../shared/icons/mtg-icons';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmAccordionImports } from '@spartan-ng/helm/accordion';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { HlmDialogService } from '@spartan-ng/helm/dialog';
import { NotificationService } from '../../shared/notification/notification.service';
import { HouseRulesService } from '../../services/house-rules-service';
import { BanlistItem, HouseRulesData, UpdateHouseRulesPayload } from '../../models/house-rules.models';
import { BanlistPanel } from './components/banlist-panel/banlist-panel';
import { BanlistAddDialog } from './components/banlist-add-dialog/banlist-add-dialog';
import {
  RulesEditorDialog,
  RulesEditorResult,
} from './components/rules-editor-dialog/rules-editor-dialog';

/**
 * Regras da Casa — documento compartilhado da mesa, servido pelo backend.
 * Recarrega a cada visita: outro jogador pode ter editado.
 */
@Component({
  selector: 'app-house-rules',
  standalone: true,
  imports: [
    DatePipe,
    NgIcon,
    HlmIcon,
    HlmAccordionImports,
    HlmButtonImports,
    HlmSeparatorImports,
    HlmSkeletonImports,
    BanlistPanel
  ],
  providers: [
    provideIcons({ lucideCheck, lucideChevronDown, lucidePencil, lucidePlus, lucideRotateCcw, ...MTG_ICONS }),
  ],
  templateUrl: './house-rules.html',
  styleUrl: './house-rules.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rules implements OnInit {
  private rulesService = inject(HouseRulesService);
  private notify = inject(NotificationService);
  private dialog = inject(HlmDialogService);

  /**
   * O ícone da seção é conteúdo do documento: hoje vem como nome da família,
   * mas documentos salvos antes disso guardam emoji — os dois casos renderizam.
   */
  protected readonly isIcon = isMtgIcon;
  protected readonly iconName = iconKey;

  protected rules = signal<HouseRulesData | null>(null);
  protected loading = signal(true);
  protected saving = signal(false);

  ngOnInit(): void {
    this.rulesService.getRules().subscribe({
      next: rules => {
        this.rules.set(rules);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível carregar as regras da casa.' });
      },
    });
  }

  protected async openEditor(): Promise<void> {
    const rules = this.rules();
    if (!rules || this.saving()) return;

    const ref = this.dialog.open(RulesEditorDialog, {
      context: { rules: structuredClone(rules) },
      // O editor é o diálogo mais denso do app: ganha largura extra no desktop.
      contentClass: 'sm:max-w-2xl',
    });

    const result = (await firstValueFrom(ref.closed$)) as RulesEditorResult | undefined;
    if (!result) return;

    this.persist({ ...result, banlist: rules.banlist }, 'Regras atualizadas!');
  }

  protected async openAddCard(): Promise<void> {
    const rules = this.rules();
    if (!rules || this.saving()) return;

    const ref = this.dialog.open(BanlistAddDialog, {});
    const item = (await firstValueFrom(ref.closed$)) as BanlistItem | undefined;
    if (!item) return;

    this.persist(
      {
        title: rules.title,
        subtitle: rules.subtitle,
        sections: rules.sections,
        banlist: [item, ...rules.banlist],
      },
      `${item.cardName} entrou na banlist.`,
    );
  }

  protected onRemoveBanned(id: string): void {
    const rules = this.rules();
    if (!rules || this.saving()) return;

    const item = rules.banlist.find(entry => entry.id === id);
    this.persist(
      {
        title: rules.title,
        subtitle: rules.subtitle,
        sections: rules.sections,
        banlist: rules.banlist.filter(entry => entry.id !== id),
      },
      `${item?.cardName ?? 'Carta'} saiu da banlist.`,
    );
  }

  protected resetToDefault(): void {
    if (this.saving()) return;

    this.notify.confirm('Restaurar as regras padrão? Isso descarta todas as edições e a banlist.', () => {
      this.saving.set(true);
      this.rulesService.resetRules().subscribe({
        next: rules => {
          this.rules.set(rules);
          this.saving.set(false);
          this.notify.success('Regras restauradas para o padrão.');
        },
        error: error => {
          this.saving.set(false);
          this.notify.apiError(error, { fallback: 'Não foi possível restaurar as regras.' });
        },
      });
    });
  }

  private persist(payload: UpdateHouseRulesPayload, successMessage: string): void {
    this.saving.set(true);
    this.rulesService.updateRules(payload).subscribe({
      next: rules => {
        this.rules.set(rules);
        this.saving.set(false);
        this.notify.success(successMessage);
      },
      error: error => {
        this.saving.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível salvar as regras.' });
      },
    });
  }
}
