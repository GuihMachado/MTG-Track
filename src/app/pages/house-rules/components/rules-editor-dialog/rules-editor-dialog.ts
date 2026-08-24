import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePlus, lucideTrash2 } from '@ng-icons/lucide';
import { HlmIcon } from '@spartan-ng/helm/icon';
import { BrnDialogRef, injectBrnDialogContext } from '@spartan-ng/brain/dialog';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSeparatorImports } from '@spartan-ng/helm/separator';
import { HlmTextareaImports } from '@spartan-ng/helm/textarea';
import { HouseRulesData, RuleSection } from '../../../../models/house-rules.models';
import {
  iconKey,
  isMtgIcon,
  MTG_ICON_NAMES,
  MTG_ICONS,
  MtgIconName,
} from '../../../../shared/icons/mtg-icons';

export interface RulesEditorContext {
  rules: HouseRulesData;
}

export interface RulesEditorResult {
  title: string;
  subtitle: string;
  sections: RuleSection[];
}

/** Rascunho editável: bullets viram um textarea com um item por linha. */
interface SectionDraft {
  id: string;
  title: string;
  icon: string;
  content: string;
  listItemsText: string;
  warningNote: string;
}

/**
 * Editor do documento de regras. O componente nasce a cada open() do
 * HlmDialogService, então o rascunho sempre parte do estado atual — sem
 * formulário stale entre aberturas.
 */
@Component({
  selector: 'app-rules-editor-dialog',
  standalone: true,
  imports: [
    NgIcon,
    HlmIcon,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSeparatorImports,
    HlmTextareaImports,
  ],
  providers: [provideIcons({ lucidePlus, lucideTrash2, ...MTG_ICONS })],
  templateUrl: './rules-editor-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RulesEditorDialog {
  private readonly context = injectBrnDialogContext<RulesEditorContext>();
  private readonly dialogRef = inject<BrnDialogRef<RulesEditorResult | undefined>>(BrnDialogRef);

  protected readonly iconNames = MTG_ICON_NAMES;
  protected readonly iconName = iconKey;
  protected readonly isIcon = isMtgIcon;

  protected title = signal(this.context.rules.title);
  protected subtitle = signal(this.context.rules.subtitle);
  protected sections = signal<SectionDraft[]>(
    this.context.rules.sections.map(section => ({
      id: section.id,
      title: section.title,
      icon: section.icon,
      content: section.content,
      listItemsText: (section.listItems ?? []).join('\n'),
      warningNote: section.warningNote ?? '',
    })),
  );

  protected patchSection(index: number, patch: Partial<SectionDraft>): void {
    this.sections.update(sections =>
      sections.map((section, i) => (i === index ? { ...section, ...patch } : section)),
    );
  }

  /** Troca o ícone da seção; um clique no já escolhido não faz nada. */
  protected pickIcon(index: number, icon: MtgIconName): void {
    this.patchSection(index, { icon });
  }

  protected addSection(): void {
    this.sections.update(sections => [
      ...sections,
      {
        id: crypto.randomUUID(),
        title: `${sections.length + 1}. Nova regra`,
        icon: 'scroll',
        content: '',
        listItemsText: '',
        warningNote: '',
      },
    ]);
  }

  protected removeSection(index: number): void {
    this.sections.update(sections => sections.filter((_, i) => i !== index));
  }

  protected cancel(): void {
    this.dialogRef.close(undefined);
  }

  protected save(): void {
    const title = this.title().trim();
    if (!title) return;

    this.dialogRef.close({
      title,
      subtitle: this.subtitle().trim(),
      sections: this.sections()
        .filter(section => section.title.trim().length > 0)
        .map(section => {
          const listItems = section.listItemsText
            .split('\n')
            .map(item => item.trim())
            .filter(Boolean);
          const warningNote = section.warningNote.trim();

          return {
            id: section.id,
            title: section.title.trim(),
            icon: section.icon.trim(),
            content: section.content.trim(),
            ...(listItems.length > 0 ? { listItems } : {}),
            ...(warningNote ? { warningNote } : {}),
          };
        }),
    });
  }
}
