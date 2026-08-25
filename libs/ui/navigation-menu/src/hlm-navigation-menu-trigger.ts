import { computed, Directive, input } from '@angular/core';
import { BrnNavigationMenuTrigger } from '@spartan-ng/brain/navigation-menu';
import { hlm } from '@spartan-ng/helm/utils';
import { ClassValue } from 'clsx';

@Directive({
	selector: 'button[hlmNavigationMenuTrigger]',
	hostDirectives: [BrnNavigationMenuTrigger],
	host: {
		'[class]': '_computedClass()',
	},
})
export class HlmNavigationMenuTrigger {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	protected readonly _computedClass = computed(() =>
		hlm(
			'bg-background hover:bg-hairline-strong hover:text-foreground focus:bg-hairline-strong focus:text-foreground data-[state=open]:hover:bg-hairline-strong data-[state=open]:text-foreground data-[state=open]:focus:bg-hairline-strong data-[state=open]:bg-hairline focus-visible:ring-ring/50 group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50',
			this.userClass(),
		),
	);
}
