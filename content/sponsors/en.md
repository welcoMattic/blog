---
title: Sponsor my open source work
description: >-
  Sponsor the open source work of Mathieu Santostefano on Symfony, Symfony AI and Symfony UX. Tiers from $1 to $500
  a month.
twin: Version française
lede: >-
  I’m Mathieu Santostefano, member of the Symfony Core Team. Sponsoring me buys framework-level work that your team
  can leverage in their projects.
button: Sponsor on GitHub

# Tier grid. Amounts, GitHub links and featured tiers live in
# src/data/sponsors.ts; only the text is here. One key per tier,
# "amount/frequency".
tiers:
  title: Tiers
  monthly: Monthly
  oneTime: One time
  perMonth: a month
  once: one time
  choose: Choose this tier
  note: Payment goes through GitHub Sponsors. Each link opens its checkout with the tier already selected.
  perks:
    1/monthly: You appreciate my open source work and want to show it. Thank you!
    5/monthly: My open source work helps you build your software, I'm glad! Thanks a lot for your support!
    25/monthly: You build on my work and want to give back. Your name goes into the SPONSORS.md of my projects.
    42/monthly: Because 42 is the Answer to the Ultimate Question of Life, the Universe, and Everything.
    100/monthly: >-
      Your product runs on Symfony, and my Security, Mailer, Notifier or Translation work is part of your stack. Your
      logo and a link appear in the sidebar of the articles on this blog and in the README of my projects.
    250/monthly: >-
      Everything in Company, plus your logo on the slides of the talks I give at French and international
      conferences: several hundred PHP developers, tech experts and CTOs per event.
    500/monthly: >-
      Everything in Partner, plus a monthly video call where we go through your authentication and authorization
      questions on Symfony: OAuth2, OIDC, the Security component.
    2/one-time: To thank me for a particular contribution.
    10/one-time: To thank me for a contribution that proved particularly useful to your project.
    100/one-time: One of my contributions saved a precious amount of time to your team to build your application, and you want to thank me.
    750/one-time: >-
      I can write the Symfony bridge for your service, Mailer, Notifier, Translation, AI or KMS: design, code, tests and docs, then
      the Pull Request, carried through review. Contact me first to discuss about your service.

sponsors:
  title: Sponsors
  empty: >-
    No active sponsor right now. From the Company tier up, your logo and a link appear here and in the sidebar of the
    articles.
  alsoBy: Also supported by
  past: Past sponsors
  pastNotes:
    Sweego: for the development of the Sweego bridges for Mailer and Notifier
  note: >-
    Links to sponsors carry rel="sponsored": they are paid links, and the attribute tells search engines so, as Google
    requires.
---

## What sponsoring funds

The goal is $500 a month: two full working days every month, dedicated to Symfony.

Next on the list: I plan to keep improving and extending OAuth2 and OIDC support in the Symfony Security component.

More broadly, I can work on any part of Symfony, Symfony AI and Symfony UX.

<!-- paliers -->

## `oidc_login` in Symfony 8.2

**Symfony 8.2 speaks OpenID Connect out of the box.** I contributed the `oidc_login` authenticator, which brings the OIDC Authorization Code Flow natively into the Security component: PKCE, the code exchange, ID token signature verification, logout and refresh, all handled for you. “Log in with…” goes from a bundle-and-glue job to a few lines of `security.yaml`:

```yaml
# config/packages/security.yaml
security:
    providers:
        oidc_users:
            oidc: ~

    firewalls:
        main:
            provider: oidc_users
            oidc_login:
                provider_uri: '%env(OIDC_PROVIDER_URI)%'
                client_id: '%env(OIDC_CLIENT_ID)%'
                client_authentication:
                    client_secret_basic: '%env(OIDC_CLIENT_SECRET)%'
```

If your company runs Symfony and authenticates users, that work is now in your framework, maintained by the core team and the community, at no cost to you.

If you ship a product that other people install, a CMS, an e-commerce platform, a PIM, a CRM or a helpdesk, it goes further: your own customers get “Log in with our company identity provider” without you writing, testing or maintaining a single line of OIDC. Enterprise SSO stops being a roadmap item and becomes a line of configuration.

This work was not sponsored. If it helps your team, you can sponsor me after the fact to say thanks.

Read [the pull request](https://github.com/symfony/symfony/pull/64954), [the documentation](https://symfony.com/doc/8.2/security/oidc_login.html), or run [the demo application](https://github.com/welcoMattic/oidc-login-demo) against several providers.

