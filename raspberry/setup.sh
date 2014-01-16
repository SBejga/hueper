#!/bin/bash

# root check

if [ "$(whoami)" != "root" ]; then
    echo "This script must be run with root privileges!"
    echo "Try sudo $0"
    exit 1
fi


cd /home/pi
mkdir /var/log/hue
chown pi /var/log/hue

# System update and dependency installation

apt-get update
apt-get -y upgrade
apt-get -y install git python build-essential


# NodeJS setup

mkdir /opt/node
wget http://nodejs.org/dist/v0.10.22/node-v0.10.22-linux-arm-pi.tar.gz
tar xvzf node-v0.10.22-linux-arm-pi.tar.gz
cp -r node-v0.10.22-linux-arm-pi/* /opt/node
rm -f -r node-v0.10.22-linux-arm-pi

# Create symlinks for PATH and root access
ln -s /opt/node/bin/node /usr/bin/node
ln -s /opt/node/bin/npm /usr/bin/npm
ln -s /opt/node/lib /usr/lib/node

# Forever setup
/usr/bin/npm install -g forever


# MongoDB setup

mkdir /opt/mongo
git clone https://github.com/brice-morin/ArduPi.git
cp -r ArduPi/mongodb-rpi/mongo/* /opt/mongo
rm -f -r ArduPi
chmod +x /opt/mongo/bin/*
mkdir /data
mkdir /data/db
chown pi /data/db


# add NodeJS and MongoDB to PATH

sed -i '/^export PATH/c NODE_JS_HOME="/opt/node"\nPATH="$PATH:$NODE_JS_HOME/bin:/opt/mongo/bin/"\nexport PATH' /etc/profile


echo '#!/bin/bash

### BEGIN INIT INFO
# Provides: MongoDB
# Required-Start: $remote_fs $syslog
# Required-Stop: $remote_fs $syslog
# Default-Start: 2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: MongoDB Autostart
# Description: MongoDB Autostart
### END INIT INFO

NAME="MongoDB"
EXE=/opt/mongo/bin/mongod
PARAM="--dbpath /data/db"
USER=pi
OUT=/var/log/hue/mongod.log
ERR=/var/log/hue/mongod.error.log
LOCK=/data/db/mongod.lock
PIDFILE=/var/run/mongod.pid

if [ "$(whoami)" != "root" ]; then
    echo "This script must be run with root privileges!"
    echo "Try sudo $0"
    exit 1
fi

case "$1" in

start)

    if [ -s $LOCK ]; then
        echo "repairing MongoDB state"
        rm $LOCK
        sudo -u $USER $EXE $PARAM --repair >> $OUT 2>>$ERR
    fi

    echo "starting $NAME: $EXE $PARAM"
    sudo -u $USER $EXE $PARAM >> $OUT 2>>$ERR &
    echo $! > $PIDFILE
    ;;

stop)
    echo "stopping $NAME"
    kill $(cat $PIDFILE)
    ;;

restart)
    $0 stop
    $0 start
    ;;

*)
    echo "usage: $0 (start|stop|restart)"
esac

exit 0
' > /etc/init.d/mongod

chmod 755 /etc/init.d/mongod
update-rc.d mongod defaults


# Project setup

sudo -u pi git clone https://github.com/SBejga/hueper.git
cd hueper/nodejs
sudo -u pi /usr/bin/npm install
cd /home/pi

echo '#!/bin/bash

### BEGIN INIT INFO
# Provides: Forever NodeJS Hue
# Required-Start: $remote_fs $syslog
# Required-Stop: $remote_fs $syslog
# Default-Start: 2 3 4 5
# Default-Stop: 0 1 6
# Short-Description: Forever NodeJS Hue Autostart
# Description: Forever NodeJS Hue Autostart
### END INIT INFO

NAME="Forever NodeJS"
EXE=/usr/bin/forever
SCRIPT=/home/pi/hueper/nodejs/server.js
USER=pi
OUT=/var/log/hue/forever.log

if [ "$(whoami)" != "root" ]; then
    echo "This script must be run with root privileges!"
    echo "Try sudo $0"
    exit 1
fi

case "$1" in

start)
    echo "starting $NAME: $EXE $PARAM"
    sudo -u $USER $EXE start -a -l $OUT $SCRIPT
    ;;

stop)
    echo "stopping $NAME"
    sudo -u $USER $EXE stop $SCRIPT
    ;;

restart)
    $0 stop
    $0 start
    ;;

*)
    echo "usage: $0 (start|stop|restart)"
esac

exit 0
' > /etc/init.d/forever-hue

chmod 755 /etc/init.d/forever-hue
update-rc.d forever-hue defaults


# finished

echo "Installation complete. Please reboot your device."
