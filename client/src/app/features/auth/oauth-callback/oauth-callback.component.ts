import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import {
  OAUTH_FAILURE_ERROR,
  OAUTH_FAILURE_ROUTE,
  OAUTH_SUCCESS_REDIRECT,
  OAUTH_TOKEN_QUERY_PARAM,
  OAuthAuthMethods,
} from '../oauth-auth.contract';

@Component({
  selector: 'app-oauth-callback',
  imports: [TranslatePipe],
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.scss',
})
export class OauthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService) as AuthService & OAuthAuthMethods;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get(OAUTH_TOKEN_QUERY_PARAM);

    if (!token) {
      this.redirectToLoginFailure();
      return;
    }

    try {
      this.auth.applyOAuthToken(token);
      void this.router.navigateByUrl(OAUTH_SUCCESS_REDIRECT);
    } catch {
      this.redirectToLoginFailure();
    }
  }

  private redirectToLoginFailure(): void {
    void this.router.navigate([OAUTH_FAILURE_ROUTE], {
      queryParams: { error: OAUTH_FAILURE_ERROR },
    });
  }
}
