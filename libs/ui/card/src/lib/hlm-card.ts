import { Directive, computed, input } from '@angular/core';
import { hlm } from '@spartan-ng/helm/utils';
import { type VariantProps, cva } from 'class-variance-authority';
import type { ClassValue } from 'clsx';

// Grimório: a escala de elevação do app no lugar das sombras genéricas do
// Tailwind, que são rgba(0,0,0,.1) e desaparecem sobre o fundo escuro.
export const cardVariants = cva('plate text-card-foreground flex flex-col gap-6 rounded-lg py-6', {
	variants: {},
	defaultVariants: {},
});
export type CardVariants = VariantProps<typeof cardVariants>;

@Directive({
	selector: '[hlmCard]',
	host: {
		'[class]': '_computedClass()',
	},
})
export class HlmCard {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	protected readonly _computedClass = computed(() => hlm(cardVariants(), this.userClass()));
}
