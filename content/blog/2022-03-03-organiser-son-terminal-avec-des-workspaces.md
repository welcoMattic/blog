---
title: "[JoliCode] Organiser son terminal avec des workspaces"
date: 2022-03-03T09:00:00.000Z
description: "Si comme nous, il vous arrive d'avoir à passer d'un projet à un autre, ou simplement si vous appréciez avoir plusieurs onglets de terminal ouverts pour un même projet, ou encore que vous avez souvent plusieurs"
tags:
  - cross-post
  - jolicode
  - terminal
  - tmux
  - zellij
lang: fr
noindex: true
origin:
  url: https://jolicode.com/blog/organiser-son-terminal-avec-des-workspaces
  site: JoliCode
---

⌛ Cet article a maintenant 4 ans et 4 mois. Or, les techniques et outils qui y sont présentés ont certainement évolué, de même que l’état de l’art sur le sujet. N’hésitez pas à [nous contacter](https://jolicode.com/contact) pour bénéficier de notre expertise au goût du jour !

Si comme nous, il vous arrive d’avoir à passer d’un projet à un autre, ou simplement si vous appréciez avoir plusieurs onglets de terminal ouverts pour un même projet, ou encore que vous avez souvent plusieurs projets ouverts en parallèle, vous allez adorer la suite !

## Des workspaces ?

Pour compartimenter un terminal (avoir plusieurs onglets, ou séparer un onglet en 2 panneaux), il existe plusieurs solutions :

![Exemple de panes tmux](/img/jolicode/organiser-son-terminal-avec-des-workspaces/tmux-panes-examples.gif)

-   Directement avec votre terminal si vous utilisez iTerm2 sur macOS, Terminator ou Gnome Terminal sur Linux, ou encore Windows Terminal sur Windows ;
-   Avec un multiplexeur comme **tmux** (nous allons voir comment juste après).

Parmi les avantages de compartimenter une fenêtre de terminal, il y a un plus grand confort pour s’organiser, avec par exemple une fenêtre par projet, et dans chaque fenêtre les onglets/panneaux nécessaires au projet (un shell, les logs d’une application, un shell distant, …).

## Classic way : tmux

(Pour les vieux de la vieille, il y a `screen`, mais nous allons nous concentrer sur les logiciels écrits au XXIème siècle 😅)

[tmux](https://github.com/tmux/tmux) est un multiplexeur de terminaux, il permet, entre autres, d’utiliser plusieurs terminaux virtuels dans une seule fenêtre de terminal.

> Dans le vocabulaire `tmux`, une _window_ `tmux` correspond à un onglet et qu’une session `tmux` correspond à un _workspace_ (un ensemble d’onglets).

Voyons maintenant comment scripter une session `tmux` pour un projet !

```js
# tmux-workspaces.sh

function session-project1 {
    tmux new-session -d -s $1 -n base -c $HOME/dev/projects/project1
    tmux new-window -t $1 -n logs -c $HOME/dev/projects/project1
    tmux new-window -t $1 -n shell -c $HOME/dev/projects/project1
}

function session-project2 {
    tmux new-session -d -s $1 -n base -c $HOME/dev/projects/project2
    tmux new-window -t $1 -n logs -c $HOME/dev/projects/project2
    tmux new-window -t $1 -n docker -c $HOME/dev/projects/project2
    tmux new-window -t $1 -n shell -c $HOME/dev/projects/project2
}

# On s'assure que la/les sessions que l'on souhaite créer n'existe pas déjà,
# et le cas échéant, on exécute la fonction qui permet de créer
# la session tmux avec ses différents onglet/panneaux
for session in $1; do
    tmux has-session -t $session 2>/dev/null
    if [[ $? == 0 ]]; then
        continue
    fi
    session-$session $session
done
```

On démarre notre session avec la commande suivante `tmux-workspaces.sh project1` ou `tmux-workspaces.sh project1 project2` si l’on souhaite démarrer les 2 sessions.

**ProTips©** : pensez à ajouter les permissions d’exécution au fichier `tmux-workspaces.sh`

## Level up : tmux + tmuxp

Maintenir des sessions dans un script bash n’est pas la façon la plus aisée de faire. De plus, elle a un gros inconvénient : comment définir précisément les dimensions des _panes_ ? Par exemple deux _panes_, un occupant 30% de la largeur de la fenêtre, et l’autre les 70% restants.

> Un _pane_ dans le vocabulaire `tmux` est une division d’une _window_

C’est là qu’intervient **[tmuxp](https://github.com/tmux-python/tmuxp)**. C’est un session-manager pour `tmux`, écrit en Python. Comme son nom l’indique, nous allons pouvoir gérer nos différentes sessions `tmux` via cet outil et quelques fichiers YAML.

ℹ Un équivalent à `tmuxp` existe en Ruby, [tmuxinator](https://github.com/tmuxinator/tmuxinator).

Tentons de reproduire notre script `tmux` pour le projet 1 précédent avec `tmuxp`:

⚠ Notons que `tmuxp` exige de faire un fichier YAML par session.

```yaml
# project1.yaml
session_name: project1
start_directory: $HOME/dev/projects/project1
windows:
  - window_name: project1
    focus: true
    layout: 6640,171x41,0,0{118x41,0,0,1,52x41,119,0[52x20,119,0,2,52x20,119,21,3]}
    panes:
        - shell_command:
            - symfony serve -d
          focus: true
        - yarn run watch
        - tail -f var/log/dev.log
```

Ici, nous ne créons qu’une _window_ que nous divisons en 3 _panes_, l’un avec le serveur web de notre application qui se lance en arrière plan, le 2ème avec webpack pour _watcher_ nos assets front, et le dernier avec un `tail` pour avoir les logs en temps réel.

![Capture d'écran d'une session tmux avec 3 panes](/img/jolicode/organiser-son-terminal-avec-des-workspaces/tmux-workspace-symfony.png)

Vous constatez que l’option `layout` n’est pas facilement facilement lisible pour des humains, c’est un des points faibles de `tmuxp` : pour modifier le _layout_, il faut le faire manuellement avec `tmux` (lorsque la session est démarrée), puis utiliser la commande `tmuxp freeze` pour _dump_ un nouveau fichier, récupérer la valeur de `layout` et la coller dans notre fichier YAML.

On arrive à quelque chose de plus sympa et pratique à utiliser, mais pas encore optimal. Voyons s’il est possible d’aller encore plus loin !

## Quoi ? tmux évolue ! Félicitations, votre tmux évolue en zellij !

![Animation d'évolution d'un pokémon](/img/jolicode/organiser-son-terminal-avec-des-workspaces/evolution-pokemon.gif)

[zellij](https://zellij.dev) est également un multiplexeur de terminaux. Contrairement à `tmux` qui est écrit en C, `zellij` est écrit en Rust. De plus, il contient par défaut un gestionnaire de plugins, une mécanique de _layouts_, et la possibilité de personnaliser le thème d’affichage.

> Depuis la version 0.25, `zellij` embarque un mode de compatibilité « tmux » qui permet d’utiliser les contrôles de `tmux` pour interagir avec `zellij` (ctrl+b comme préfixe).

Voyons maintenant comment créer la même session configurée précédemment avec `tmuxp` mais avec `zellij` cette fois-ci.

La configuration globale de `zellij` peut être définie dans un fichier YAML. Pour l’initialiser, lançons la commande `zellij setup --dump-config > ~/.config/zellij/config.yaml`. Nous pourrons modifier plus tard ce fichier afin de changer certaines options.

Pour définir notre session, nous avons plusieurs choix :

-   La créer manuellement, puis demander à `zellij` de la sauvegarder dans un fichier YAML ;
-   Écrire nous même ce fichier YAML

Selon la complexité de la session que vous souhaitez créer, à vous de choisir l’option la plus appropriée.

Pour exemple, voici le fichier permettant d’obtenir une session similaire à celle créée précédemment :

```yaml
# project1.yaml
---
template:
  direction: Horizontal
  parts:
    - direction: Vertical # tab bar (top)
      borderless: true
      split_size:
        Fixed: 1
      run:
        plugin:
          location: "zellij:tab-bar"
    - direction: Vertical # body (center)
      body: true
    - direction: Vertical # status bar (bottom)
      borderless: true
      split_size:
        Fixed: 2
      run:
        plugin:
          location: "zellij:status-bar"

tabs:
  - direction: Vertical
    parts:
      - direction: Horizontal
        split_size:
          Percent: 70
        run:
          command: {cmd: "bash", args: ["-c", "cd $HOME/dev/projects/project1 && symfony serve -d && $SHELL"]}
      - direction: Horizontal
        parts:
          - direction: Vertical
            run:
              command: {cmd: "bash", args: ["-c", "cd $HOME/dev/projects/project1 && yarn run watch"]}
          - direction: Vertical
            run:
              command: {cmd: "bash", args: ["-c", "cd $HOME/dev/projects/project1 && tail -f var/log/dev.log"]}
```

![Capture d'écran d'une session zellij avec 3 panes](/img/jolicode/organiser-son-terminal-avec-des-workspaces/zellij-demo.png)

On remarque ici quelques répétitions, en effet `zellij` ne permet pas encore de définir un répertoire par défaut pour chaque _pane_ ouvert dans une session. Nous sommes contraints d’utiliser `&& $SHELL` pour récupérer la main après l’exécution d’une commande non bloquante.

Contrairement à `tmuxp`, avec `zellij` il est bien plus simple de personnaliser son _layout_ manuellement dans le fichier YAML, avec les options comme `direction` et `split_size` qui sont beaucoup plus facilement compréhensibles que l’option `layout` de `tmuxp`.

Mais tout cela est dans la roadmap du projet. Même chose pour la possibilité d’exécuter plusieurs commandes successives à la création d’un _tab_ ou d’un _pane_.

La [documentation des _layouts_ et des _templates_](https://zellij.dev/documentation/layouts.html) peut vous être utile pour aller plus loin.

Le projet n’est pas encore en version 1.0, mais il est déjà stable pour une utilisation basique et l’effort de développement est très soutenu.

Il est d’ores et déjà possible de [créer vos propres plugins](https://zellij.dev/documentation/plugin-rust.html), et ce dans le langage de votre choix, tant qu’il est supporté par WASM. Cependant il est recommandé de le faire en Rust pour le moment car c’est dans ce langage que sont développés les premiers plugins, et qu’ils peuvent servir d’exemples.

## N’ayez plus peur de fermer votre terminal

Avec tous ces outils, il n’y a plus de raison d’avoir peur de fermer votre terminal avec 12 onglets ouverts, pour lesquels vous auriez passé 30 minutes à tous les rouvrir et réorganiser votre espace de travail.

Simplifiez vous la vie en quelques lignes de YAML pour démarrer facilement chacun de vos projets ! Parlez-en à vos collègues, qui sait, peut-être que vous parviendrez à les convaincre et à maintenir un _workspace_ `tmux` ou `zellij` en commun pour certains de vos projets !

### Commentaires et discussions

let commentsLoaded = false; var remark\_config = { host: 'https://jolicode.com/comments', site\_id: 'jolicode', components: \['embed'\], url: 'https://jolicode.com/blog/organiser-son-terminal-avec-des-workspaces', max\_shown\_comments: 20, theme: 'light', page\_title: "Organiser son terminal avec des workspaces", locale: 'fr', show\_email\_subscription: false }; const observer = new IntersectionObserver((entries) => { if (commentsLoaded || entries\[0\].intersectionRatio <= 0) return; commentsLoaded = true; !function(e,n){for(var o=0;o<e.length;o++){var r=n.createElement("script"),c=".js",d=n.head||n.body;"noModule"in r?(r.type="module",c=".mjs"):r.async=!0,r.defer=!0,r.src=remark\_config.host+"/web/"+e\[o\]+c,d.appendChild(r)}}(remark\_config.components||\["embed"\],document); }, { root: null, rootMargin: '0px 0px 400px 0px', }); observer.observe(document.getElementById('remark42'));
