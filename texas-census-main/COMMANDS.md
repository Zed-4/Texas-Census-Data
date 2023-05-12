# creates ssh key to access gitlab
# for git clone to work
# without ssh key gitlab will deny access

ssh-keygen -t ed25519 -C "abtin.ortgoli@yahoo.com"
cat ~/.ssh/id_ed25519.pub
git clone git@gitlab.com:mastery-sh/texas-census.git

# upgrades npm to the latest version
npm i -g npm
# install latest version of yarn in global scope (-g means global)
npm i -g yarn

# install packages, like npm install but better
yarn install

# see package.json file
yarn dev