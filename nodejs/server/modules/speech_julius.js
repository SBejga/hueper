var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    spawn = require('child_process').spawn,
    fs = require('fs');


var Julius = function() {
    EventEmitter.call(this);

    this.process = false;

    if(process.platform.indexOf('win') === 0) {
        // check installation directory
        if(fs.existsSync('C:/julius-4.3.1-win32bin/bin/julius-4.3.1.exe')) {
            this.cmd = 'C:/julius-4.3.1-win32bin/bin/julius-4.3.1.exe';
        }
        // use PATH
        else {
            this.cmd = 'julius-4.3.1';
        }
    }
    else {
        this.cmd = 'julius';
    }

    this.args = ['-input', 'mic', '-C', __dirname + '/../../../julius/hue.jconf'];

};

util.inherits(Julius, EventEmitter);

Julius.prototype.start = function() {
    var self = this;

    console.log('[speech_julius] Start julius speech recognition');

    this.process = spawn(this.cmd, this.args);

    this.process.on('error', function() {
        console.log('[speech_julius] JULIUS PROCESS ERROR, ABORTING!');
    });

    this.process.on('close', function() {
        console.log('[speech_julius] Julius process closed');
    });

    this.process.stdout.on('data', function(data) {
        var lines = data.toString().split('\n'),
            i = lines.length;

        while(i--) {
            if(lines[i] === '<search failed>') {
                self.emit('recognize', false);
            }
            else if(lines[i].indexOf('sentence1: <s>') === 0) {
                self.emit('recognize', lines[i].match('<s> (.+) </s>')[1]);
            }
        }
    });
};

Julius.prototype.stop = function() {
    if(this.process) {
        console.log('[speech_julius] Stop julius speech recognition');
        this.process.kill();
    }

    this.process = false;
};


module.exports = Julius;