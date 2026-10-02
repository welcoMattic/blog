---
title: Sponsoriser mon travail open source
description: >-
  Sponsoriser le travail open source de Mathieu Santostefano sur Symfony, Symfony AI et Symfony UX. Paliers de 1 à
  500 $ par mois.
twin: English version
lede: >-
  Je suis Mathieu Santostefano, membre de la Symfony Core Team. Me sponsoriser, c’est financer du travail au niveau
  du framework, que votre équipe pourra utiliser dans ses projets.
button: Sponsoriser sur GitHub

# Grille des paliers. Montants, liens GitHub et paliers mis en avant sont dans
# src/data/sponsors.ts ; ici, seulement le texte. Une clé par palier,
# « montant/fréquence ».
tiers:
  title: Paliers
  monthly: Mensuels
  oneTime: Ponctuels
  perMonth: par mois
  once: une fois
  choose: Choisir ce palier
  note: Le paiement passe par GitHub Sponsors. Chaque lien ouvre son checkout avec le palier déjà sélectionné.
  perks:
    1/monthly: Vous appréciez mon travail open source et voulez le montrer. Merci !
    5/monthly: Mon travail open source vous aide à construire votre logiciel, j'en suis ravi! Merci beaucoup pour votre soutien !
    25/monthly: >-
      Vous construisez sur mon travail et voulez rendre la pareille. Votre nom entre dans le SPONSORS.md de mes
      projets.
    42/monthly: Parce que 42 est la réponse à la grande question sur la vie, l’univers et le reste.
    100/monthly: >-
      Votre produit tourne sur Symfony, et mon travail sur Security, Mailer, Notifier ou Translation fait partie de
      votre stack. Votre logo et un lien apparaissent dans la sidebar des articles de ce blog et dans le
      README de mes projets.
    250/monthly: >-
      Tout le palier Company, plus votre logo sur les slides des talks que je donne en conférence, en France et à
      l’international : plusieurs centaines de développeurs PHP, d’experts techniques et de CTO par événement.
    500/monthly: >-
      Tout le palier Partner, plus une visio mensuelle pour passer en revue vos questions d’authentification et
      d’autorisation sous Symfony : OAuth2, OIDC, l’utilisation du composant Security.
    2/one-time: Pour me remercier d’une contribution en particulier.
    10/one-time: Pour une contribution qui s’est révélée particulièrement utile à votre projet.
    100/one-time: >-
      Une de mes contributions a fais gagner un temps précieux votre équipe pour construire votre application, et vous voulez me remercier.
    750/one-time: >-
      Je peux écrire le bridge Symfony de votre service, Mailer, Notifier, Translation, AI ou KMS : conception, code, tests et
      documentation, puis la Pull Request, que je porte jusqu’au bout de la revue. Contactez moi au préalable pour en discuter.

sponsors:
  title: Sponsors
  empty: >-
    Aucun sponsor actif pour l’instant. À partir du palier Company, votre logo et un lien apparaissent ici et dans la
    colonne latérale des articles.
  alsoBy: Avec le soutien de
  past: Sponsors passés
  pastNotes:
    Sweego: pour le développement des bridges Sweego de Mailer et Notifier
  note: >-
    Les liens vers les sponsors portent rel="sponsored" : ce sont des liens rémunérés, et l’attribut le signale aux
    moteurs de recherche, comme Google l’exige.
---

## Ce que le sponsoring finance

L’objectif est de 500 $ par mois : deux journées de travail complètes chaque mois, consacrées à Symfony.

Prochain chantier : je prévois d’améliorer et d’enrichir encore le support d’OAuth2 et d’OIDC dans le composant Security de Symfony.

Plus largement, je peux intervenir sur l’ensemble de Symfony, de Symfony AI et de Symfony UX.

<!-- paliers -->

## `oidc_login` dans Symfony 8.2

**Symfony 8.2 parle OpenID Connect nativement.** J’ai contribué l’Authenticator `oidc_login`, qui intègre l’Authorization Code Flow d’OIDC directement dans le composant Security : PKCE, l’échange du code, la vérification de la signature de l’ID token, la déconnexion et le rafraîchissement, tout est pris en charge. « Se connecter avec… » passe d’un assemblage de bundles et de code maison à quelques lignes de `security.yaml` :

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

Si votre entreprise fait tourner Symfony et authentifie des utilisateurs, ce travail est désormais dans le framework, maintenu par la Core Team et la communauté, sans rien vous coûter.

Si vous éditez un produit que d’autres installent, un CMS, une plateforme e-commerce, un PIM, un CRM ou un helpdesk, cela va plus loin : vos propres clients obtiennent « Se connecter avec le fournisseur d’identité de notre entreprise » sans que vous ayez à écrire, tester ou maintenir une seule ligne d’OIDC. Le SSO d’entreprise cesse d’être une ligne de roadmap et devient une ligne de configuration.

Ce travail n’a pas été sponsorisé. S’il aide votre équipe, vous pouvez me sponsoriser a posteriori pour me remercier.

Pour aller plus loin : [la pull request](https://github.com/symfony/symfony/pull/64954), [la documentation](https://symfony.com/doc/8.2/security/oidc_login.html), et [l’application de démo](https://github.com/welcoMattic/oidc-login-demo) à brancher sur plusieurs providers.

