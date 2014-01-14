var helpers	    = require('../helpers'),
    mongoose =  require('mongoose'),
    Favorite =  mongoose.model('Favorite'),
    app;

var socketListeners = function(socket) {

    // create favorite
    socket.on('favorite.create', function(data) {
        console.log('[favorites] Create new favorite: ', data);

        new Favorite(data).save(function(err, favorite) {
            if(err) {
                (app.controllers.mongoose.handleError(
                    socket,
                    false,
                    false,
                    'favorites.create'
                ))(err);
                return;
            }

            var id = favorite['_id'];
            app.state.favorites[id] = favorite;
            app.controllers.socket.refreshState(
                false,
                ['favorites.' + id]
            );
        });
    });

    // update favorite
    socket.on('favorite.update', function(data) {
        var id = data['_id'];

        helpers.cleanMongooseProperties(data);

        console.log('[favorites] Update favorite: ', data);

        Favorite.findByIdAndUpdate(id, data, function(err, favorite) {
            if(err) {
                (app.controllers.mongoose.handleError(
                    socket,
                    'favorites.' + id,
                    app.state.favorites[id],
                    'favorites.update'
                ))(err);
                return;
            }

            app.state.favorites[id] = favorite;
            app.controllers.socket.refreshState(
                app.controllers.socket.getBroadcastSocket(socket),
                ['favorites.' + id]
            );
        });

    });

    // delete favorite
    socket.on('favorite.delete', function(id) {
        console.log('[favorites] Delete favorite: ', id);

        Favorite.findByIdAndRemove(id).exec();

        delete app.state.favorites[id];
        app.controllers.socket.deleteFromState(
            app.controllers.socket.getBroadcastSocket(socket),
            ['favorites.' + id]
        );
    });

};

module.exports = function(globalApp) {

    app = globalApp;

    app.controllers.socket.addSocketListener(socketListeners);

};
