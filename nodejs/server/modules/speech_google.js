/*
 * Modified version of node-speakable
 * https://github.com/sreuter/node-speakable
 */

var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    spawn = require('child_process').spawn,
    http = require('http'),
    fs = require('fs'),

    app;

var Speakable = function Speakable(globalApp, options) {
    EventEmitter.call(this);

    app = globalApp;

    options = options || {};

    this.recBuffer = [];
    this.recRunning = false;
    this.apiResult = {};
    this.apiLang = options.lang || "en-US";


    if(process.platform.indexOf('win') === 0) {
        // check x64 and x86 installation folders
        if(fs.existsSync('C:/Program Files (x86)/sox-14-4-1/sox.exe')) {
            this.cmd = 'C:/Program Files (x86)/sox-14-4-1/sox.exe';
        }
        else if(fs.existsSync('C:/Program Files/sox-14-4-1/sox.exe')) {
            this.cmd = 'C:/Program Files/sox-14-4-1/sox.exe';
        }
        // use PATH
        else {
            this.cmd = 'sox';
        }
    }
    else {
        this.cmd = 'sox';
    }

    this.rec = false;
    this.active = false;

};

util.inherits(Speakable, EventEmitter);

Speakable.prototype.postVoiceData = function() {
    var self = this;

    var options = {
        hostname: 'www.google.com',
        path: '/speech-api/v1/recognize?xjerr=1&client=chromium&pfilter=0&maxresults=1&lang="' + self.apiLang + '"',
        method: 'POST',
        headers: {
            'Content-type': 'audio/x-flac; rate=16000'
        }
    };

    var req = http.request(options, function(res) {
        if(res.statusCode !== 200) {
            return self.emit(
                'error',
                'Non-200 answer from Google Speech API (' + res.statusCode + ')'
            );
        }
        res.setEncoding('utf8');
        res.on('data', function (chunk) {
            self.apiResult = JSON.parse(chunk);
        });
        res.on('end', function() {
            self.parseResult();
        });
    });

    req.on('error', function(e) {
        self.emit('error', e);
    });

    // write data to request body
    console.log('[speech] Speakable: Posting voice data...');

    for(var i in self.recBuffer) {
        if(self.recBuffer.hasOwnProperty(i)) {
            req.write(new Buffer(self.recBuffer[i],'binary'));
        }
    }
    req.end();


    if(self.active) {
        setTimeout(function() {
            self.recBuffer = [];
            self.recordVoice();
        }, 500);
    }
};

Speakable.prototype.recordVoice = function() {
    var self = this;

    if(self.recRunning) {
        return;
    }

    var args = [
        '-b','16',
        '-d','-t','flac','-',
        'rate','16000','channels','1',
        'silence','1','0.1', app.state.appConfig.speechSensitivity + '%','1','0.75', app.state.appConfig.speechSensitivity + '%'
    ];

    self.rec = spawn(self.cmd, args, 'pipe');

    self.rec.on('error', function() {
        console.log('[speech] ERROR INITIALIZING SOX BINARY, ABORTING!');
        self.active = false;
    });

    // Process stdout

    self.rec.stdout.on('readable', function() {
        self.emit('speechReady');
    });

    self.rec.stdout.setEncoding('binary');
    self.rec.stdout.on('data', function(data) {
        if(! self.recRunning) {
            self.emit('speechStart');
            self.recRunning = true;
        }
        self.recBuffer.push(data);
    });

    // Process stdin

    self.rec.stderr.setEncoding('utf8');
    /*
     self.rec.stderr.on('data', function(data) {
     console.log(data)
     });
     */
    self.rec.on('close', function(code) {
        self.recRunning = false;
        self.rec = false;
        if(code) {
            self.emit('error', 'sox exited with code ' + code);
        }
        self.emit('speechStop');
        self.postVoiceData();
    });
};

Speakable.prototype.resetVoice = function() {
    var self = this;
    self.recBuffer = [];
};

Speakable.prototype.parseResult = function() {
    var recognizedWords = [], apiResult = this.apiResult;
    if(apiResult && apiResult.hypotheses && apiResult.hypotheses[0]) {
        recognizedWords = apiResult.hypotheses[0].utterance;
        this.emit('speechResult', recognizedWords);
    } else {
        this.emit('speechResult', false);
    }

};

Speakable.prototype.start = function() {
    this.active = true;
    this.recordVoice();
};

Speakable.prototype.stop = function() {
    this.active = false;

    if(this.rec) {
        console.log('[speech] Killing sox process');
        this.rec.kill();
        this.rec = false;
    }
};


module.exports = Speakable;
