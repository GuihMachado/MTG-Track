import { Directive, computed, input, signal } from '@angular/core';
import { BrnButton } from '@spartan-ng/brain/button';
import { hlm } from '@spartan-ng/helm/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type { ClassValue } from 'clsx';
import { injectBrnButtonConfig } from './hlm-button.token';

export const buttonVariants = cva(
	"focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_ng-icon]:pointer-events-none [&_ng-icon]:shrink-0 [&_ng-icon:not([class*='text-'])]:text-base",
	{
		variants: {
			variant: {
				// Grimório: botões sólidos flutuam (sobem no hover, afundam no clique);
				// ghost e link seguem chapados, porque são ação secundária.
				default:
					'bg-primary text-primary-foreground hover:bg-primary/90 shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-px active:translate-y-0 active:shadow-elev-1',
				destructive:
					'bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60 text-white shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-px active:translate-y-0 active:shadow-elev-1',
				// Grimório: o hover é neutro (surface-3), nunca o ouro. O padrão do
				// spartan usava hover:text-accent-foreground, que no tema escuro é
				// quase preto sobre fundo escuro — texto invisível ao passar o mouse
				// (e "colado" depois do tap no celular).
				outline:
					'bg-background hover:bg-surface-3 hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 border shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-px active:translate-y-0 active:shadow-elev-1',
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-elev-1 hover:shadow-elev-2 hover:-translate-y-px active:translate-y-0 active:shadow-elev-1',
				ghost: 'hover:bg-surface-3 hover:text-foreground dark:hover:bg-input/50',
				link: 'text-primary underline-offset-4 hover:underline',
			},
			size: {
				default: 'h-[42px] px-4 py-2 has-[>ng-icon]:px-3',
				sm: 'h-8 gap-1.5 rounded-md px-3 has-[>ng-icon]:px-2.5',
				lg: 'h-10 rounded-md px-6 has-[>ng-icon]:px-4',
				icon: 'size-9',
				'icon-sm': 'size-8',
				'icon-lg': 'size-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;

@Directive({
	selector: 'button[hlmBtn], a[hlmBtn]',
	exportAs: 'hlmBtn',
	hostDirectives: [{ directive: BrnButton, inputs: ['disabled'] }],
	host: {
		'data-slot': 'button',
		'[class]': '_computedClass()',
	},
})
export class HlmButton {
	private readonly _config = injectBrnButtonConfig();

	private readonly _additionalClasses = signal<ClassValue>('');

	public readonly userClass = input<ClassValue>('', { alias: 'class' });

	protected readonly _computedClass = computed(() =>
		hlm(buttonVariants({ variant: this.variant(), size: this.size() }), this.userClass(), this._additionalClasses()),
	);

	public readonly variant = input<ButtonVariants['variant']>(this._config.variant);

	public readonly size = input<ButtonVariants['size']>(this._config.size);

	setClass(classes: string): void {
		this._additionalClasses.set(classes);
	}
}
