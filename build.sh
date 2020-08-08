# Configure rclone Cellar connection
export RCLONE_CONFIG_MYS3_ACCESS_KEY_ID=$CELLAR_ADDON_KEY_ID
export RCLONE_CONFIG_MYS3_SECRET_ACCESS_KEY=$CELLAR_ADDON_KEY_SECRET
export RCLONE_CONFIG_MYS3_ENDPOINT=$CELLAR_ADDON_HOST
export RCLONE_CONFIG_MYS3_TYPE="s3"

# Install rclone
wget https://downloads.rclone.org/v$DL_RCLONE_VERSION/rclone-v$DL_RCLONE_VERSION-linux-amd64.zip
unzip rclone-v$DL_RCLONE_VERSION-linux-amd64.zip

# Install stie dependencies and build it
npm install
npm run build

# Sync the site to Cellar
./rclone-v$DL_RCLONE_VERSION-linux-amd64/rclone sync ./public mys3:$MY_DOMAIN --progress --s3-acl=public-read