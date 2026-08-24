import { Component, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmInputImports } from '@spartan-ng/helm/input';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmSkeletonImports } from '@spartan-ng/helm/skeleton';
import { lucideCamera, lucideTrash2, lucideUser } from '@ng-icons/lucide';
import { BackButton } from '../../shared/back-button/back-button';
import { NotificationService } from '../../shared/notification/notification.service';
import { ProfileService } from '../../shared/profile/profile.service';
import { UserService } from '../../services/user-service';
import { readSquareImage } from './avatar-image';

/** Lado do ícone gravado. 256px cobre o maior uso (perfil) com folga. */
export const AVATAR_SIZE = 256;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIcon,
    HlmIconImports,
    HlmButtonImports,
    HlmInputImports,
    HlmLabelImports,
    HlmSkeletonImports,
    BackButton
  ],
  providers: [provideIcons({ lucideCamera, lucideTrash2, lucideUser })],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private platformId = inject(PLATFORM_ID);
  private userService = inject(UserService);
  private notify = inject(NotificationService);
  protected profileService = inject(ProfileService);

  protected form: FormGroup;
  protected loading = signal(true);
  protected saving = signal(false);
  /** Ícone em edição — só vai para a API quando o formulário é salvo. */
  protected avatar = signal<string | null>(null);
  private savedAvatar: string | null = null;

  protected initial = computed(() => {
    const name = String(this.form.get('name')?.value ?? '').trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  });

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const id = Number(localStorage.getItem('user-id'));
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.userService.getUser(id).subscribe({
      next: profile => {
        this.form.patchValue({ name: profile.name, email: profile.email });
        this.avatar.set(profile.avatar);
        this.savedAvatar = profile.avatar;
        this.loading.set(false);
      },
      error: error => {
        this.notify.apiError(error, { fallback: 'Não foi possível carregar seu perfil.' });
        this.loading.set(false);
      },
    });
  }

  /** Nada mudou = nada para salvar; o botão fica desligado. */
  protected get dirty(): boolean {
    return this.form.dirty || this.avatar() !== this.savedAvatar;
  }

  protected async onPickImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Zera o input: escolher o mesmo arquivo duas vezes tem de disparar de novo.
    input.value = '';
    if (!file) return;

    try {
      this.avatar.set(await readSquareImage(file, AVATAR_SIZE));
    } catch {
      this.notify.warning('Não foi possível ler essa imagem.', {
        description: 'Use um arquivo PNG, JPEG ou WebP.',
      });
    }
  }

  protected removeImage(): void {
    this.avatar.set(null);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notify.warning('Confira o nome e o email antes de salvar.');
      return;
    }
    if (this.saving() || !this.dirty) return;

    this.saving.set(true);
    const { name, email } = this.form.getRawValue();

    this.profileService.save({ name, email, avatar: this.avatar() }).subscribe({
      next: profile => {
        this.savedAvatar = profile.avatar;
        this.form.markAsPristine();
        this.saving.set(false);
        this.notify.success('Perfil atualizado!');
      },
      error: error => {
        this.saving.set(false);
        this.notify.apiError(error, { fallback: 'Não foi possível salvar o perfil.' });
      },
    });
  }
}
