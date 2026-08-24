import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { Router, RouterLink } from '@angular/router';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';

/** Id fixo: um novo aviso de validação substitui o anterior em vez de empilhar. */
const FORM_WARNING = 'form-validation';

@Component({
  selector: 'app-register',
  imports: [ 
    HlmCardImports, 
    HlmLabelImports, 
    HlmInputImports, 
    HlmButtonImports, 
    RouterLink,
    ReactiveFormsModule,
    BackButton
  ],
  providers: [provideIcons({ lucideCheck, lucideChevronDown })],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  protected mainForm: FormGroup;
  // Zoneless: mutado dentro do subscribe, precisa ser signal para a view reagir.
  protected loading = signal(false);

  private authService = inject(AuthService);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private readonly destroy = new Subject<void>();

  constructor() {
    this.mainForm = new FormGroup({});
    this.mainForm.addControl('name', new FormControl('', [Validators.required]));
    this.mainForm.addControl('email', new FormControl('', [Validators.required, Validators.email]));
    this.mainForm.addControl('password', new FormControl('', [Validators.required, Validators.minLength(6)]));
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected signUp() {
    if (this.mainForm.invalid) {
      this.mainForm.markAllAsTouched();
      this.notify.warning(this.firstValidationMessage(), { id: FORM_WARNING });
      return;
    }

    this.loading.set(true);

    this.authService.register(this.bodybuilder())
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: () => {
        this.loading.set(false);
        this.notify.success('Cadastro realizado!', { description: 'Faça login para começar a registrar suas partidas.' });
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.loading.set(false);
        this.notify.apiError(error, {
          fallback: 'Não foi possível concluir o cadastro.',
          byStatus: { 409: 'Esse e-mail já está cadastrado. Tente fazer login.' }
        });
      }
    });
  }

  /** Aponta o primeiro problema do formulário, em vez de um aviso genérico. */
  private firstValidationMessage(): string {
    const name = this.mainForm.get('name');
    const email = this.mainForm.get('email');
    const password = this.mainForm.get('password');

    if (name?.invalid) {
      return 'Informe o seu nome.';
    }
    if (email?.hasError('required')) {
      return 'Informe o seu e-mail.';
    }
    if (email?.hasError('email')) {
      return 'Esse e-mail não parece válido.';
    }
    if (password?.hasError('required')) {
      return 'Crie uma senha para continuar.';
    }
    if (password?.hasError('minlength')) {
      return 'A senha precisa ter ao menos 6 caracteres.';
    }

    return 'Revise os campos antes de continuar.';
  }

  private bodybuilder() {
    return this.mainForm.value;
  }
}
