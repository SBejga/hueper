hueper
======

**!!! WORK IN PROGRESS !!!**

This software is part of a study project done by @fairylands and @kryops at DHBW Stuttgart in 2013/14.

It provides a Node.JS + MongoDB backend and a real-time cross-platform mobile web frontend for extended control and automation of the Philips Hue lights, intended for usage on a Raspberry Pi together with an Arduino. Its features include:

-   Existing functions of the Hue Bridge (control of lights, groups, user administration, firmware update)
-   Save Favorite color settings
-   Scenes
-   Flexible scheduling and automation framework
-   Environment sensors provided by the Arduino
-   Control through RFID/NFC tags
-   Network device recognition
-   Speech recognition (online with Google Speech API or offline with Julius)
-   Party mode for time- and sound-controlled light changes
-   All functions controllable via Socket.IO or a REST API, real-time synchronization between clients

Licensed under the Apache License. The complete documentation is available in the *docs* folder (German only!).


## Installation

Complete hardware list in *docs/planung/hardware.md* (German)

### Dependencies

#### Linux

    sudo apt-get install git python build-essential nodejs mongodb arduino sox nmap julius
    sudo usermod -aG dialout USERNAME

#### Windows

-   NodeJS: http://nodejs.org/download/
-   MongoDB: http://www.mongodb.org/downloads (start with `C:\<Path>\bin\mongod.exe --dbpath "C:\<Data directory>"`)
-   Git: http://msysgit.github.io/
-   Phyton **(Version 2.x!)**: http://python.org/download/
-   Arbitrary version of Visual Studio (or Express), e.g. http://www.visualstudio.com/downloads/download-visual-studio-vs#d-express-windows-desktop
-   SoX: http://sourceforge.net/projects/sox/files/sox/14.4.1/ (Install in *C:\Program Files (x86)\sox-14-4-1* or add to PATH)
-   Julius: http://sourceforge.jp/projects/julius/downloads/60273/julius-4.3.1-win32bin.zip (Install in *C:\julius-4.3.1-win32bin* or add to PATH)

### Project setup

(in Windows you may have to switch between the Git bash and the NodeJS command line!)

    git clone https://github.com/SBejga/hueper.git
    cd hueper/nodejs
    npm install

-   Download acoustic model: http://www.repository.voxforge1.org/downloads/Nightly_Builds/AcousticModel-2014-02-10/HTK_AcousticModel-2014-02-10_16kHz_16bit_MFCC_O_D.zip and extract to *julius/acoustic_model_files*
-   Start NodeJS: `node <Project path>/nodejs/server.js`
-   Frontend is accessible at http://localhost:8080

### Arduino setup

Hardware needed:

-   Arduino UNO
-   Adafruit PN532 RFID/NFC Shield + Stackable Header Kit
-   Seeedstudio Grove Base Shield
-   Seeedstudio Grove Light Sensor (A0), PIR Motion Sensor (D8) and Sound Sensor (A2)

Installation:

-   Arduino IDE: http://arduino.cc/en/Main/Software
-   Select the right Serial Port
-   Include the library for the Adafruit PN532 RFID/NFC Shield: https://github.com/adafruit/Adafruit_NFCShield_I2C
-   Flash the *arduino/arduino.ino* sketch

### Deploying on a Raspberry Pi

Hardware needed: External USB sound card with microphone

-   Flash your Raspberry Pi with Raspbian
-   Copy the files in the *raspberry* folder to */home/pi*
-   Make the *setup.sh* executable and execute it (as root)
-   wait :)
-   reboot


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/SBejga/hueper/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

