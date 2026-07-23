# Password Recovery and Google Callback

## Flow 1: Request a password reset

**Entry:** Tap `Forgot password?` from onboarding login or `/account/profile` login.

1. `/auth/forgot-password` opens.
2. The typed email is prefilled when available.
3. The user sees `Reset your password`, an email field, privacy-preserving copy, `Send reset link`, and `Back to login`.
4. Enter a syntactically valid email; the submit button becomes enabled.
5. Tap `Send reset link`.
6. The button changes to `Sending reset link` with a spinner.
7. Success shows `If an account exists for this email, we sent password reset instructions.`
8. The button becomes disabled `Reset link sent` for 30 seconds.
9. After the delay, it becomes `Resend reset link`.
10. Changing the email clears sent/error state and immediately allows a new request when valid.
11. Failure shows an inline error.

## Flow 2: Return from reset request

Tap the back arrow or `Back to login`.

- With navigation history -> goes back.
- Profile source without history -> `/account/profile`.
- Onboarding source without history -> onboarding account step in login mode.
- Back is blocked while a reset request is submitting.

## Flow 3: Open a password reset link

1. The reset deep link opens `/auth/reset-password`.
2. The user first sees a spinner and `Verifying your reset link...`.
3. The recovery session is validated with the account backend.

### Valid link

1. The page changes to `Choose a new password`.
2. Enter new password and confirmation.
3. Fewer than 8 characters shows `Use a password with at least 8 characters.`
4. A mismatch shows the password-mismatch error.
5. `Update password` is enabled only when both fields are present and match.
6. Tap it; the button shows `Updating password`.
7. The password is updated and the recovery session is closed.
8. Success shows `Password updated`, explanatory text, and `Return to login`.

### Invalid, missing, expired, or failed link

1. The page shows `Reset link unavailable` and the returned error; a missing link uses `This password reset link is invalid. Request a new one.`
2. Tap `Request a new link` to return to the reset-request screen.
3. Tap `Return to login` to return to the source login flow.

### Update/cleanup failure

- A password update failure appears inline and keeps the form.
- If password update succeeds but recovery-session cleanup fails, the user sees a specific inline error and remains on the page to retry/exit safely.
- Navigation away from a valid unfinished recovery session attempts cleanup first.

## Flow 4: Google authentication callback

1. Native Google sign-in hands control to `/auth/callback`.
2. The user sees a spinner and `Completing Google sign-in...` while account/onboarding state and the callback are processed.
3. Success navigation prefers:
   - previous screen when router history exists,
   - onboarding when onboarding is still required,
   - map otherwise.
4. User cancellation returns through the same navigation decision without a failure message.
5. A callback failure shows the account error or `Google sign-in could not finish. Please try again.`
6. Tap `Return to onboarding`; despite its label, the routing helper may return to history or the map depending on current onboarding state.
7. Android hardware Back is blocked during processing and available after an error is shown.

