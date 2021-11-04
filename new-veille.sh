date=$(date '+%Y-%m-%d')
count=$(ls content/veille/ | wc -l)
count=$((count+1))
filename=${date}-veille-matinale-${count}.md

cp veille-template.md content/veille/${filename}

sed -i "s/__INDEX__/$count/g" content/veille/${filename}
sed -i "s/__DATE__/$date/g" content/veille/${filename}