'use strict';

/* Directives */


angular.module('hueApp.directives', []).


/**
 * Mouse, touch, and pointer event abstraction
 *
 * Fires:
 * - down(e, position)
 * - move(e, position, startPosition),
 * - up(e, position, startPosition)
 *
 * position objects: { x: <Number>, y: <Number> }
 * coordinates are absolute page offsets
 */

directive('hueperTouch', function() {

    // special global treatment for mouse events as they are fired on the elements
    // they currently hover

    var mouseDown = false;

    if(!window.navigator.msPointerEnabled && !window.PointerEvent) {

        document.addEventListener('mouseup', function(e) {

            if(mouseDown) {
                mouseDown.trigger('up', [
                    {
                        x: e.pageX,
                        y: e.pageY
                    },
                    mouseDown.data('startPosition')
                ]);
            }

            mouseDown = false;
        }, false);

        document.addEventListener('mousemove', function(e) {
            if(!mouseDown) {
                return false;
            }

            mouseDown.trigger('move', [
                {
                    x: e.pageX,
                    y: e.pageY
                },
                mouseDown.data('startPosition')
            ]);
        }, false);

    }

    return {
        link: function(scope, elm, attrs) {

            var domElm = elm[0];
            
            var startPosition = {
                x:0,
                y:0
            };


            if(!window.navigator.msPointerEnabled && !window.PointerEvent) {

                // mouse events

                domElm.addEventListener('mousedown', function(e) {

                    // catch right click
                    if((e.which && e.which === 3) || (e.button && e.button === 2)) {
                        return;
                    }

                    mouseDown = elm;

                    startPosition = {
                        x: e.pageX,
                        y: e.pageY
                    };

                    elm.data('startPosition', startPosition);

                    elm.trigger('down', [startPosition]);
                }, false);

                // standard touch events

                domElm.addEventListener('touchstart', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    startPosition = {
                        x: e.targetTouches[0].pageX,
                        y: e.targetTouches[0].pageY
                    };

                    elm.trigger('down', [startPosition]);
                }, false);

                domElm.addEventListener('touchmove', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    elm.trigger('move', [{
                        x: e.targetTouches[0].pageX,
                        y: e.targetTouches[0].pageY
                    }, startPosition]);
                }, false);

                domElm.addEventListener('touchend', function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    elm.trigger('up', [{
                        x: e.targetTouches[0].pageX,
                        y: e.targetTouches[0].pageY
                    }, startPosition]);
                }, false);

            }
            // MSIE pointer events
            else {
                var pointerdown = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        // capture pointer on the domElmement it started
                        e.target.setPointerCapture(e.pointerId);

                        startPosition = {
                            x: e.pageX,
                            y: e.pageY
                        };

                        elm.trigger('down', [startPosition]);
                    },
                    pointermove = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        elm.trigger('move', [{
                            x: e.pageX,
                            y: e.pageY
                        }, startPosition]);
                    },
                    pointerup = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        elm.trigger('up', [{
                            x: e.pageX,
                            y: e.pageY
                        }, startPosition]);
                    };

                if(window.PointerEvent) {
                    domElm.addEventListener('pointerdown', pointerdown, false);
                    domElm.addEventListener('pointermove', pointermove, false);
                    domElm.addEventListener('pointerup', pointerup, false);
                }
                else {
                    domElm.addEventListener('MSPointerDown', pointerdown, false);
                    domElm.addEventListener('MSPointerMove', pointermove, false);
                    domElm.addEventListener('MSPointerUp', pointerup, false);
                }

            }

        }
    };
}).

/**
 * Slider that binds to a numeric model
 *
 * Attributes:
 * - model
 * - change(value): function to  be called when slider is moved
 * - min default 0
 * - max default 100
 * - step: minimum distance to trigger a movement, default 1
 * - round: number of digits to round the value to, default 0
 * - vertical: make the slider vertical
 */
