---
title: "[SensioLabs] Se connecter avec [n'importe quoi] : la connexion OIDC native arrive dans Symfony 8.2"
date: 2026-09-28T09:00:00.000Z
description: "Symfony 8.2, la prochaine version mineure de Symfony, intègre nativement un authentificateur OIDC pour l'Authorization Code Flow. Voici son fonctionnement, pourquoi il est sécurisé par défaut et ce que j'ai appris en le développant."
tags:
  - cross-post
  - sensiolabs
  - symfony
  - security
  - oidc
lang: fr
noindex: true
origin:
  url: https://sensiolabs.com/fr/blog/2026/connexion-oidc-native-arrive-symfony-8-2
  site: SensioLabs
---

**Avant de plonger dans cette nouvelle fonctionnalité, quelques mots sur OIDC**. OpenID Connect est une couche d'identité au-dessus d'OAuth 2.0 : là où OAuth 2.0 accorde l'accès à une ressource via un access token, OIDC vous indique qui est l'utilisateur.

« Log in with Google », « Log in with your company account », « Log in with Keycloak ». Chaque application web finit par avoir besoin de l'un de ces boutons, et la communauté Symfony répond à ce besoin depuis plus d'une décennie. HWIOAuthBundle propulse les connexions sociales et d'entreprise depuis l'époque de Symfony 2. KnpUOAuth2ClientBundle a apporté tout l'écosystème de providers `league/oauth2-client` dans le système de sécurité. Et `drenso/symfony-oidc` est celui qui se consacre spécifiquement à OIDC. Des milliers d'applications connectent leurs utilisateurs via ces bundles aujourd'hui, et je tiens à remercier leurs auteurs avant d'aller plus loin : ils ont ouvert la voie.

À partir de Symfony 8.2, la brique OIDC fait également partie du framework lui-même : un authenticator que vous configurez comme n'importe quel autre, avec des paramètres de sécurité par défaut directement issus de la spécification et maintenus aux côtés du composant Security.

## Genèse

Symfony supporte OIDC depuis la version 6.3, mais dans un seul contexte : lorsque l'application Symfony sert d'API. Dans cette configuration, l'application est un serveur de ressources (Resource Server). Elle ne parle jamais au fournisseur d'identité pour le compte d'un utilisateur : un client, une Single-Page Application (SPA) ou une application mobile obtient un token directement auprès du provider et le transmettent à chaque requête via un header Authorization. L'authenticator `access_token` et ses trois token handlers valident ce token, soit localement via les clés JWK du provider, soit en appelant son endpoint UserInfo, et le mappent à un utilisateur. Symfony vérifie un token qu'il n'a pas demandé, et c'est tout ce dont une API a besoin.

