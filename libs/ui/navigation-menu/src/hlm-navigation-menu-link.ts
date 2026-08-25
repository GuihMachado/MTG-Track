import { computed, Directive, input } from '@angular/core';
import { BrnNavigationMenuLink } from '@spartan-ng/brain/navigation-menu';
import { hlm } from '@spartan-ng/helm/utils';
import { ClassValue } from 'clsx';

@Directive({
	selector: 'a[hlmNavigationMenuLink]',
	hostDirectives: [{ directive: BrnNavigationMenuLink, inputs: ['active'] }],
	host: {
		'[class]': '_computedClass()',
	},
})
export class HlmNavigationMenuLink {
	public readonly userClass = input<ClassValue>('', { alias: 'class' });
	protected readonly _computedClass = computed(() =>
		hlm(
			'data-[active=true]:focus:bg-hairline-strong data-[active=true]:hover:bg-hairline-strong data-[active=true]:bg-hairline data-[active=true]:text-foreground hover:bg-hairline-strong hover:text-foreground focus:bg-hairline-strong focus:text-foreground focus-visible:ring-ring/50 [&_ng-icon:not([class*="text-"])]:text-muted-foreground flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none focus-visible:ring-[3px] focus-visible:outline-1 [&_ng-icon:not([class*="text-"])]:text-base',
			'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
			this.userClass(),
		),
	);
}
