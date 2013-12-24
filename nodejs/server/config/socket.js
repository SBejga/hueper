module.exports = function(app) {
	
	app.server.io.set(
        'transports',
        ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']
    );

};
