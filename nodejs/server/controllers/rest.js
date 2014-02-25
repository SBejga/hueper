var app,

    socketDummyListeners = [];


var init = function() {
    var express = app.server.express;
    express.all('/rest/*', checkAuthentication, handleRequest);
};


var socketDummy = {
    on: function(event, listener) {
        socketDummyListeners.push([
            event,
            listener
        ]);
    },

    isDummySocket: true,

    emit: function(event, body) {
        console.log('[rest] Tried to emit data to the REST dummy socket: ', event, body);
    }
};



/**
 * Check if correct password is contained in request
 * @param req
 * @param res
 * @param next
 */
var checkAuthentication = function(req, res, next) {
    var password;

    if(!app.events.is('config.ready')) {
        res.json(503, {
            error: 'Service not available!'
        });
        return;
    }

    if(req.query.password) {
        password = req.query.password;
    }
    else if(req.body.password) {
        password = req.body.password;
    }

    if(app.config.password !== null && app.config.password !== password) {
        res.json(401, {
            error: 'Wrong password!'
        });
        return;
    }

    next();
};

/**
 * Serve REST request
 * @param req
 * @param res
 */
var handleRequest = function(req, res) {
    var action, path, messagePart,
        foundListener = false,
        i;

    if(!req.params || req.params[0] === '') {
        action = 'state';
    }
    else {
        action = req.params[0];
    }

    // send state

    if(action.indexOf('state') === 0) {

        action = action.match(/^state\/(.+)$/);

        // send complete state
        if(!action) {
            res.json({
                area: '',
                state: app.state
            });
        }
        // send only part of state
        else {
            path = action[1].split('.');
            messagePart = app.state;

            for(i = 0; i < path.length; i++) {

                // nonexistant state path
                if(messagePart[path[i]] === undefined) {
                    res.json(404, {
                        area: action[1],
                        error: 'The selected area of the state object does not exist!'
                    });
                    return;
                }

                messagePart = messagePart[path[i]];
            }

            res.json({
                area: action[1],
                state: messagePart
            });
        }

        return;
    }

    // execute action

    socketDummyListeners.forEach(function(listener) {
        if(listener[0] === action) {
            foundListener = true;
            listener[1](req.body.data || false);
        }
    });


    // answer with state
    if(req.query.answerState !== undefined) {
        setTimeout(function() {
            res.json({
                area: '',
                state: app.state
            });
        }, parseInt(req.query.answerState) || 0);
    }
    // answer only success/error message
    else if(foundListener) {
        res.json({
            success: true
        });
    }
    else {
        res.json(404, {
            error: 'No listener is registered with this action!'
        });
    }

};


module.exports = function(globalApp) {

    app = globalApp;

    app.events.on('ready', function() {
        init();
    });


    return {
        addSocketDummyListener: function(listener) {
            listener(socketDummy);
        }
    };

};
