# Clive public gateway

This Worker is the server-side model gateway for The Commons. It keeps the OpenAI API key out of the browser and requires a Cloudflare Turnstile visitor check plus an IP rate limit.

## Required Cloudflare setup

1. Create a Cloudflare Worker named `commons-clive-gateway`.
2. Create a Turnstile widget for the exact public origin `https://rxe-alt788.github.io`. Use the Managed widget mode.
3. Add these Worker secrets:
   - `OPENAI_API_KEY`: the provider API key, stored as a Worker secret.
   - `TURNSTILE_SECRET`: the Turnstile secret key.
4. Add these Worker variables:
   - `OPENAI_MODEL`: an API model identifier enabled for the provider account.
   - `ALLOWED_ORIGIN`: `https://rxe-alt788.github.io`.
5. Create a Workers Rate Limiting binding named `RATE_LIMITER`, namespace ID `1001`, limit 10 requests per 60 seconds. The binding is defined in `wrangler.toml`; create or select its namespace in the Cloudflare dashboard before deploying.
6. Deploy this directory with Wrangler or the Cloudflare dashboard. Record the resulting `workers.dev` URL.

## Browser integration

The Commons client must call the deployed Worker URL, send only `user` and `assistant` messages, include the Turnstile response token as `turnstileToken`, and send the three visitor node values in `preferences`. It must not send a provider API key or a client-controlled system message.

The Worker currently expects:
```json
{
  "messages": [
    { "role": "user", "content": "Hello, Clive." }
  ],
  "preferences": {
    "memory": 3,
    "creativity": 3,
    "initiative": 2
  },
  "turnstileToken": "one-time-token-from-turnstile"
}
```

## Security notes

- The provider key is read only from the Worker secret store.
- Browser origin checks are not authentication. Turnstile and the rate-limit binding are also required.
- The Worker accepts only user/assistant message roles and constructs Clive's system prompt server-side.
- The IP limit is deliberately conservative for an early public test. Review usage and provider spend before inviting a large audience.
- This is an invocation gateway only. It does not yet provide shared storage, user accounts, private spaces or multi-user persistence.
