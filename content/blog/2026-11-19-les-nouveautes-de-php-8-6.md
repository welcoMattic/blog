---
title: "Les nouveautés de PHP 8.6"
date: 2026-11-19T09:00:00.000Z
description: "Partial Function Application, Time\\Duration, clamp(), valeurs par défaut des propriétés readonly, enum SortDirection, erreurs de streams en exceptions : tour d'horizon des nouveautés de PHP 8.6 et de ce qu'il faut vérifier avant de migrer."
tags:
  - php
  - php86
lang: fr
---
_This blog post is also available in 🇬🇧 English: [What's new in PHP 8.6](/blog/2026-11-19-whats-new-in-php-8-6/)._

Ça y est, PHP 8.6 sort aujourd'hui ! Comme chaque année, la liste des changements est longue (le fichier [UPGRADING](https://github.com/php/php-src/blob/php-8.6.0/UPGRADING) fait près de 1 200 lignes), et une bonne partie concerne des extensions que vous n'utiliserez peut-être jamais. J'ai donc fait le tri, et voici les nouveautés qui vont changer notre code au quotidien, suivies de ce qu'il faut vérifier avant de migrer.

## [Partial Function Application](https://wiki.php.net/rfc/partial_function_application_v2) (PFA)

C'est LA nouveauté de cette version. Depuis PHP 8.1, la syntaxe first-class callable permet d'écrire `strtoupper(...)` pour obtenir une `Closure` à partir d'une fonction. PHP 8.6 généralise cette idée : on peut désormais appeler une fonction avec seulement une partie de ses arguments, et remplacer les autres par un placeholder. Au lieu d'exécuter la fonction, PHP retourne une `Closure` qui attend les arguments manquants.

Deux placeholders existent :

- `?` remplace exactement un argument ;
- `...` remplace tous les arguments restants.

Un petit avant / après sera plus parlant :

_Avant_

```php
$names = ['  alice ', 'BOB', ' charlie'];

$clean = array_map(
    static fn (string $name): string => str_replace(' ', '', $name),
    $names,
);
```

_Après_

```php
$clean = array_map(str_replace(' ', '', ?), $names);
// ['alice', 'BOB', 'charlie']
```

La `Closure` générée n'est pas une simple boîte noire : elle reprend le nom, le type, la valeur par défaut des paramètres restants et le type de retour de la fonction d'origine. Votre IDE et vos outils d'analyse statique peuvent donc l'inspecter comme n'importe quelle fonction typée.

Le placeholder `...` sert surtout à fixer les premiers arguments et à laisser le reste ouvert :

```php
function greet(string $greeting, string $name, string $punctuation = '!'): string
{
    return "$greeting $name$punctuation";
}

$bonjour = greet('Bonjour', ...);

echo $bonjour('Mathieu');      // Bonjour Mathieu!
echo $bonjour('Mathieu', '?'); // Bonjour Mathieu?
```

Notons qu'on peut aussi fournir tous les arguments et terminer par `...` : on obtient une `Closure` sans paramètre, que l'on pourra exécuter plus tard.

### Avec l'opérateur pipe

C'est là que la PFA prend tout son intérêt. L'opérateur `|>` arrivé avec PHP 8.5 attend, à droite, un callable qui ne prend qu'un seul argument. Jusqu'ici, dès que la fonction en demandait plusieurs, il fallait l'envelopper dans une arrow function. Avec `?`, plus besoin :

```php
$slug = $names
    |> array_map(trim(...), ?)
    |> array_map(strtolower(...), ?)
    |> implode('-', ?);

// alice-bob-charlie
```

Et c'est même plus rapide qu'avant : PHP 8.6 compile désormais un `array_map()` dont le callback est un first-class callable ou une PFA en une boucle `foreach` équivalente, sans créer de `Closure` intermédiaire.

> ⚠ Une PFA dont le nombre de placeholders ne couvre pas les paramètres obligatoires lève une `ArgumentCountError` dès sa création : `greet(?)` donne « Partial application of greet() expects at least 2 arguments, 1 given ».

## [Time\Duration](https://wiki.php.net/rfc/duration_class)

On croise régulièrement un paramètre `$timeout` sans savoir s'il attend des secondes, des millisecondes ou des microsecondes. Et je ne parle pas des API qui séparent `$seconds` et `$microseconds` en deux paramètres, ou de celles qui acceptent un `float`, avec les problèmes de précision qui vont avec 😅

`DateInterval` ne répond pas à ce besoin, car il manipule des jours et des mois, dont la durée varie selon le calendrier et les changements d'heure. PHP 8.6 introduit donc `Time\Duration`, une classe `final readonly` qui représente une durée « au chronomètre », avec une précision à la nanoseconde.

On la crée avec un constructeur nommé par unité :

```php
use Time\Duration;

$timeout = Duration::fromMilliseconds(1500);

$timeout->seconds;     // 1
$timeout->nanoseconds; // 500000000

Duration::fromIso8601DurationString('PT1H30M')->seconds; // 5400
```

Les autres constructeurs sont `fromSeconds()`, `fromNanoseconds()`, `fromMicroseconds()`, `fromMinutes()` et `fromHours()`. Il n'y a pas de `fromDays()`, et c'est voulu : un jour ne fait pas toujours 24 heures. Pour la même raison, une chaîne ISO 8601 qui contient une partie date (`P1D`) lève une `Time\TimeException`.

Les objets sont immuables, chaque opération retourne une nouvelle instance : `add()`, `sub()`, `multiplyBy()`, `divideBy()`, `negate()` et `absolute()`. Les opérateurs de comparaison fonctionnent directement. Voici par exemple le calcul d'un délai de backoff exponentiel :

```php
$baseDelay = Duration::fromMilliseconds(100);
$attempt = 5;

$delay = $baseDelay->multiplyBy(2 ** $attempt); // 3,2 secondes

if ($delay > Duration::fromSeconds(3)) {
    // ...
}
```

Pour trier une liste de durées, `Duration::compare()` s'utilise directement avec `usort()` :

```php
usort($durations, Duration::compare(...));
```

> ℹ Pour l'instant, les fonctions existantes n'acceptent pas de `Duration` : `sleep(Duration::fromSeconds(1))` lève une `TypeError`. La seule API qui l'utilise déjà dans cette version est la nouvelle API de polling, présentée plus bas. La RFC présente cette classe comme la première brique d'une bibliothèque de dates et heures modernisée, la suite viendra donc dans les prochaines versions.

## [clamp()](https://wiki.php.net/rfc/clamp_v2)

Une petite fonction, mais que tout le monde a déjà réécrite au moins une fois. `clamp()` retourne la valeur si elle est comprise entre deux bornes, et la borne la plus proche sinon :

```php
clamp(150, min: 0, max: 100); // 100
clamp(-3, min: 0, max: 100);  // 0
clamp(42, min: 0, max: 100);  // 42
```

Fini le `max(0, min(100, $value))` qu'il fallait relire deux fois pour être sûr de ne pas avoir inversé `min` et `max`. La fonction vérifie aussi ses bornes : si `$min` est supérieur à `$max`, ou si l'une des deux vaut `NAN`, elle lève une `ValueError`.

Elle suit les règles de comparaison habituelles de PHP, elle fonctionne donc aussi avec des chaînes ou des `DateTimeImmutable`. Comme pour `min()` et `max()`, évitez simplement de mélanger les types.

## [Valeurs par défaut des propriétés readonly](https://wiki.php.net/rfc/readonly_property_defaults)

Jusqu'ici, une propriété `readonly` ne pouvait pas avoir de valeur par défaut. La RFC d'origine jugeait cela inutile, puisqu'une telle propriété se comporte comme une constante. Mais depuis PHP 8.4, une interface peut déclarer des propriétés, et une constante ne permet pas de satisfaire ce contrat.

Désormais, ce code fonctionne :

```php
interface Exporter
{
    public string $format { get; }
    public string $mimeType { get; }
}

final readonly class CsvExporter implements Exporter
{
    public string $format = 'csv';
    public string $mimeType = 'text/csv';
}
```

Plus besoin de constructeur ni de getter pour exposer des métadonnées fixes. La valeur par défaut compte comme l'initialisation de la propriété : toute affectation ultérieure, y compris dans le constructeur, lève une `Error` (« Cannot modify readonly property CsvExporter::$format »).

## [L'enum SortDirection](https://wiki.php.net/rfc/sort_direction_enum)

`SORT_ASC` et `SORT_DESC` pour `array_multisort()`, `SCANDIR_SORT_ASCENDING` pour `scandir()`, des chaînes `'ASC'` et `'DESC'`, des booléens `$ascending`... Chaque bibliothèque a fini par créer son propre type pour exprimer un sens de tri. Doctrine, par exemple, a introduit son propre enum `Order`.

PHP 8.6 ajoute dans l'espace de noms global un enum `SortDirection`, avec deux cas : `Ascending` et `Descending`.

```php
function sortBy(array $items, SortDirection $direction = SortDirection::Ascending): array
{
    usort($items, fn ($a, $b) => match ($direction) {
        SortDirection::Ascending => $a <=> $b,
        SortDirection::Descending => $b <=> $a,
    });

    return $items;
}

sortBy([3, 1, 2], SortDirection::Descending); // [3, 2, 1]
```

L'enum n'est pas backed : il n'y a pas de représentation scalaire unique qui conviendrait à tous les usages. Si vous avez besoin de `'ASC'` pour une requête SQL ou `'desc'` pour un paramètre d'URL, un `match` suffit.

L'intérêt de cet enum est surtout d'offrir un type commun que les frameworks et bibliothèques pourront accepter. La RFC évoque d'ailleurs son utilisation future dans la bibliothèque standard, par exemple pour le second paramètre de `scandir()`.

## [Les erreurs de streams en exceptions](https://wiki.php.net/rfc/stream_errors)

Les fonctions de streams (`fopen()`, `file_get_contents()`, etc.) signalent leurs erreurs par des warnings, ce qui oblige à jongler avec `@`, `error_get_last()` ou un error handler temporaire. PHP 8.6 ajoute une option de contexte `error_mode` pour leur demander de lever une exception à la place :

```php
$context = stream_context_create([
    'stream' => [
        'error_mode' => StreamErrorMode::Exception,
    ],
]);

try {
    $handle = fopen('/nope/config.json', 'r', false, $context);
} catch (StreamException $e) {
    echo $e->getMessage();
    // Failed to open stream: No such file or directory

    $error = $e->getErrors()[0];
    echo $error->wrapperName; // plainfile
    echo $error->code->name;  // OpenFailed
}
```

L'exception transporte des objets `StreamError` structurés, avec le wrapper concerné et un code sous forme d'enum (`StreamErrorCode`). On peut aussi choisir `StreamErrorMode::Silent` et récupérer les erreurs après coup avec `stream_last_errors()`. Sans cette option, rien ne change : les streams émettent toujours des warnings. C'est ce que désigne `StreamErrorMode::Error`, la valeur par défaut, dont le nom fait référence au système d'erreurs classique de PHP (warnings et notices).

## [Une API de polling](https://wiki.php.net/rfc/poll_api)

Celle-ci concerne surtout les auteurs de bibliothèques asynchrones comme AMPHP ou ReactPHP. Jusqu'ici, PHP ne proposait que `stream_select()`, basé sur l'appel système `select()`, limité en nombre de descripteurs et peu performant à grande échelle. Le nouveau namespace `Io\Poll` donne accès aux mécanismes modernes de chaque système (`epoll` sous Linux, `kqueue` sous macOS et BSD) derrière une API unique :

```php
use Io\Poll\{Context, Event};
use Time\Duration;

$poll = new Context(); // choisit le meilleur backend disponible
$poll->add(new StreamPollHandle($socket), [Event::Read], data: 'client #1');

foreach ($poll->wait(Duration::fromSeconds(1)) as $watcher) {
    if ($watcher->hasTriggered(Event::Read)) {
        echo $watcher->getData(), ' : ', fgets($socket);
    }
}
```

Vous remarquerez que `wait()` prend un `Time\Duration` en paramètre de timeout 😉

## Avant de migrer

Comme toujours, une version mineure apporte son lot de changements de comportement et de dépréciations. Voici ceux qui risquent de vous concerner.

### Les sessions sont sécurisées par défaut

C'est le changement le plus susceptible d'avoir un effet visible. [Trois directives de session](https://wiki.php.net/rfc/session_security_defaults) changent de valeur par défaut :

- `session.use_strict_mode` passe à `1` : PHP refuse un identifiant de session non initialisé (sans entrée correspondante dans le stockage), ce qui protège contre la fixation de session ;
- `session.cookie_httponly` passe à `1` : le cookie de session n'est plus lisible en JavaScript ;
- `session.cookie_samesite` passe à `Lax` : le cookie n'est plus envoyé sur les requêtes cross-site, hormis les navigations de premier niveau avec une méthode HTTP sûre comme GET.

Si votre application lit le cookie de session côté JavaScript, ou reçoit des formulaires POST depuis un autre domaine (un retour de paiement, par exemple), vérifiez ce point avant de déployer. Les handlers de session personnalisés qui acceptaient n'importe quel identifiant fourni par le client devront implémenter `validateId()` et `create_sid()`, ou désactiver explicitement le strict mode.

### Les arguments dans les messages d'erreur

Une nouvelle directive [`error_include_args`](https://wiki.php.net/rfc/display_error_function_args) ajoute les arguments passés aux fonctions natives dans leurs messages d'erreur. Elle est désactivée par défaut, mais elle vaut le coup en développement :

```
Warning: unlink(): No such file or directory in /app/script.php on line 2
```

devient, avec `error_include_args=1` :

```
Warning: unlink('/tmp/does-not-e...'): No such file or directory in /app/script.php on line 2
```

Les chaînes sont tronquées selon `zend.exception_string_param_max_len` (15 caractères par défaut), et les paramètres marqués `#[\SensitiveParameter]` restent masqués.

### Les dépréciations

La liste complète est dans [la RFC des dépréciations de PHP 8.6](https://wiki.php.net/rfc/deprecations_php_8_6) et dans le fichier UPGRADING. Celles que vous risquez le plus de croiser :

- retourner une valeur depuis `__construct()` ou `__destruct()` ;
- utiliser `return` dans un bloc `finally` ;
- les alias `is_integer()`, `is_long()`, `is_double()` et `doubleval()`, au profit de `is_int()`, `is_float()` et `floatval()` ;
- `spl_object_hash()`, à remplacer par `spl_object_id()` ;
- les méthodes CSV de `SplFileObject` (`fgetcsv()`, `fputcsv()`, `setCsvControl()`, `getCsvControl()`) ;
- l'extension mbregex (les fonctions `mb_ereg*`), car la bibliothèque Oniguruma n'est plus maintenue ;
- le troisième argument de `define()`.

```
Deprecated: Returning a value from a constructor is deprecated in /app/Foo.php on line 2
Deprecated: Returning from a finally block is deprecated in /app/Foo.php on line 3
Deprecated: Function is_integer() is deprecated since 8.6, use is_int() instead in /app/Foo.php on line 4
```

ProTips© : la plupart de ces dépréciations se corrigent mécaniquement. Activez `E_DEPRECATED` sur votre CI dès maintenant, et vous serez tranquille le jour où elles deviendront des erreurs.

Enfin, quelques changements plus discrets : `trim()`, `ltrim()` et `rtrim()` retirent désormais aussi le caractère form feed (`\f`) par défaut, et `preg_grep()` retourne `false` en cas d'erreur PCRE au lieu d'un tableau partiel, comme les autres fonctions `preg_*`.

## En conclusion

La Partial Function Application vient compléter l'opérateur pipe de PHP 8.5, `Time\Duration` pose les bases d'une nouvelle API de dates, et des ajouts comme `clamp()` ou `SortDirection` vont faire disparaître pas mal de code utilitaire de nos projets.

Bonne migration ! 🚀