directive('hueperSlider', ['$timeout', function($timeout) {
    return {
        template: '<div class="slider" hueper-touch>\
                    <div class="slider-track"></div>\
                    <div class="slider-handle-container">\
                        <div class="slider-handle"></div>\
                    </div>\
                </div>',

        replace: true,

        scope: {
            model: '=',
            change: '&'
        },

        link: function(scope, elm, attrs) {
            var min = parseFloat(attrs.min) || 0,
                max = parseFloat(attrs.max) || 100,
                step = Math.abs(parseFloat(attrs.step)) || 1,
                round = parseFloat(attrs.round),
                roundFactor,

                handleWidth = 16,
                handleCenter = 8,

                valueDelta = Math.abs(max - min),

                handle = elm.find('.slider-handle'),
                handleOffset = handle.offset().left,
                sliderOffset,
                sliderLength,
                minDelta,

                dimension = 'left',
                axis = 'x',
                getDimension = function(el) {
                    return el.width();
                },

                minChangeInterval = 400,
                lastChange = false,
                changeTimeout = false;

            // estimate round based on step width
            if(isNaN(round)) {
                if(step > 1) {
                    round = 0;
                }
                else {
                    round = Math.abs(Math.floor(Math.log(step) / 2.302585092994046));
                }
            }

            roundFactor = Math.pow(10, round);

            // vertical slider

            if(attrs.vertical !== undefined) {
                dimension = 'top';
                axis = 'y';
                getDimension = function(el) {
                    return el.height();
                };

                // switch min and max for easier position computations
                max = parseFloat(attrs.min) || 0;
                min = parseFloat(attrs.max) || 100;

                elm.addClass('vertical');
            }

            // compute sizes and dimensions on interaction start

            elm.on('down', function(e, pos) {
                sliderOffset = elm.offset()[dimension];
                sliderLength = getDimension(elm);
                handleOffset = handle.offset()[dimension];
                minDelta = sliderLength / ( valueDelta / step ) / 2;
            });

            // change model and execute callback when slider is moved

            elm.on('down up move', function(e, pos) {
                var p = pos[axis] - handleCenter;

                if(Math.abs(p-handleOffset) < minDelta) {
                    return;
                }

                var innerPos = p - sliderOffset;

                if(innerPos < 0) {
                    innerPos = 0;
                }
                else if(innerPos > sliderLength - handleWidth) {
                    innerPos = sliderLength - handleWidth;
                }

                scope.$apply(function() {
                    scope.model = min + (innerPos / (sliderLength - handleWidth) * (max - min));

                    var diff = scope.model % step;

                    if(diff > step / 2) {
                        scope.model += step - diff;
                    }
                    else {
                        scope.model -= diff;
                    }

                    scope.model = Math.round(scope.model * roundFactor) / roundFactor;


                    if(scope.change) {
                        var now = new Date().getTime(),
                            param = {value: scope.model};

                        if(changeTimeout) {
                            $timeout.cancel(changeTimeout);
                        }

                        if(e.type === 'move') {
                            if(now - lastChange > minChangeInterval) {
                                lastChange = now;
                                scope.change(param);
                            }
                            else {
                                changeTimeout = $timeout(function() {
                                    lastChange = now;
                                    scope.change(param);
                                }, minChangeInterval);
                            }
                        }
                        else {
                            scope.change(param);
                            lastChange = now;
                        }
                    }
                });

            });

            // display changes to the model

            scope.$watch('model', function(val) {
                handle.css(dimension, 100 * (val - min) / (max - min) + '%');
                handleOffset = handle.offset()[dimension];
            });

        }
    };
}]).


/**
 * Link function for color pickers
 * @param container
 * @param handle
 * @param touchElement element that receives the touch abstraction events from hueperTouch
 * @param scope
 * @param attrs
 * @param $timeout
 */
