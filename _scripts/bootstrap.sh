#! /bin/bash

set -eo pipefail


# https://stackoverflow.com/questions/59895/how-can-i-get-the-directory-where-a-bash-script-is-located-from-within-the-scrip
# if you actually think bash is a good programming language you are
# *straight up delusional*
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

cd "$SCRIPT_DIR";
cd ..;

if [ -e I_HAVE_BOOTSTRAPPED_OK ]; then
	echo "Already bootstrapped."
	exit 0
fi

function mvExampleFiles {
	echo "Moving example config files into usable places..."

	cp client/example/.env client/.env

	cp server/example/conf.json5 server/conf.json5
	cp server/example/.env server/.env

	mkdir -p server/local-cdn
	cp -r server/example/default-cdn-contents/* server/local-cdn

	cp bot/example/conf.json5 bot/conf.json5
	cp bot/example/example.env bot/.env

	echo "Moved!"
}

function selfSignHTTPS {
	echo "Self-Signing HTTPS Certificates for local-dev server..."

	# This is for dev servers only! You should use this to
	# create a self-signed HTTPS certificate for local dev.
	# That is it. This is not secure.
	mkdir -p server/cert

	openssl req -x509 -newkey rsa:4096 -keyout server/cert/key.pem -out server/cert/cert.pem -sha256 -days 365 -nodes -subj "/C=AU/ST=TachiExample/L=TachiExample/O=TachiExample/CN=127.0.0.1" &> /dev/null

	echo "Created HTTPS Certificates!"
}

function pnpmInstall {
	echo "Installing dependencies..."

	if ! command -v pnpm &> /dev/null
	then
		echo "Couldn't find pnpm. Can't install dependencies. Install it with npm install -g pnpm."
		exit 1
	fi

	pnpm install

	# install ts-node aswell so people can use that inside enter-seeds.
	pnpm install ts-node -g

	echo "Installed dependencies."
}

function setIndexes {
	echo "Setting indexes..."

	(
		cd server
		pnpm run set-indexes
	)

	echo "Set."

}

function syncDatabaseWithSeeds {
	echo "Syncing database with seeds..."

	(
		cd server

		pnpm run sync-database-local
	)

	echo "Synced."
}

mvExampleFiles
selfSignHTTPS
pnpmInstall
setIndexes
syncDatabaseWithSeeds

echo "Bootstrap Complete."

cat << EOF > I_HAVE_BOOTSTRAPPED_OK
Tachi was bootstrapped here on $(date).

The existence of this file stops Tachi from bootstrapping again.
There's nothing harmful about this -- you can bootstrap as much as you want!
We just don't want to necessarily bootstrap *each* time we boot Tachi.

To bootstrap again (incase you think something has gone wrong)
Delete this file and re-run npm start.
EOF