Ce qui manquait, c'est l'autre contexte, l'application web full-stack traditionnelle : des pages rendues côté serveur, un cookie de session, des utilisateurs qui se connectent avec leur navigateur. Là, personne ne transmet un token à l'application. La demande de fonctionnalité est ouverte sur le GitHub de Symfony [depuis juillet 2023](https://github.com/symfony/symfony/issues/50896), et le besoin est partout : un back-office derrière le Keycloak de l'entreprise, une offre SaaS proposant à ses clients enterprise une connexion via leur tenant Microsoft Entra ID, un outil interne derrière Authentik. Le même flow à chaque fois, les mêmes vérifications à chaque fois.

J'ai donc pris le temps de l'écrire, avec un seul objectif en tête : la logique que vous obtenez en ajoutant quelques lignes à `security.yaml` doit être le flow que vous obtiendriez de quelqu'un ayant lu les spécifications de bout en bout. Voyons à quoi cela ressemble.

## L'Authorization Code Flow en soixante secondes

Deux parties communiquent entre elles : votre application Symfony, agissant en tant que Relying Party, et le fournisseur d'identité. Le flow se déroule ainsi :

1. L'utilisateur demande une page protégée. L'application génère un state, un nonce et un verifier PKCE, les associe à la session, et redirige le navigateur vers l'endpoint d'autorisation du provider.
2. L'utilisateur s'authentifie auprès du provider, qui redirige le navigateur vers l'URL de callback de l'application avec un authorization code.
3. L'application vérifie le state, puis échange le code contre des tokens directement avec le token endpoint du provider, sur TLS, en présentant ses identifiants client et le verifier PKCE.
4. Le provider répond avec un ID token et un access token. L'application valide l'ID token, sa signature et ses claims, charge l'utilisateur et ouvre la session.

![Complex diagram with the categories User, Service Provider (Symfony App) and Identity Provider (OIDC Provider) on top and many interactions showing the verifications](/img/sensiolabs/oidc-login-symfony-8-2/mermaid-flowchart.png)

Trois redirections et un appel back-channel. La difficulté n'a jamais été le cas nominal. C'est tout ce qu'il y a autour : quels claims vérifier, que faire du nonce, comment s'assurer que le code reçu est bien celui demandé, comment ne pas faire aveuglément confiance à un document de découverte. C'est la partie dont le framework s'occupe désormais pour vous.

## 5 minutes pour une première connexion

L'authenticator s'appuie sur le composant HttpClient pour échanger avec le provider, et sur `web-token/jwt-library` pour valider l'ID token :

```bash
composer require symfony/http-client web-token/jwt-library
```

Déclarez ensuite un user provider `oidc` et l'authenticator `oidc_login` sur votre firewall. Un client confidentiel (*confidential client*), ce qu'est une application classique rendue côté serveur, a besoin de trois valeurs : l'issuer URL de votre provider, ainsi que le `client_id` et le `client_secret` attribués à votre application, ce dernier étant transmis via l'option `client_authentication`.

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
                scope: ['openid', 'profile', 'email']
```

Remarquez ce qui n'apparaît pas : aucun authorization endpoint, aucun token endpoint, aucune URL JWKS. L'authenticator récupère le document standard `.well-known/openid-configuration` auprès de l'émetteur, y découvre tout ce dont il a besoin, et le met en cache pendant une heure (configurable).

Le provider a besoin d'une route vers laquelle rediriger. Symfony la déclare pour vous via un route loader, exactement comme il le fait pour les routes de déconnexion, et la recette `symfony/security-bundle` l'importe automatiquement :

```yaml
# config/routes/security.yaml
_security_oidc_login:
    resource: security.authenticator.oidc_login.route_loader
    type: service
```

Le callback se trouve par défaut sur `/oidc/callback`, et l'option `check_path` permet de le personnaliser. Enregistrez l'URL complète auprès de votre provider, et c'est terminé : lorsque `oidc_login` est le seul authenticator du firewall capable de démarrer une authentification, il en devient également le point d'entrée, de sorte qu'une requête anonyme vers une page protégée redirige directement vers le provider.

Si votre page de connexion propose plusieurs moyens d'authentification, le même *route loader* déclare une route de démarrage par défaut, `_oidc_login_start_<firewall_name>` sur le chemin `/oidc/start`, qui lance le flow à la demande :

```twig
<a href="{{ path('_oidc_login_start_main') }}">Log in with Keycloak</a>
```

Voilà toute la configuration. Pointez `OIDC_PROVIDER_URI` vers un realm Keycloak tournant dans Docker, et vous aurez un bouton « Log in with » fonctionnel avant même que votre café ne refroidisse.

## Sécurisé par défaut, et ce n'est pas un hasard

C'est la section à laquelle je tiens le plus, car c'est là qu'une implémentation maison et celle que je vous présente divergent. Chaque vérification ci-dessous est activée par défaut. Certaines peuvent être ajustées, aucune ne peut être désactivée par accident.

**State et nonce.** Les deux sont générés à chaque tentative, stockés en session et vérifiés au retour. Le state protège le callback contre le CSRF, le nonce lie l'ID token à la requête qui l'a demandé.

**PKCE, toujours.** Proof Key for Code Exchange est appliqué à chaque requête d'autorisation avec la méthode `S256`. L'authenticator envoie le hash d'un verifier aléatoire et ne révèle ce verifier que lors de l'échange du code d'autorisation, de sorte qu'un code intercepté est inutilisable par un tiers. Vous pouvez passer en mode `plain` pour un provider qui ne supporte rien d'autre, ou le désactiver pour un provider qui rejette le paramètre. Un client public, lui, ne peut pas le désactiver, car c'est la seule chose qui lie le code au client.

**Claims de l'ID token.** `sub` (subject), `iss` (issuer), `aud` (audience), `exp` (expires at) et `iat` (issued at) sont obligatoires et vérifiés ; `nbf` (not before) et `azp` (authorized party) sont vérifiés lorsqu'ils sont présents, et `auth_time` devient obligatoire et vérifié dès que vous définissez `max_age`. Les horloges dérivent, donc `allowed_time_drift` vous offre une tolérance en secondes (par défaut 0).

**Signature de l'ID token.** Vérifiée par défaut contre les clés publiées par le provider sur son `jwks_uri`. Seul `RS256` est accepté d’emblée, le seul algorithme imposé par la spécification pour les providers ; listez ceux qu'annonce le vôtre s'il signe avec un autre. Aucun algorithme HMAC n'est jamais accepté, ainsi une clé publique ne peut jamais être transformée en secret partagé. Les clés sont mises en cache, et un token signé avec une clé inconnue déclenche un nouveau fetch, de sorte qu'une rotation de clés chez le provider ne demande rien de votre côté.

**HTTPS de la découverte jusqu'à chaque endpoint.** `provider_uri` doit être une URL HTTPS, avec une exception pour les hôtes loopback (localhost, 127.0.0.1, ::1) et les domaines de test réservés (`*.localhost`) afin que vous puissiez développer en local. Les endpoints annoncés par le document de découverte doivent également être en HTTPS, et l'issuer qu'il annonce doit correspondre à celui que vous avez configuré, afin qu'un document altéré ou mal configuré ne puisse pas dégrader le flow. Le token endpoint, là où est envoyé votre client secret, suit la même règle : HTTPS obligatoire, hôtes loopback exceptés.

**Pas d'élévation de privilèges via les claims.** Le provider d'utilisateurs `oidc` intégré ne lit jamais les rôles depuis le provider : chaque utilisateur obtient `ROLE_USER`, et tout claim `roles` ou `user_identifier` envoyée par le provider est écarté. Accorder des rôles à partir d'un claim de groupe est une décision propre à votre application, prise dans un user provider qui vous appartient, comme nous le verrons ci-dessous.

Rien de tout cela n'est exotique. C'est ce que la spécification OIDC Core demande à une Relying Party de faire. L'intérêt est que vous n'avez plus besoin de vous en souvenir vous-même.

## Au-delà du cas nominal

Les déploiements réels se résument rarement à l'exemple minimal, l'authenticator intègre donc les options dont vous aurez réellement besoin.

**Vos propres utilisateurs.** Le user provider intégré est le moyen le plus rapide de démarrer, mais la plupart des applications possèdent leur propre entité `User`. Tout user provider implémentant `AttributesBasedUserProviderInterface` reçoit l'identifiant et l'ensemble des claims, et décide quoi en faire :

```php
// src/Security/OidcUserProvider.php
public function loadUserByIdentifier(string $identifier, array $attributes = []): UserInterface
{
    // $identifier is the "sub" claim, $attributes holds every claim
    $user = $this->users->findOneBy(['oidcSubject' => $identifier]) ?? new User($identifier);

    $user->setEmail($attributes['email'] ?? null);
    $user->setRoles(\in_array('admins', $attributes['groups'] ?? [], true) ? ['ROLE_ADMIN'] : []);

    $this->entityManager->persist($user);
    $this->entityManager->flush();

    return $user;
}
```

**D'où viennent les claims.** Certains providers mettent tous les claims demandées dans l'ID token, d'autres n'exposent aucun endpoint UserInfo. `user_data_source: id_token` les lit directement depuis l'ID token validé.

**Quel claim identifie l'utilisateur.** `sub` est le seul claim dont OIDC garantit qu'il est stable et unique. Si vos utilisateurs sont identifiés par un autre claim, `user_identifier_claim: email` s'en charge, avec dans la documentation un avertissement à lire avant de basculer : quiconque contrôle ce claim chez le provider possède le compte correspondant dans votre application.

**Comment l'application s'authentifie sur le token endpoint.** L'option `client_authentication` accepte `client_secret_basic`, `client_secret_post`, `client_secret_jwt`, `private_key_jwt`, `none`, ou l'identifiant d'un service implémentant `ClientAuthenticationInterface`. `none` déclare un client public qui ne détient aucun secret ; PKCE et la vérification de signature deviennent alors obligatoires, et le conteneur refuse de compiler sinon.

**Ajuster la requête d'autorisation.** `max_age` demande une authentification récente au provider et vérifie la claim `auth_time` qu'il doit alors retourner. `authorization_params` transmet tout ce que votre provider comprend d'autre, `prompt`, `ui_locales`, `login_hint`, `acr_values`, tandis que les paramètres dont dépend le flow restent sous le contrôle de l'authenticator. `OidcAuthorizationRequestEvent` permet de les définir par requête plutôt qu'une fois pour le firewall, pour un `ui_locales` tiré de la locale courante par exemple.

**Exiger une authentification récente.** `IS_AUTHENTICATED_RECENTLY`, nouveau en 8.2, protège une action sensible derrière une connexion récente. `oidc_login` n'a rien à configurer pour y répondre : un refus renvoie l'utilisateur chez le provider avec `prompt=login`, et l'authenticator lit le claim `auth_time`, donc une connexion servie depuis une vieille session du provider ne passe pas pour récente.

**Se déconnecter aussi côté provider.** `enable_end_session: true` redirige vers l'`end_session_endpoint` du provider lors de la déconnexion, et `post_logout_redirect_path` indique où atterrir ensuite.

**Appeler les API du provider.** L'ID token et l'access token sont conservés comme attributs du token de sécurité, ainsi `getAttribute('oidc_access_token')` vous donne un bearer token pour les services propres au provider. Pour le renouveler automatiquement via le refresh token grant, demandez un refresh token au provider (scope `offline_access` le plus souvent) et activez l'option `refresh_access_token`.

## Testé avec de vrais providers

Les spécifications sont une chose, les providers réels en sont une autre. Avant que la pull request ne soit mergée, l'authenticator a été testé de bout en bout avec Keycloak, Authelia, Microsoft Entra ID, Gravitee Access Management, Authentik et Google. Il a depuis passé avec succès, en local, la suite de conformité de l'OpenID Foundation sur le plan de certification de base du profil Relying Party (ce n'est pas une certification officielle).

Et ça a fonctionné tout de suite. Authentik annonce son issuer avec un slash final. La spécification exige que l'issuer configuré et celui qu'annonce le document de découverte soient strictement identiques, et l'authenticator retire le slash final de l'URL configurée pour en construire l'URL de découverte : aucune valeur de configuration ne pouvait donc correspondre. Le correctif ignore le slash final dans cette comparaison précise, et uniquement là : le claim `iss` de chaque ID token reste vérifié, caractère par caractère, contre l'issuer annoncé par le provider. Un petit détail, mais le genre de détail qu'on ne découvre qu'en exécutant le code face à de vrais providers.

## Ce que la review a changé

Les reviews ont façonné le résultat au moins autant que le code initial. La vérification de la signature était d'abord prévue comme un suivi, puisque l'ID token vient directement du token endpoint sur TLS ; la review a plaidé avec force pour qu'elle soit vérifiée par défaut avant la sortie de la 8.2, et c'est ce qui se passe désormais.

La règle selon laquelle un provider ne doit jamais pouvoir accorder de rôles via un claim vient d'un audit de sécurité de la branche. La réponse JWKS est plafonnée en taille et récupérée en HTTPS uniquement.

D'autres choix de conception ont traversé la review sans changement : réutiliser l'`OidcUser` existant plutôt que d'introduire un nouveau modèle d'utilisateur, et déclarer la route de callback via un loader plutôt que de vous demander d'écrire un contrôleur.

Un grand merci à [Florent Morselli](https://github.com/spomky) (Spomky), dont la connaissance approfondie des spécifications OpenID a transformé une implémentation fonctionnelle en une implémentation rigoureuse, à [Nicolas Grekas](https://github.com/nicolas-grekas), qui a relu et mergé chaque pull request de la série tout en renforçant la gestion des JWKS, et à [Yonel Ceruto](https://github.com/yceruto), [Robin Chalas](https://github.com/chalasr), [Alexandre Daubois](https://github.com/alexandre-daubois) et [Steffen Gransow](https://github.com/graste) pour leurs relectures et commentaires.

## Et après ?

Symfony 8.2 couvre l'Authorization Code Flow pour un provider par firewall, ce qui répond aux besoins de la grande majorité des applications. La conception laisse de la place pour la suite, et plusieurs sujets sont sur ma liste : plusieurs providers derrière un même firewall, les types de réponses hybrides, les objets de requête signés (signed request objects), la gestion de `session_state` pour la déconnexion initiée par le provider, et l'enregistrement dynamique de clients (dynamic client registration). Si l'un de ces points vous bloque aujourd'hui, le tracker d'issues GitHub est là pour le faire savoir.

## Pour aller plus loin

La documentation Symfony propose une page dédiée, [How to Log in Users with OpenID Connect](https://symfony.com/doc/8.2/security/oidc_login.html), couvrant chaque option mentionnée ici ainsi que quelques autres. Si vous souhaitez voir l'ensemble du flow fonctionner avec différents providers, clonez le [dépôt de démo](https://github.com/welcoMattic/oidc-login-demo) et suivez le README.

## Ressources

- [Documentation Symfony : How to Log in Users with OpenID Connect](https://symfony.com/doc/8.2/security/oidc_login.html)
- [La pull request : symfony/symfony#64954](https://github.com/symfony/symfony/pull/64954)
- [L'application de démo : welcoMattic/oidc-login-demo](https://github.com/welcoMattic/oidc-login-demo)
- [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html)