factory('hueperColorpickerLinkFn', function() {
    return function(container, handle, touchElement, scope, attrs, $timeout) {
        var handleOffset = handle.offset(),

            containerOffset,
            containerWidth = container.width(),
            containerHeight = container.height(),

            handleWidth = 32,
            handleCenter = 16,

            ctPosition = 2,
            ctMin = 153,
            ctMax = 497,
            ctArea = ctMax - ctMin,

            hueMin = 0,
            hueMax = 65535,
            hueArea = hueMax - hueMin,

            satMin = 0,
            satMax = 254,
            satArea = satMax - satMin,

            hsOffset = 12.5,
            hsOffsetFactor = hsOffset / 100,
            hsFactor = 100 - hsOffset,

            minPixelDistance = 2,

            minChangeInterval = 400,
            lastChange = false,
            changeTimeout = false;


        // compute sizes and dimensions on interaction start

        touchElement.on('down', function(e, pos) {
            handleOffset = handle.offset();
            containerOffset = container.offset();
            containerWidth = container.width();
            containerHeight = container.height();
        });

        // change model and execute callback when handle is moved

        touchElement.on('down up move', function(e, pos) {
            var posX = pos.x - handleCenter,
                posY = pos.y - handleCenter;

            if(Math.abs(posX - handleOffset.left) < minPixelDistance && Math.abs(posY - handleOffset.top) < minPixelDistance) {
                return;
            }

            var maxX = containerWidth - handleWidth,
                maxY = containerHeight - handleWidth,

                relX = posX - containerOffset.left,
                relY = posY - containerOffset.top;

            if(relX < 0) {
                relX = 0;
            }
            else if(relX > maxX) {
                relX = maxX;
            }

            if(relY < 0) {
                relY = 0;
            }
            else if(relY > maxY) {
                relY = maxY;
            }

            var x = relX / maxX,
                y = relY / maxY;

            scope.$apply(function() {

                var invokeChange = function(param) {
                    var now = new Date().getTime();

                    if(scope.change) {
                        if(changeTimeout) {
                            $timeout.cancel(changeTimeout);
                        }

                        if(e.type === 'move') {
                            if(now - lastChange > minChangeInterval) {
                                lastChange = now;
                                scope.change(param);
                            }
                            else {
                                changeTimeout = $timeout(function() {
                                    lastChange = now;
                                    scope.change(param);
                                }, minChangeInterval);
                            }
                        }
                        else {
                            scope.change(param);
                            lastChange = new Date().getTime();
                        }
                    }
                };

                // ct

                if(x < hsOffsetFactor) {
                    scope.state.colormode = 'ct';
                    scope.state.ct = Math.round(ctMin + y * ctArea);

                    invokeChange({
                        state: {
                            ct: scope.state.ct
                        }
                    });
                }

                // hue/sat

                else {

                    // correct x-axis percent value
                    x = (x - hsOffsetFactor) / (1 - hsOffsetFactor);

                    scope.state.colormode = 'hs';
                    scope.state.hue = Math.round(hueMin + x * hueArea);
                    scope.state.sat = Math.round(satMin + y * satArea);

                    invokeChange({
                        state: {
                            hue: scope.state.hue,
                            sat: scope.state.sat
                        }
                    });
                }

            });

        });


        // display changes to the model

        scope.$watch('[state.hue, state.sat, state.ct, state.colormode]', function() {

            var left = 0,
                top = 0;

            if(!scope.state) {
                return;
            }

            if(scope.state.colormode === 'ct' || scope.state.hue === undefined) {
                left = ctPosition;
                top = 100 * (scope.state.ct - ctMin) / ctArea;
            }
            else {
                top = 100 * (scope.state.sat - satMin) / satArea;
                left = hsOffset + hsFactor * (scope.state.hue - hueMin) / hueArea;
            }

            if(top < 0) {
                top = 0;
            }
            else if(top > 100) {
                top = 100;
            }

            if(left < 0) {
                left = 0;
            }
            else if(left > 100) {
                left = 100;
            }

            handle.css({
                top: top + '%',
                left: left + '%'
            });

            handleOffset = handle.offset();

            cleanColormode();
        }, true);


        var cleanColormode = function() {
            if(attrs.clean === undefined) {
                return;
            }

            if(scope.state.colormode === 'ct') {
                delete scope.state.hue;
                delete scope.state.sat;
            }
            else if(scope.state.colormode === 'hs') {
                delete scope.state.ct;
            }
        };
    };
}).


