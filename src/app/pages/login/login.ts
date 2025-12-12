import { Component, inject } from '@angular/core';
import { provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideChevronDown } from '@ng-icons/lucide';
import { AuthService } from '../../services/auth-service';
import { Subject, takeUntil } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { toast } from 'ngx-sonner';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'app-login',
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
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected mainForm: FormGroup;
  private authService = inject(AuthService);
  private readonly destroy = new Subject<void>();
  private router = inject(Router);

  constructor() {
    this.mainForm = new FormGroup({});
    this.mainForm.addControl('email', new FormControl('', [Validators.required]));
    this.mainForm.addControl('password', new FormControl('', [Validators.required]));
  }

  ngOnDestroy() {
    this.destroy.next();
    this.destroy.complete();
  }

  protected login() {
    const command = this.authService.login(this.bodybuilder());
    command
      .pipe(takeUntil(this.destroy))
      .subscribe({
      next: (data) => {
        toast('Login efetuado com sucesso', {
            action: {
                label: 'Ok',
                onClick: () => { },
            }
        });
        localStorage.setItem('auth-token', data.token);
        // this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        toast(error.error.message);
      }
    });
  }

  private bodybuilder() {
    return this.mainForm.value;
  }
}
