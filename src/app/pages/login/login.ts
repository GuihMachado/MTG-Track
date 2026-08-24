import { Component, inject, signal } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { NotificationService } from '../../shared/notification/notification.service';

/** Id fixo: um novo aviso de validação substitui o anterior em vez de empilhar. */
const FORM_WARNING = 'form-validation';

@Component({
  selector: 'app-login',
  imports: [ 
    HlmCardImports, 
    HlmLabelImports, 
    HlmInputImports, 
    HlmButtonImports, 
    RouterLink,
    ReactiveFormsModule
  ],
  providers: [provideIcons({ lucideCheck, lucideChevronDown })],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected mainForm: FormGroup;
  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private readonly destroy = new Subject<void>();

  constructor() {
    this.mainForm = new FormGroup({});
    this.mainForm.addControl('email', new FormControl('', [Validators.required, Validators.email]));
    this.mainForm.addControl('password', new FormControl('', [Validators.required]));
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected login() {
    if (this.mainForm.invalid) {
      this.mainForm.markAllAsTouched();
      this.notify.warning('Informe um e-mail válido e a sua senha para entrar.', { id: FORM_WARNING });
      return;
    }

    this.loading.set(true);

    this.authService.login(this.bodybuilder())
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: (data) => {
        this.loading.set(false);

        localStorage.setItem('auth-token', data.token);
        localStorage.setItem('user-name', data.user.name);
        localStorage.setItem('user-id', String(data.user.id));

        this.notify.success(`Bem-vindo, ${data.user.name}!`, { description: 'Login efetuado com sucesso.' });
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível entrar agora.',
          byStatus: {
            400: 'E-mail ou senha inválidos.',
            401: 'E-mail ou senha inválidos.',
            404: 'Não encontramos nenhuma conta com esse e-mail.'
          }
        });
      }
    });
  }

  private bodybuilder() {
    return this.mainForm.value;
  }
}