/**
 * color picker that binds to a state
 *
 * Attributes
 * - state: light state with hue, sat, ct and colormode
 * - change(state): function to be called when values change
 *      The state object contains either hue/sat or a ct property
 * - clean: Remove the state properties of the colormode that is currently not used
 */
directive('hueperColorpicker', ['$timeout', 'hueperColorpickerLinkFn', function($timeout, hueperColorpickerLinkFn) {
    return {
        template: '<div class="colorpicker" hueper-touch>\
                <div class="colorpicker-handle-container">\
                    <div class="colorpicker-handle"></div>\
                </div>\
            </div>',

        replace: true,

        scope: {
            state: '=',
            change: '&'
        },

        link: function(scope, elm, attrs) {
            hueperColorpickerLinkFn(elm, elm.find('.colorpicker-handle'), elm, scope, attrs, $timeout);
        }
    };
}]).

/**
 * color picker for separate colors per light
 *
 * Attributes
 * - lights
 * - change(id, value)
 */
directive('hueperColorpickerSeparate', function() {
    return {
        template: '<div class="colorpicker">\
                <div class="colorpicker-handle-container">\
                    <div class="colorpicker-handle" ng-repeat="(id, l) in lights" hueper-touch hueper-colorpicker-separate-handle="l.state" change="change({id: id, state: state})">{{id}}</div>\
                </div>\
            </div>',

        replace: true,

        scope: {
            lights: '=',
            change: '&'
        }
    };
}).

/**
 * Handle for the separate colorpicker
 *
 * Attributes
 * - state
 * - change(value)
 */
directive('hueperColorpickerSeparateHandle', ['$timeout', 'hueperColorpickerLinkFn', function($timeout, hueperColorpickerLinkFn) {
    return {

        scope: {
            state: '=hueperColorpickerSeparateHandle',
            change: '&'
        },

        link: function(scope, elm, attrs) {
            hueperColorpickerLinkFn(elm.parents('.colorpicker'), elm, elm, scope, attrs, $timeout);
        }
    };
}]).

/**
 * Range color picker
 *
 * Attributes
 * - hueper-colorpicker-range: light state with hue.min, hue.max, sat.min and sat.max
 */
directive('hueperColorpickerRange', function() {
    return {
        template: '<div class="colorpicker range" hueper-touch>\
                    <div class="colorpicker-handle"></div>\
                </div>',

        replace: true,

        scope: {
            state: '=hueperColorpickerRange'
        },

        link: function(scope, elm, attrs) {

            var container = elm,
                handle = elm.find('.colorpicker-handle'),

                containerOffset,
                containerWidth = container.width(),
                containerHeight = container.height(),

                hueMin = 0,
                hueMax = 65535,
                hueArea = hueMax - hueMin,

                satMin = 0,
                satMax = 254,
                satArea = satMax - satMin;


            elm.on('down', function(e, pos) {
                containerOffset = container.offset();
                containerWidth = container.width();
                containerHeight = container.height();
            });

            // change model and execute callback when handle is moved

            elm.on('down up move', function(e, pos) {
                var propHue = 'min',
                    propSat = 'min';

                var relX = pos.x - containerOffset.left,
                    relY = pos.y - containerOffset.top;

                if(relX < 0) {
                    relX = 0;
                }
                else if(relX > containerWidth) {
                    relX = containerWidth;
                }

                if(relY < 0) {
                    relY = 0;
                }
                else if(relY > containerHeight) {
                    relY = containerHeight;
                }

                var x = relX / containerWidth,
                    y = relY / containerHeight,

                    hue = Math.round(hueMin + x * hueArea),
                    sat = Math.round(satMin + y * satArea);

                if(Math.abs(scope.state.hue.max-hue) < Math.abs(scope.state.hue.min-hue)) {
                    propHue = 'max';
                }

                if(Math.abs(scope.state.sat.max-sat) < Math.abs(scope.state.sat.min-sat)) {
                    propSat = 'max';
                }

                scope.$apply(function() {
                    scope.state.hue[propHue] = hue;
                    scope.state.sat[propSat] = sat;
                });
            });


            // display changes to the model

            scope.$watch('[state.hue, state.sat]', function() {
                handle.css({
                    top: 100 * (scope.state.sat.min - satMin) / satArea + '%',
                    left: 100 * (scope.state.hue.min - hueMin) / hueArea + '%',
                    bottom: (100 - 100 * (scope.state.sat.max - satMin) / satArea) + '%',
                    right: (100 - 100 * (scope.state.hue.max - hueMin) / hueArea) + '%'
                });
            }, true);

        }
    };
}).

