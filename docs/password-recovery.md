# Password recovery setup

The app uses the native `whitechoclate` scheme for Supabase password recovery.
The recovery request redirects to:

```text
whitechoclate://auth/reset-password
```

When recovery starts from Profile, the app appends a validated `source=profile`
query parameter so the completed flow returns to Profile login. This parameter
does not contain credentials or recovery tokens.

## Supabase Dashboard

In **Authentication → URL Configuration → Redirect URLs**, add:

```text
whitechoclate://auth/reset-password
```

If supported by the project’s Supabase configuration, the broader development
pattern may also be added:

```text
whitechoclate://**
```

In **Authentication → Email Templates → Reset Password / Recovery**:

- Keep the generated Supabase confirmation URL in the template.
- Do not replace it with a hardcoded web or app URL; Supabase appends the
  recovery callback data that the native route processes explicitly.

Also verify that **Email** authentication is enabled.

For production, configure custom SMTP for reliable branded recovery delivery.

Do not change the `whitechoclate` app scheme. Google OAuth already depends on
the same scheme and its callback remains:

```text
whitechoclate://auth/callback
```

Use an Expo development build when testing native deep links, including cold
start and warm start recovery links.
