# Configure rclone Cellar connection
export RCLONE_CONFIG_MYS3_ACCESS_KEY_ID=$CELLAR_ADDON_KEY_ID
export RCLONE_CONFIG_MYS3_SECRET_ACCESS_KEY=$CELLAR_ADDON_KEY_SECRET
export RCLONE_CONFIG_MYS3_ENDPOINT=$CELLAR_ADDON_HOST
export RCLONE_CONFIG_MYS3_TYPE="s3"

# Download and unpack rclone, hugo and jolitypo
wget https://downloads.rclone.org/v$DL_RCLONE_VERSION/rclone-v$DL_RCLONE_VERSION-linux-amd64.zip
wget https://github.com/gohugoio/hugo/releases/download/v$HUGO_VERSION/hugo_extended_"$HUGO_VERSION"_Linux-64bit.tar.gz
wget https://github.com/jolicode/JoliTypo/releases/download/v1.3.0/jolitypo-8.0.phar
unzip rclone-v$DL_RCLONE_VERSION-linux-amd64.zip
tar xvf hugo_extended_"$HUGO_VERSION"_Linux-64bit.tar.gz

# Build Twitter cards images
./bin/tcardgen -o static/tcard -t og-picture-assets/og-picture-template.png -f og-picture-assets/fonts content/veille/*.md

# Execute JoliTypo
chmod +x ./jolitypo-8.0.phar
php jolitypo-8.0.phar

# Execute the site generation with Hugo
chmod +x ./hugo
./hugo --gc --minify

# Sync the site to Cellar
./rclone-v$DL_RCLONE_VERSION-linux-amd64/rclone sync ./public mys3:$MY_DOMAIN --progress --s3-acl=public-read

clever --help