/**
 * computes the RGB color of a light state and applies it as background-color to an element
 *
 *  Attributes
 *  - hueperColor: light state with the properties on, bri, hue+sat or ct,
 *          colormode when both hue+sat and ct are present
 */

directive('hueperColor', function() {

    return {
        scope: {
            hueperColor: '='
        },

        link: function(scope, elm, attrs) {

            var oldRed = 0,
                oldGreen = 0,
                oldBlue = 0,
                oldOpacity = 0,
                oldEffect = 'none';

            scope.$watch('[hueperColor.on, hueperColor.isOn, hueperColor.bri, hueperColor.hue, hueperColor.sat, hueperColor.ct, hueperColor.colormode, hueperColor.effect]', function() {
                var opacity,
                    red = 0,
                    green = 0,
                    blue = 0,
                    backgroundImage = 'none';

                if(!scope.hueperColor) {
                    return;
                }

                // black 0.25 when turned off
                if(scope.hueperColor.on === false || scope.hueperColor.isOn === false) {
                    opacity = 0.25;
                }
                else {
                    // opacity 0.25 - 0.75 depending on brightness
                    opacity = 0.25 + scope.hueperColor.bri/254*0.5;

                    // colorloop
                    if(scope.hueperColor.effect === 'colorloop') {
                        backgroundImage = 'url(data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgo8c3ZnIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiBoZWlnaHQ9IjMyIiB3aWR0aD0iMzIiIHZlcnNpb249IjEuMSIgeG1sbnM6Y2M9Imh0dHA6Ly9jcmVhdGl2ZWNvbW1vbnMub3JnL25zIyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhckdyYWRpZW50NDk2MiIgeTI9IjUxMiIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHkxPSI1MTIiIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMC4xMDc4NDMxNCwwLDAsMC4zMzMzMzMzMSwtMC43ODQzMzMzLDg2MC4zNjIyNCkiIHgyPSIzMDQiIHgxPSIxNiI+CjxzdG9wIHN0b3AtY29sb3I9IiNGMDAiIG9mZnNldD0iMCIvPgo8c3RvcCBzdG9wLWNvbG9yPSIjZmY4NTBkIiBvZmZzZXQ9IjAuMTI1Ii8+CjxzdG9wIHN0b3AtY29sb3I9IiNGRjAiIG9mZnNldD0iMC4yNSIvPgo8c3RvcCBzdG9wLWNvbG9yPSIjOWFmZjQ4IiBvZmZzZXQ9IjAuMzc1Ii8+CjxzdG9wIHN0b3AtY29sb3I9IiNmMmZmZjIiIG9mZnNldD0iMC41Ii8+CjxzdG9wIHN0b3AtY29sb3I9IiM4YTkyZmYiIG9mZnNldD0iMC42MjUiLz4KPHN0b3Agc3RvcC1jb2xvcj0iIzJiMTdmZiIgb2Zmc2V0PSIwLjY4NzUiLz4KPHN0b3Agc3RvcC1jb2xvcj0iIzlkMjRmZiIgb2Zmc2V0PSIwLjc1Ii8+CjxzdG9wIHN0b3AtY29sb3I9IiNmZjA5OTciIG9mZnNldD0iMC44NzUiLz4KPHN0b3Agc3RvcC1jb2xvcj0iI2ZmMDI3MyIgb2Zmc2V0PSIwLjkzNzUiLz4KPHN0b3Agc3RvcC1jb2xvcj0iI0YwMCIgb2Zmc2V0PSIxIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPG1ldGFkYXRhPgo8cmRmOlJERj4KPGNjOldvcmsgcmRmOmFib3V0PSIiPgo8ZGM6Zm9ybWF0PmltYWdlL3N2Zyt4bWw8L2RjOmZvcm1hdD4KPGRjOnR5cGUgcmRmOnJlc291cmNlPSJodHRwOi8vcHVybC5vcmcvZGMvZGNtaXR5cGUvU3RpbGxJbWFnZSIvPgo8ZGM6dGl0bGUvPgo8L2NjOldvcms+CjwvcmRmOlJERj4KPC9tZXRhZGF0YT4KPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMCwtMTAyMC4zNjIyKSI+CjxyZWN0IGZpbGwtcnVsZT0ibm9uemVybyIgaGVpZ2h0PSIzMiIgd2lkdGg9IjMyIiB5PSIxMDIwLjQiIHg9IjAiIGZpbGw9InVybCgjbGluZWFyR3JhZGllbnQ0OTYyKSIvPgo8L2c+Cjwvc3ZnPgo=)';
                    }

                    // hue + sat

                    else if(scope.hueperColor.colormode === 'hs' || scope.hueperColor.ct === undefined) {
                        var hue = scope.hueperColor.hue;

                        // red
                        if(hue < 20000 || hue > 65000) {
                            red = 255;
                        }
                        else if(hue >= 20000 && hue <= 25000) {
                            red = 255 - 100 / 5000 * (hue - 20000);
                        }
                        else if(hue >= 25000 && hue < 32000) {
                            red = 155 + 100 / 7000 * (hue - 25000);
                        }
                        else if(hue >= 32000 && hue < 47000) {
                            red = 255 - 255 / 15000 * (hue - 32000);
                        }
                        else if(hue >= 47000 && hue < 50000) {
                            red = 155 / 3000 * (hue - 47000);
                        }
                        else {
                            red = 155 + 100 / 15000 * (hue - 50000);
                        }

                        // green
                        if(hue > 20000 && hue < 32000) {
                            green = 255;
                        }
                        else if(hue < 60000) {
                            if(hue >= 32000) {
                                green = 255 - 255 / 20000 * (hue - 32000);
                            }
                            else {
                                green = 255 / 20000 * hue;
                            }
                        }

                        // blue
                        if(hue > 20000) {
                            if(hue < 32000) {
                                blue = -440 + 0.021 * hue;
                            }
                            else {
                                blue = 510 - 0.00773 * hue;
                            }
                        }

                        // adjust to saturation
                        var satFactor = (254 - scope.hueperColor.sat) / 254;

                        red = Math.round(red + satFactor * (255-red));
                        green = Math.round(green + satFactor * (255-green));
                        blue = Math.round(blue + satFactor * (255-blue));

                    }

                    // ct

                    else {
                        var ct = scope.hueperColor.ct;

                        red = 255;
                        green = Math.round(255 - 100 / 344 * (ct - 153));
                        blue = Math.round(255 - 255 / 344 * (ct - 153));
                    }

                }

                // ensure that colors do not exceed boundaries

                if(red > 255) {
                    red = 255;
                }
                else if(red < 0) {
                    red = 0;
                }

                if(green > 255) {
                    green = 255;
                }
                else if(green < 0) {
                    green = 0;
                }

                if(blue > 255) {
                    blue = 255;
                }
                else if(blue < 0) {
                    blue = 0;
                }

                // apply new color if the change is significant

                if(scope.hueperColor.effect !== oldEffect || Math.abs(red - oldRed) > 5 || Math.abs(green - oldGreen) > 5 || Math.abs(blue - oldBlue) > 5 || Math.abs(opacity - oldOpacity) > 0.05) {

                    oldRed = red;
                    oldGreen = green;
                    oldBlue = blue;
                    oldOpacity = opacity;
                    oldEffect = scope.hueperColor.effect;


                    elm.css({
                        'backgroundImage': backgroundImage,
                        'backgroundColor': 'rgb(' + red + ',' + green + ',' + blue + ')',
                        'opacity': opacity
                    });

                }

            }, true);

        }
    };

}).

