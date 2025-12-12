import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { Router, RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';

@Component({
  selector: 'app-register',
  imports: [ 
    HlmCardImports, 
    HlmLabelImports, 
    HlmInputImports, 
    HlmButtonImports, 
    HlmToasterImports,
    RouterLink,
    ReactiveFormsModule
  ],
  providers: [provideIcons({ lucideCheck, lucideChevronDown })],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  protected mainForm: FormGroup;
  private authService = inject(AuthService);
  private readonly destroy = new Subject<void>();
  private router = inject(Router);

  constructor() {
    this.mainForm = new FormGroup({});
    this.mainForm.addControl('name', new FormControl('', [Validators.required]));
    this.mainForm.addControl('email', new FormControl('', [Validators.required]));
    this.mainForm.addControl('password', new FormControl('', [Validators.required]));
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected signUp() {
    const command = this.authService.register(this.bodybuilder());
    command
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: (data) => {
        console.log('Registro efetuado com sucesso!', data);
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Erro ao efetuar registro:', error);
      }
    });
  }

  private bodybuilder() {
    return this.mainForm.value;
  }
}
