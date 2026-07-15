---
title: "[JoliCode] Initialiser rapidement une API REST avec Laravel"
date: 2016-10-24T09:00:00.000Z
description: "Dernièrement, nous avons développé une API REST pour l'un de nos projets clients. Une des exigences était de développer cette API avec Laravel 5. Elle était accompagnée d'une application cliente développée au sein"
tags:
  - cross-post
  - jolicode
  - php
  - laravel
  - api
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/initialiser-rapidement-une-api-rest-avec-laravel
  site: JoliCode
---

Dernièrement, nous avons développé une API REST pour l’un de nos projets clients. Une des exigences était de développer cette API avec [Laravel](https://laravel.com) 5. Elle était accompagnée d’une application cliente développée au sein du même projet Laravel avec Blade ainsi que quelques composants [React](https://facebook.github.io/react/). Nous allons vous détailler dans cet article les bonnes pratiques et les packages utiles que nous avons utilisés pour mener à bien ce projet.

## Package or not package

La première question que nous nous sommes posé a été de savoir si nous allions utiliser un package mettant à disposition l’outillage classique pour créer une API REST ou bien si nous développions nous même la base de cette API.

Avant de lister les packages existants pour développer une API REST, nous avons listé les différents besoins/contraintes du client :

-   Versioning de l’API ;
-   Gestion fine des permissions d’accès aux points d’entrées de l’API ;
-   Transformation des données en fonction de paramètres passés dans les requêtes HTTP ;
-   Authentification via un LDAP ;
-   Base de données Oracle.

Nous avons donc exploré sur [Packagist.org](https://packagist.org) les différentes solutions correspondantes :

-   [API-Guard](https://github.com/chrisbjr/api-guard) :
    -   Support de Laravel 5.x ;
    -   Permet de générer des clés d’API ;
    -   Permet la transformation de Response via [Fractal](https://github.com/thephpleague/fractal) ;
    -   Permet de limiter l’accès à l’API dans le temps (rate limit) ;
    -   Très peu de documentation.
-   [Dingo/api](https://github.com/dingo/api) :
    -   Plus de 4600 stars sur GitHub ;
    -   Support de Laravel 5.x ;
    -   Gestion de l’authentification (HTTP Basic, JWT, Oauth2) ;
    -   Permet la transformation de Response via [Fractal](https://github.com/thephpleague/fractal) ;
    -   Permet le versioning de l’API ;
    -   Permet de limiter l’accès à l’API dans le temps (rate limit) ;
    -   Permet d’effectuer des requêtes internes ;
    -   Documentation détaillée.

Nous avons très rapidement choisi dingo/api pour sa popularité, sa documentation et ses fonctionnalités (notamment le versionning). En dépit du fait que ce package soit toujours en 1.0.0-beta6, il est plutôt stable, et maintenu au jour le jour.

## Pluto, c’est le chien de Mickey. L’ami de Mickey, c’est Dingo.

#### Première étape, on installe dingo/api

```bash
$ composer require dingo/api
```

On ajoute ensuite le service provider à notre fichier de configuration `config/app.php` :

```php
'providers' => [
    ...
    Dingo\Api\Provider\LaravelServiceProvider::class,
],
```

Puis, on publie le fichier de configuration de dingo/api :

```bash
$ php artisan vendor:publish --provider="Dingo\Api\Provider\LaravelServiceProvider"
```

En option, on peut ajouter les Facades dans notre fichier `config/app.php` :

```php
'aliases' => [
    ...
    'DingoApi' => Dingo\Api\Facade\API::class,
    'DingoRoute' => Dingo\Api\Facade\Route::class,
],
```

Ces Facades nous permettrons d’accéder par exemple au Dispatcher de notre API, au Router, ou à la Request courante.

#### Deuxième étape, on configure dingo/api

Voici les principaux paramètres de configuration, à ajouter dans le fichier .env de votre application :

```
API_PREFIX=api
API_VERSION=v1
API_NAME="My API"
API_DEBUG=true
```

Ils sont assez explicites, et [très bien documentés](https://github.com/dingo/api/wiki/Configuration). Il existe d’autres paramètres de configuration comme la gestion des erreurs, de l’authentification ou des formats de réponse.

#### Troisième étape, on créé notre premier point d’entrée

Depuis Laravel 5.3, les fichiers de routes (`api.php`, `web.php` et `console.php`) sont placés dans `routes/`, auparavant il n’y en avait qu’un (`routes.php`) qui était dans `app/Http`. Nous utilisons Laravel 5.3, donc nous allons utiliser le fichier `routes/api.php` pour déclarer nos points d’entrée.

```php
use Dingo\Api\Routing\Router;

$api = app(Router::class);

$api->version('v1', [], function (Router $api) {
    $api->get('conferences', 'App\Http\Controllers\Api\V1\ConferenceController@index');
});
```

Ici, on déclare un point d’entrée `/api/conferences` pointant sur la méthode `index` du controller `ConferenceController`. Vous aurez remarqué que le controller ne se trouve pas à la racine du dossier `Controllers`, mais dans un sous dossier `API\V1` et ceci en prévision d’une prochaine version de l’API dans laquelle on pourra modifier le comportement de notre méthode sans impacter la V1.

Admettons que notre point d’entrée soit destiné à lister des conférences, voici à quoi peut ressembler l’action `index` :

```php
namespace App\Http\Controllers\Api\V1;

use App\Http\Transformers\ConferenceTransformer;
use App\Models\Conference;
use Dingo\Api\Contract\Http\Request;
use Dingo\Api\Http\Response;
use Dingo\Api\Routing\Helpers;
use Illuminate\Routing\Controller;

class ConferenceController extends Controller
{
    use Helpers;

    public function index(Request $request) : Response
    {
        return $this->response->collection(Conference::all(), new ConferenceTransformer);
    }
}
```

Dingo/api va se charger pour nous d’appliquer le bon code HTTP de retour (ici 200).

Et voici, notre classe `ConferenceTransformer` :

```php
namespace App\Http\Transformers;

use App\Models\Conference;
use League\Fractal\TransformerAbstract;

class ConferenceTransformer extends TransformerAbstract
{
    public function transform(Conference $conference) : array
    {
        return [
          'name' => $conference->name,
          'dates' => 'Du ' . $conference->start . ' au ' . $conference->end,
          'location' => $conference->city . ', ' . $conference->country,
          'tags' => $conference->tags->implode(', ');
        ];
    }
}
```

Si l’on appelle notre API sur cette URL avec un client cURL, voici le résultat que nous devrions avoir :

```bash
$ curl http://my-api.dev/api/conferences
```

```json
{
  "data": [
    {
      "name": "Forum PHP 2016",
      "dates": "Du 27/10/2016 au 28/10/2016",
      "location": "Paris, France",
      "tags": "php, web, symfony, unicode, gif"
    },
    {
      "name": "Blend Web Mix",
      "dates": "Du 02/11/2016 au 03/11/2016",
      "location": "Lyon, France",
      "tags": "web, biz, tech, marketing"
    }
  ]
}
```

### Requêtes internes

Comme nous le disions plus haut, dingo/api permet de faire des requêtes internes, voici comment :

Imaginons une route classique qui rendrait une vue Blade listant les conférences :

`web.php`

```php
...
Route::get('conferences', 'ConferenceController@list');
```

```twig
@extends('layouts.default')

@section('title')
    @lang('conferences.page.title')
@endsection

@section('content')
    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12">
                <h2 class="text-uppercase text-center">
                    @lang('conferences.page.title')
                </h2>
                <hr>
                <ul>
                    @foreach($conferences as $c)
                        <li>{{ $c->name }} - {{ $c->dates }} à {{ $c->location }}</li>
                    @endforeach
                </ul>
            </div>
        </div>
    </div>
@endsection
```

Dans l’action nous avons ceci :

```php
namespace App\Http\Controllers;

use App\Models\Conference;
use Dingo\Api\Routing\Helpers;
use Illuminate\View\View;

class ConferenceController extends Controller
{
    use Helpers;

    public function list() : View
    {
        $conferences = $this->api->get('/conferences/');
        return \View::make('conferences.list', $conferences);
    }
}
```

Et voilà comment nous pouvons très simplement interroger notre API en interne, c’est-à-dire sans déclencher de requête HTTP.

### Authentification basique

Pour cet exemple, nous allons voir comment mettre en place une authentification HTTP Basic avec comme identifiants un email et un mot de passe.

Tout d’abord, nous configurons dingo/api. Pour cela, ouvrons le fichier `app/Providers/AuthServiceProvider.php`, et ajoutons ce morceau de code dans la méthode `boot` :

```php
public function boot()
{
    ...
    app('Dingo\Api\Auth\Auth')->extend('basic', function ($app) {
       return new \Dingo\Api\Auth\Provider\Basic($app['auth'], 'email');
    });
}
```

Ici, l’authentification demandera un email valide (présent en base de données), et le mot de passe associé. Bien sûr, le champ `email` est ici arbitraire, vous pouvez utiliser un champ `username` si vous le souhaitez.

Nous n’avons plus qu’a protéger nos points d’entrée en rajoutant l’option `middleware` dans le fichier de routes, `routes/api.php` dans notre cas :

```php
$api->version('v1', ['middleware' => 'api.auth'], function (Router $api) {
    $api->get('conferences', 'App\Http\Controllers\Api\V1\ConferenceController@index');
});
```

Attention, avec l’ajout de l’authentification sur notre point d’entrée `api/conferences`, notre requête interne décrite plus haut sera soumise à cette même authentification. Il faudra donc appliquer l’authentification classique sur la route `conference.list` :

`web.php`

```php
...
Route::get('conferences', 'ConferenceController@list')->middleware('auth');
```

Puis dans l’appel interne, nous indiquons être un utilisateur authentifié afin d’accéder à l’API :

```php
public function list() : View
{
    $conferences = $this->api->be(auth()->user())->get('/conferences/');
    return \View::make('conferences.list', $conferences);
}
```

ProTips © : ici `auth()` est une méthode globale proposée par Laravel afin d’accéder à la Facade Auth qui nous renvoie le Service `AuthManager` afin de récupérer l’utilisateur courant.

* * *

Nous avons ici initié rapidement une API REST, avec une authentification simple, sans restrictions d’accès pour faire un article plutôt court (sinon nous serions encore en train de l’écrire). Pour approfondir les exemples de points d’entrées (POST, PUT et DELETE), vous pouvez vous référer à la [documentation](https://github.com/dingo/api/wiki/) de dingo qui est plutôt complète, ainsi qu’à celle de [Fractal](http://fractal.thephpleague.com/) pour les Transformers.

Et si vous souhaitez en savoir plus sur Laravel, nous vous invitons à vous inscrire sur la page [Meetup Laravel Paris](http://www.meetup.com/fr-FR/Paris-Laravel-Meetup/), et à nous rejoindre lors du prochain rendez-vous, nous y serons !

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/initialiser-rapidement-une-api-rest-avec-laravel', max\_shown\_comments: 20, theme: 'light', page\_title: "Initialiser rapidement une API REST avec Laravel", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));

## Nos articles sur le même sujet

### [Retour d’expérience d’un développeur Symfony qui découvre Laravel](https://jolicode.com/blog/retour-dexperience-dun-developpeur-symfony-qui-decouvre-laravel)

En tant que développeur PHP junior, mon expérience s’est jusqu’à aujourd’hui limitée à Symfony. Curieux de nature, j’ai décidé de me lancer dans l’aventure Laravel, un framework réputé pour sa simplicité et sa…

04/07/2024

par Julien Cousin-Alliot

## Ces clients ont profité de notre expertise