/**
 * Range slider
 *
 * Attributes:
 * - modelMin
 * - modelMax
 * - change(type, value): function to  be called when slider is moved (type = 'min' / 'max')
 * - min default 0
 * - max default 100
 * - step: minimum distance to trigger a movement, default 1
 * - round: number of digits to round the value to, default 0
 * - vertical: make the slider vertical
 */
directive('hueperRangeSlider', ['$timeout', function($timeout) {
    return {
        template: '<div class="slider" hueper-touch>\
                    <div class="slider-track"></div>\
                    <div class="slider-handle-container">\
                        <div class="slider-range"></div>\
                        <div class="slider-handle min"></div>\
                        <div class="slider-handle max"></div>\
                    </div>\
                </div>',

        replace: true,

        scope: {
            modelMin: '=',
            modelMax: '=',
            change: '&'
        },

        link: function(scope, elm, attrs) {
            var min = parseFloat(attrs.min) || 0,
                max = parseFloat(attrs.max) || 100,
                step = Math.abs(parseFloat(attrs.step)) || 1,
                round = parseFloat(attrs.round),
                roundFactor,

                handleWidth = 32,
                handleCenter = 16,

                valueDelta = Math.abs(max - min),

                range = elm.find('.slider-range'),

                handles = {
                    min: elm.find('.slider-handle.min'),
                    max: elm.find('.slider-handle.max')
                },

                handleOffset = {
                    min: handles.min.offset()[dimension],
                    max: handles.max.offset()[dimension]
                },

                sliderOffset,
                sliderLength,
                minDelta,

                dimension = 'left',
                dimensionSide = 'right',
                axis = 'x',
                getDimension = function(el) {
                    return el.width();
                },

                handle = 'min',
                model = 'modelMin',

                minChangeInterval = 400,
                lastChange = false,
                changeTimeout = false;

            // estimate round based on step width
            if(isNaN(round)) {
                if(step > 1) {
                    round = 0;
                }
                else {
                    round = Math.abs(Math.floor(Math.log(step) / 2.302585092994046));
                }
            }

            roundFactor = Math.pow(10, round);

            // vertical slider

            if(attrs.vertical !== undefined) {
                dimension = 'top';
                dimensionSide = 'bottom';
                axis = 'y';
                getDimension = function(el) {
                    return el.height();
                };

                // switch min and max for easier position computations
                max = parseFloat(attrs.min) || 0;
                min = parseFloat(attrs.max) || 100;

                elm.addClass('vertical');
            }

            // compute sizes and dimensions on interaction start

            elm.on('down', function(e, pos) {
                sliderOffset = elm.offset()[dimension];
                sliderLength = getDimension(elm);
                handleOffset.min = handles.min.offset()[dimension];
                handleOffset.max = handles.max.offset()[dimension];
                minDelta = sliderLength / ( valueDelta / step ) / 2;

                var p = pos[axis] - handleCenter;

                // select active handle
                if(Math.abs(p-handleOffset.max) < Math.abs(p-handleOffset.min) || p > handleOffset.max) {
                    handle = 'max';
                    model = 'modelMax';
                }
                else {
                    handle = 'min';
                    model = 'modelMin';
                }
            });

            // change model and execute callback when slider is moved

            elm.on('down up move', function(e, pos) {
                var p = pos[axis] - handleCenter;

                if(Math.abs(p-handleOffset[handle]) < minDelta) {
                    return;
                }

                if((handle === 'max' && p < handleOffset.min) || (handle === 'min' && p > handleOffset.max)) {
                    return;
                }

                var innerPos = p - sliderOffset;

                if(innerPos < 0) {
                    innerPos = 0;
                }
                else if(innerPos > sliderLength - handleWidth) {
                    innerPos = sliderLength - handleWidth;
                }

                scope.$apply(function() {
                    scope[model] = min + (innerPos / (sliderLength - handleWidth) * (max - min));

                    var diff = scope[model] % step;

                    if(diff > step / 2) {
                        scope[model] += step - diff;
                    }
                    else {
                        scope[model] -= diff;
                    }

                    scope[model] = Math.round(scope[model] * roundFactor) / roundFactor;


                    if(scope.change) {
                        var now = new Date().getTime(),
                            param = {
                                type: handle,
                                value: scope[model]
                            };

                        if(changeTimeout) {
                            $timeout.cancel(changeTimeout);
                        }

                        if(e.type === 'move') {
                            if(now - lastChange > minChangeInterval) {
                                lastChange = now;
                                scope.change(param);
                            }
                            else {
                                changeTimeout = $timeout(function() {
                                    lastChange = now;
                                    scope.change(param);
                                }, minChangeInterval);
                            }
                        }
                        else {
                            scope.change(param);
                            lastChange = now;
                        }
                    }
                });

            });

            // display changes to the model

            scope.$watch('modelMin', function(val) {
                handles.min.css(dimension, 100 * (val - min) / (max - min) + '%');
                handleOffset.min = handles.min.offset()[dimension];
                setRangePosition(val, scope.modelMax);
            });

            scope.$watch('modelMax', function(val) {
                handles.max.css(dimension, 100 * (val - min) / (max - min) + '%');
                handleOffset.max = handles.max.offset()[dimension];
                setRangePosition(scope.modelMin, val);
            });

            var setRangePosition = function(minValue, maxValue) {
                var rangePosition = {};
                rangePosition[dimension] = 100 * (minValue - min) / (max - min) + '%';
                rangePosition[dimensionSide] = (100 - 100 * (maxValue - min) / (max - min)) + '%';
                range.css(rangePosition);
            };
        }
    };
}]).

