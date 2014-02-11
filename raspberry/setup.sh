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
apt-get -y install git python build-essential sox nmap alsa-tools alsa-oss flex zlib1g-dev libc-bin libc-dev-bin python-pexpect libasound2 libasound2-dev cvs


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


# add NodeJS and MongoDB to PATH, set ALSADEV for Julius speech recognition

sed -i '/^export PATH/c NODE_JS_HOME="/opt/node"\nexport ALSADEV="plughw:1,0"\nPATH="$PATH:$NODE_JS_HOME/bin:/opt/mongo/bin/"\nexport PATH' /etc/profile

# preserve environment variables when starting NodeJS with sudo
echo 'Defaults env_keep += "ALSADEV NODE_ENV"
' > /etc/sudoers.d/hue
chmod 0440 /etc/sudoers.d/hue


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


# Julius setup
cd /home/pi
sudo -u pi cvs -z3 -d:pserver:anonymous@cvs.sourceforge.jp:/cvsroot/julius co julius4
cd julius4
JULIUSCFLAGS="-O2 -mcpu=arm1176jzf-s -mfpu=vfp -mfloat-abi=hard -pipe -fomit-frame-pointer"
sudo -u pi CFLAGS="$JULIUSCFLAGS" ./configure --with-mictype=alsa
sudo -u pi CFLAGS="$JULIUSCFLAGS" make
CFLAGS="$JULIUSCFLAGS" make install

# Project setup
cd /home/pi
sudo -u pi git clone https://github.com/SBejga/hueper.git
cd hueper/nodejs
sudo -u pi /usr/bin/npm install

# download VoxForge acoustic model
cd /home/pi/hueper/julius
wget http://www.repository.voxforge1.org/downloads/Nightly_Builds/AcousticModel-2014-02-10/HTK_AcousticModel-2014-02-10_16kHz_16bit_MFCC_O_D.tgz
sudo -u pi mkdir acoustic_model_files
sudo -u pi tar xvfz HTK_AcousticModel-2014-02-10_16kHz_16bit_MFCC_O_D.tgz -C acoustic_model_files
rm HTK_AcousticModel-2014-02-10_16kHz_16bit_MFCC_O_D.tgz


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
