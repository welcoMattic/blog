#!/bin/bash

# Build og cards images
wget https://github.com/Ladicle/tcardgen/releases/download/v0.9.0/tcardgen_Linux_x86_64.tar.gz
tar -xzf tcardgen_Linux_x86_64.tar.gz
rm tcardgen_Linux_x86_64.tar.gz
./tcardgen -o static/tcard -t og-picture-assets/og-picture-template.png -f og-picture-assets/fonts content/veille/*.md
rm tcardgen