/*
 * Checkbox
 *
 *
 *
 */
directive('hueperCheckbox', function(){
        return {
            template: '<div class="checkbox_container"><div class="checkbox_box">\
                        <img src="css/images/checkbox-true.png" style="float: left" ng-show="show"></div>\
                        <div ng-transclude></div></div>',

            replace: true,
            transclude: true,

            scope: {
                hueperCheckbox: '=',
                list: '=',
                change: '&'
            },


            link: function(scope, elm, attrs){
                var trueVal = attrs.trueval || true;
                var falseVal = attrs.falseval || false;

                elm.on('click', function(){
                    scope.$apply(function(){
                        var id = parseInt(scope.hueperCheckbox);

                        if(scope.list === undefined){


                            if(scope.hueperCheckbox === trueVal){
                                scope.hueperCheckbox = falseVal;
                            }
                            else{
                                scope.hueperCheckbox = trueVal;
                            }
                        }
                        else{
                            if(scope.list.indexOf(id) > -1){
                                scope.list.splice(scope.list.indexOf(id), 1);
                            }
                            else{
                                scope.list.push(id);
                            }
                        }
                        scope.change({value: scope.hueperCheckbox});
                    });
                });


                if(scope.list === undefined){
                    scope.$watch('hueperCheckbox', function(){
                        scope.show = (scope.hueperCheckbox === trueVal);
                    });
                }
                else{
                    scope.$watch('list', function(){
                        if(scope.list.indexOf(scope.hueperCheckbox) > -1){
                            scope.show = true;
                        }
                        else{
                            scope.show = false;
                        }
                    }, true);
                }
            }
        }
    });
