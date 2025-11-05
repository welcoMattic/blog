#!/bin/bash

# Fix micro typography
wget https://github.com/jolicode/JoliTypo/releases/download/v1.3.0/jolitypo-8.0.phar
chmod +x ./jolitypo-8.0.phar
php jolitypo-8.0.phar

# Build og cards images
go install github.com/Ladicle/tcardgen@latest
./go/bin/tcardgen -o static/tcard -t og-picture-assets/og-picture-template.png -f og-picture-assets/fonts content/veille/*.md
