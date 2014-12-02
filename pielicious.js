/**
 * http://stackoverflow.com/questions/3326650/console-is-undefined-error-for-internet-explorer
 */
(function () {
    "use strict";
    /*global window, Raphael, console */
    // union of Chrome, FF, IE, and Safari console methods
    var m = [
            "log", "info", "warn", "error", "debug", "trace", "dir", "group",
            "groupCollapsed", "groupEnd", "time", "timeEnd", "profile", "profileEnd",
            "dirxml", "assert", "count", "markTimeline", "timeStamp", "clear"
        ],
        index,
        noOpFunction = function () {
            return;
        };

    if (window && !window.console) {
        window.console = {};
    }
    // define undefined methods as no-ops to prevent errors
    for (index = 0; index < m.length; index += 1) {
        if (!window.console[m[index]]) {
            window.console[m[index]] = noOpFunction;
        }
    }
}());

/**
 * @license
 * Pielicious: donut-pie charting library, based on Raphaël JS by Dmitry Baranovskiy (http://raphaeljs.com)
 *
 * Copyright (c) 2014 Alexander Zagniotov
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 */
(function () {
    "use strict";

    function Pielicious(paper, cx, cy, R1, opts) {
        opts = opts || {};
        var RADIAN = (Math.PI / 180),
            WHITE_COLOR = "#ffffff",
            BOUNCE_EFFECT_NAME = "bounce",
            BACKOUT_EFFECT_NAME = "backOut",
            ELASTIC_EFFECT_NAME = "elastic",
            data = opts.data || [],
            wholePie = (data && data.length === 1) || false,
            slicedPie = !wholePie,
            gradient = (opts.gradient && typeof opts.gradient === 'object') || false,
            gradientDarkness = (gradient && opts.gradient.darkness ? opts.gradient.darkness : 0),
            gradientLightness = (gradient && opts.gradient.lightness ? opts.gradient.lightness : 0),
            gradientDegrees = (gradient && opts.gradient.degrees ? Math.abs(opts.gradient.degrees) : 180),
            colors = opts.colors || [],
            titles = opts.titles || [],
            handles = opts.handles || [],
            hrefs = opts.hrefs || [],
            threeD = (opts.threeD && typeof opts.threeD === 'object') || false,
            height3d = (threeD && opts.threeD.height ? (Math.abs(opts.threeD.height) > 100 ? 100 : Math.abs(opts.threeD.height)) : 25),
            tilt3d = (threeD && opts.threeD.tilt ? (Math.abs(opts.threeD.tilt) > 0.9 ? 0.9 : Math.abs(opts.threeD.tilt)) : 0.5),
            donut = (opts.donut && typeof opts.donut === 'object') || false,
            donutDiameter = (donut && opts.donut.diameter ? (Math.abs(opts.donut.diameter) > 0.9 ? 0.9 : Math.abs(opts.donut.diameter)) : 0.5),
            tiltDonut = (donut && opts.donut.tilt ? (Math.abs(opts.donut.tilt) > 0.9 ? 0.9 : Math.abs(opts.donut.tilt)) : false),
            legend = (opts.legend && typeof opts.legend === 'object') || false,
            legendLabels = (legend && opts.legend.labels ? opts.legend.labels : []),
            legendXstart = (legend && opts.legend.x ? opts.legend.x : cx + R1 + 30),
            legendYstart = (legend && opts.legend.y ? opts.legend.y : cy - R1),
            legendLabelXstart = legendXstart + 38,
            legendLabelYstart = legendYstart,
            fontSize = (legend && opts.legend.fontSize ? opts.legend.fontSize : "14"),
            fontFamily = (legend && opts.legend.fontFamily ? opts.legend.fontFamily : "Arial"),
            cursor = opts.cursor || "normal",
            marker = opts.marker || "circle",
            evolution = opts.evolution || false,
            easing = opts.easing || "",
            orientable = slicedPie ? (opts.orientation ? true : false) : false,
            orientation = (orientable && Math.abs(opts.orientation) > 360 ? 360 : (orientable ? Math.abs(opts.orientation) : 0)),
            shiftDistance = (threeD ? 15 : 10),
            total = 0,
            animationDelay = (slicedPie ? 600 : 1500),
            slices = paper.set(),
            markers = paper.set(),
            descriptions = paper.set(),
            index,
            bucket = [],
            startX = cx,
            startY = cy,
            terminalAngle = 0,
            initialAngle = terminalAngle,
            defaultOutlineRingThickness = 10,
            timeout,
            currentBucket,
            currentSliceOutline,
            currentValue,
            currentColor,
            currentLabel,
            currentTitle,
            currentHref,
            currentHandle,
            currentSliceAngle,
            currentSliceShiftX,
            currentSliceShiftY,
            Animator = function Animator(bucket, threeD, sliceAnimationOut, sliceAnimationIn, bordersAnimationOut, bordersAnimationIn) {
                if (!(this instanceof Animator)) {
                    return new Animator(bucket, threeD, sliceAnimationOut, sliceAnimationIn, bordersAnimationOut, bordersAnimationIn);
                }
                this.bucket = bucket;
                this.threeD = threeD;
                this.slice = bucket.slice;
                this.arc = bucket.arc;
                this.initialSideBorder = bucket.initialSideBorder;
                this.terminalSideBorder = bucket.terminalSideBorder;
                this.sliceAnimationOut = sliceAnimationOut;
                this.sliceAnimationIn = sliceAnimationIn;
                this.bordersAnimationOut = bordersAnimationOut;
                this.bordersAnimationIn = bordersAnimationIn;
            },

        // Adopted from https://bgrins.github.io/TinyColor/
            PieColor = function PieColor(color, gradientAngle) {
                if (!(this instanceof PieColor)) {
                    return new PieColor(color, gradientAngle);
                }
                var angle = gradientAngle,
                    rgb = Raphael.getRGB(color),
                    toHsl = function () {
                        var r = rgb.r / 255,
                            g = rgb.g / 255,
                            b = rgb.b / 255,
                            max = Math.max(r, g, b),
                            min = Math.min(r, g, b),
                            h,
                            s,
                            l = (max + min) / 2,
                            d = max - min;

                        if (max === min) {
                            h = s = 0; // achromatic
                        } else {
                            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                            if (max === r) {
                                h = (g - b) / d + (g < b ? 6 : 0);
                            } else if (max === g) {
                                h = (b - r) / d + 2;
                            } else if (max === b) {
                                h = (r - g) / d + 4;
                            }
                            h /= 6;
                        }
                        return {h: h, s: s, l: l};
                    },

                    lighten = function (amount) {
                        amount = (amount === 0 || amount < 0) ? 0 : (amount || 10);
                        var hsl = toHsl();
                        hsl.l += amount / 100;
                        hsl.l = Math.min(1, Math.max(0, hsl.l));

                        return Raphael.hsl2rgb(hsl.h, hsl.s, hsl.l);
                    },

                    darken = function (amount) {
                        amount = (amount === 0 || amount < 0) ? 0 : (amount || 10);
                        var hsl = toHsl();
                        hsl.l -= amount / 100;
                        hsl.l = Math.min(1, Math.max(0, hsl.l));

                        return Raphael.hsl2rgb(hsl.h, hsl.s, hsl.l);
                    };

                this.gradient = function (darkAmount, lightAmount) {
                    return angle + "-" + darken(darkAmount) + "-" + lighten(lightAmount);
                };
            },

            RaphaelConfigurator = function RaphaelConfigurator(paper) {
                if (!(this instanceof RaphaelConfigurator)) {
                    return new RaphaelConfigurator(paper);
                }
                var raphael = paper,
                    customAttribs = raphael.customAttributes || {},
                    calculateX = function (startX, R, angle) {
                        return startX + R * Math.cos(angle * RADIAN);
                    },
                    calculateAngledX = function (startX, R, initialAngle, terminalAngle) {
                        return startX + R * Math.cos((initialAngle + (terminalAngle - initialAngle)) * RADIAN);
                    },
                    calculateY = function (startY, R, angle) {
                        return startY + R * Math.sin(angle * RADIAN);
                    },
                    calculateAngledY = function (startY, R, initialAngle, terminalAngle) {
                        return startY + R * Math.sin((initialAngle + (terminalAngle - initialAngle)) * RADIAN);
                    };

                this.configure = function () {
                    customAttribs.slice = function (startX, startY, R1, initialAngle, terminalAngle) {
                        if (initialAngle === 0 && terminalAngle === 0) {
                            return [];
                        }

                        var R2 = (donut && !threeD) ? (tiltDonut ? R1 * tiltDonut : R1) : (threeD ? R1 * tilt3d : R1),
                            innerR1 = (R1 * donutDiameter),
                            innerR2 = (R2 * donutDiameter),
                            x1start = calculateX(startX, innerR1, initialAngle),
                            y1start = calculateY(startY, innerR2, initialAngle),
                            x1end = calculateX(startX, R1, initialAngle),
                            y1end = calculateY(startY, R2, initialAngle),
                            x2end = calculateX(startX, R1, terminalAngle),
                            y2end = calculateY(startY, R2, terminalAngle),
                            x2start = calculateAngledX(startX, innerR1, initialAngle, terminalAngle),
                            y2start = calculateAngledY(startY, innerR2, initialAngle, terminalAngle),
                            largeArcFlag = (Math.abs(terminalAngle - initialAngle) > 180),
                            sweepFlagPositiveAngle = 1; // positive angle

                        if (donut && !threeD) {
                            if (slicedPie) {
                                return {
                                    path: [
                                        ["M", x1start, y1start ],
                                        ["L", x1end, y1end ],
                                        ["A", R1, R2, 0, +largeArcFlag, sweepFlagPositiveAngle, x2end, y2end ],
                                        ["L", x2start, y2start ],
                                        ["A", innerR1, innerR2, 0, +largeArcFlag, (sweepFlagPositiveAngle - 1), x1start, y1start ],
                                        ["z"]
                                    ]
                                };
                            }

                            if (wholePie) {
                                return {
                                    path: [
                                        ["M", startX, startY - R2 ],
                                        ["a", R1, R2, 0, +largeArcFlag, (sweepFlagPositiveAngle - 1), 1, 0 ],
                                        ["M", x1start - innerR1, y1start - innerR2 ],
                                        ["a", innerR1, innerR2, 0, +largeArcFlag, sweepFlagPositiveAngle, -1, 0 ]
                                    ]
                                };
                            }
                        }

                        if (slicedPie) {
                            return {
                                path: [
                                    ["M", startX, startY ],
                                    ["L", x1end, y1end ],
                                    ["A", R1, R2, 0, +largeArcFlag, sweepFlagPositiveAngle, x2end, y2end ],
                                    ["z"]
                                ]
                            };
                        }

                        if (wholePie) {
                            return {
                                path: [
                                    ["M", startX, startY - R2],
                                    ["a", R1, R2, 0, +largeArcFlag, (sweepFlagPositiveAngle - 1), 1, 0],
                                    ["z"]
                                ]
                            };
                        }
                    };

                    customAttribs.arc = function (startX, startY, R1, initialAngle, terminalAngle) {

                        if (initialAngle === 0 && terminalAngle === 0) {
                            return [];
                        }

                        if (initialAngle < 180 && terminalAngle > 180) {
                            terminalAngle = 180;
                        }

                        var R2 = threeD ? R1 * tilt3d : R1,
                            x1start = calculateX(startX, R1, initialAngle),
                            y1start = calculateY(startY, R2, initialAngle),
                            y1end = calculateY(startY + height3d, R2, initialAngle),
                            x2start = calculateAngledX(startX, R1, initialAngle, terminalAngle),
                            y2start = calculateAngledY(startY, R2, initialAngle, terminalAngle),
                            y2end = calculateAngledY(startY + height3d, R2, initialAngle, terminalAngle),
                            largeArcFlag = (Math.abs(terminalAngle - initialAngle) > 180),
                            sweepFlagPositiveAngle = 1,
                            sweepFlagNegativeAngle = 0;

                        return {
                            path: [
                                ["M", x1start, y1start ],
                                ["L", x1start, y1end ], // draw down
                                ["A", R1, R2, 0, +largeArcFlag, sweepFlagPositiveAngle, x2start, y2end ],
                                ["L", x2start, y2start ],
                                ["A", R1, R2, 0, +largeArcFlag, sweepFlagNegativeAngle, x1start, y1start ],
                                ["z"]
                            ]
                        };
                    };

                    customAttribs.outline = function (startX, startY, R1, initialAngle, terminalAngle) {
                        var innerR1 = R1 + (threeD ? 3 : 1),
                            innerR2 = (threeD ? innerR1 * tilt3d : (donut && tiltDonut ? innerR1 * tiltDonut : innerR1)),
                            outlineThickness =
                                (threeD
                                    ? ((defaultOutlineRingThickness + defaultOutlineRingThickness * tilt3d) > 12
                                    ? 12
                                    : (defaultOutlineRingThickness + defaultOutlineRingThickness * tilt3d))
                                    : defaultOutlineRingThickness),
                            outerR1 = innerR1 + outlineThickness,
                            outerR2 = innerR2 + (threeD ? (outlineThickness / 2) : outlineThickness),
                            x1start = calculateX(startX, innerR1, initialAngle),
                            y1start = calculateY(startY, innerR2, initialAngle),
                            x1end = calculateX(startX, outerR1, initialAngle),
                            y1end = calculateY(startY, outerR2, initialAngle),
                            x2start = calculateAngledX(startX, innerR1, initialAngle, terminalAngle),
                            y2start = calculateAngledY(startY, innerR2, initialAngle, terminalAngle),
                            x2end = calculateAngledX(startX, outerR1, initialAngle, terminalAngle),
                            y2end = calculateAngledY(startY, outerR2, initialAngle, terminalAngle),
                            largeArcFlag = (Math.abs(terminalAngle - initialAngle) > 180),
                            sweepFlagPositiveAngle = 1,
                            sweepFlagNegativeAngle = 0;

                        return {
                            path: [
                                ["M", x1start, y1start ],
                                ["L", x1end, y1end ],
                                ["A", outerR1, outerR2, 0, +largeArcFlag, sweepFlagPositiveAngle, x2end, y2end ],
                                ["L", x2start, y2start ],
                                ["A", innerR1, innerR2, 0, +largeArcFlag, sweepFlagNegativeAngle, x1start, y1start ],
                                ["z"]
                            ]
                        };
                    };

                    customAttribs.wall = function (startX, startY, R1, angle) {
                        if (angle === 0) {
                            return [];
                        }

                        var R2 = threeD ? R1 * tilt3d : R1,
                            x = calculateX(startX, R1, angle),
                            y = calculateY(startY, R2, angle);

                        return {
                            path: [
                                ["M", startX, startY ],
                                ["L", startX, startY + height3d ],
                                ["L", x, y + height3d ],
                                ["L", x, y ],
                                ["z"]
                            ]
                        };
                    };
                };
            };

        function configure3DBorderZIndices() {
            if (threeD) {
                for (index = 0; index < data.length; index += 1) {
                    currentBucket = bucket[index];

                    if (slicedPie) {
                        if ((currentBucket.initialAngle >= 90 && currentBucket.initialAngle < 270)
                            || (currentBucket.initialAngle >= 450 && currentBucket.initialAngle < 630)) {
                            // the following order is important
                            currentBucket.initialSideBorder.toBack();
                            currentBucket.terminalSideBorder.toBack();
                        } else if ((currentBucket.terminalAngle > 270 && currentBucket.terminalAngle <= 360)
                            || (currentBucket.terminalAngle > 630 && currentBucket.terminalAngle <= 720)) {
                            currentBucket.initialSideBorder.toBack();
                        }

                        if ((currentBucket.terminalAngle > 0 && currentBucket.terminalAngle < 90)
                            || (currentBucket.terminalAngle > 360 && currentBucket.terminalAngle < 450)) {
                            currentBucket.terminalSideBorder.toFront();
                        }

                        if ((currentBucket.terminalAngle > 90 && currentBucket.terminalAngle < 180)
                            || (currentBucket.terminalAngle > 450 && currentBucket.terminalAngle < 540)) {
                            currentBucket.initialSideBorder.toFront();
                        }
                    }

                }

                for (index = 0; index < data.length; index += 1) {
                    currentBucket = bucket[index];
                    if ((currentBucket.initialAngle >= 0 && currentBucket.initialAngle < 180)
                        || (currentBucket.initialAngle >= 360 && currentBucket.initialAngle < 540)) {
                        currentBucket.arc.toFront();
                    } else {
                        currentBucket.arc.toBack();
                    }
                    currentBucket.slice.toFront();
                }
            }
        }

        Animator.prototype = {
            bind: function () {
                var self = this,
                    sliceMouseOverHandler = function () {
                        self.slice.stop();
                        self.slice.animate(self.sliceAnimationOut);
                        if (self.threeD) {
                            self.arc.stop();
                            self.initialSideBorder.stop();
                            self.terminalSideBorder.stop();
                            self.arc.animateWith(self.slice, self.sliceAnimationOut, self.bordersAnimationOut.arc);
                            self.initialSideBorder.animateWith(self.slice, self.sliceAnimationOut, self.bordersAnimationOut.initialSideBorder);
                            self.terminalSideBorder.animateWith(self.slice, self.sliceAnimationOut, self.bordersAnimationOut.terminalSideBorder);
                        }
                        configure3DBorderZIndices();
                    },
                    sliceMouseOutHandler = function () {
                        self.slice.animate(self.sliceAnimationIn);
                        if (self.threeD) {
                            self.arc.animateWith(self.slice, self.sliceAnimationIn, self.bordersAnimationIn.arc);
                            self.initialSideBorder.animateWith(self.slice, self.sliceAnimationIn, self.bordersAnimationIn.initialSideBorder);
                            self.terminalSideBorder.animateWith(self.slice, self.sliceAnimationIn, self.bordersAnimationIn.terminalSideBorder);
                        }
                    };

                this.slice.mouseover(sliceMouseOverHandler);
                this.slice.mouseout(sliceMouseOutHandler);
                if (self.threeD) {
                    this.arc.mouseover(sliceMouseOverHandler);
                    this.arc.mouseout(sliceMouseOutHandler);
                }
            }
        };

        function fill(color) {
            if (!gradient) {
                return color;
            }
            return new PieColor(color, gradientDegrees).gradient(gradientDarkness, gradientLightness);
        }

        function attr(shape, bucket, data) {
            var baseAttr = {
                "stroke": WHITE_COLOR,
                "stroke-width": 1.5,
                "stroke-linejoin": "round",
                "fill-rule": "evenodd",
                "fill": fill(bucket.color),
                "title": bucket.title,
                "cursor": cursor
            };
            baseAttr[shape] = data;

            return baseAttr;
        }

        function bindEffectHandlers(bucket) {
            var shortAnimationDelay = animationDelay / 4,
                shiftOutCoordinates = [bucket.shiftX, bucket.shiftY, R1, bucket.initialAngle, bucket.terminalAngle],
                startCoordinates = [bucket.startX, bucket.startY, R1, bucket.initialAngle, bucket.terminalAngle],
                scaleOut = {transform: "s1.1 1.1 " + startX + " " + startY},
                scaleNormal = {transform: "s1 1 " + startX + " " + startY},
                transformOut = {transform: "T" + (bucket.shiftX - cx) + ", " + (bucket.shiftY - cy)},
                transformNormal = {transform: "T 0, 0"},
                shiftOut = Raphael.animation(transformOut, shortAnimationDelay),
                shiftIn = Raphael.animation(transformNormal, shortAnimationDelay);

            if (easing === "shift-fast") {
                new Animator(bucket, threeD, shiftOut, shiftIn,
                    {
                        arc: shiftOut,
                        initialSideBorder: shiftOut,
                        terminalSideBorder: shiftOut
                    },
                    {
                        arc: shiftIn,
                        initialSideBorder: shiftIn,
                        terminalSideBorder: shiftIn
                    }).bind();

            } else if (easing === ELASTIC_EFFECT_NAME) {
                shiftOut = Raphael.animation(transformOut, animationDelay, ELASTIC_EFFECT_NAME);
                shiftIn = Raphael.animation(transformNormal, animationDelay, ELASTIC_EFFECT_NAME);
                new Animator(bucket, threeD, shiftOut, shiftIn,
                    {
                        arc: shiftOut,
                        initialSideBorder: shiftOut,
                        terminalSideBorder: shiftOut
                    },
                    {
                        arc: shiftIn,
                        initialSideBorder: shiftIn,
                        terminalSideBorder: shiftIn
                    }).bind();

            } else if (easing === "shift-slow") {
                shiftOut = Raphael.animation(transformOut, animationDelay);
                shiftIn = Raphael.animation(transformNormal, animationDelay);
                new Animator(bucket, threeD, shiftOut, shiftIn,
                    {
                        arc: shiftOut,
                        initialSideBorder: shiftOut,
                        terminalSideBorder: shiftOut
                    },
                    {
                        arc: shiftIn,
                        initialSideBorder: shiftIn,
                        terminalSideBorder: shiftIn
                    }).bind();

            } else if (easing === "shift-bounce") {
                new Animator(bucket, threeD,
                    Raphael.animation({slice: shiftOutCoordinates}, shortAnimationDelay),
                    Raphael.animation({slice: startCoordinates}, animationDelay, BOUNCE_EFFECT_NAME),
                    {
                        arc: Raphael.animation({arc: shiftOutCoordinates}, shortAnimationDelay),
                        initialSideBorder: Raphael.animation({wall: [bucket.shiftX, bucket.shiftY, R1, bucket.initialAngle]}, shortAnimationDelay),
                        terminalSideBorder: Raphael.animation({wall: [bucket.shiftX, bucket.shiftY, R1, bucket.terminalAngle]}, shortAnimationDelay)
                    },
                    {
                        arc: Raphael.animation({arc: startCoordinates}, animationDelay, BOUNCE_EFFECT_NAME),
                        initialSideBorder: Raphael.animation({wall: [bucket.startX, bucket.startY, R1, bucket.initialAngle]}, animationDelay, BOUNCE_EFFECT_NAME),
                        terminalSideBorder: Raphael.animation({wall: [bucket.startX, bucket.startY, R1, bucket.terminalAngle]}, animationDelay, BOUNCE_EFFECT_NAME)
                    }).bind();
            } else if (easing === "scale") {
                new Animator(bucket, threeD,
                    scaleOut,
                    scaleNormal,
                    {
                        arc: scaleOut,
                        initialSideBorder: scaleOut,
                        terminalSideBorder: scaleOut
                    },
                    {
                        arc: scaleNormal,
                        initialSideBorder: scaleNormal,
                        terminalSideBorder: scaleNormal
                    }).bind();
            } else if (easing === "scale-bounce") {
                new Animator(bucket, threeD,
                    scaleOut,
                    Raphael.animation(scaleNormal, animationDelay, BOUNCE_EFFECT_NAME),
                    {
                        arc: scaleOut,
                        initialSideBorder: scaleOut,
                        terminalSideBorder: scaleOut
                    },
                    {
                        arc: Raphael.animation(scaleNormal, animationDelay, BOUNCE_EFFECT_NAME),
                        initialSideBorder: Raphael.animation(scaleNormal, animationDelay, BOUNCE_EFFECT_NAME),
                        terminalSideBorder: Raphael.animation(scaleNormal, animationDelay, BOUNCE_EFFECT_NAME)
                    }).bind();
            } else if (easing === "outline") {
                bucket.slice.mouseover(function () {
                    bucket.slice.outline.show();
                    bucket.slice.outline.toFront();
                });

                bucket.slice.mouseout(function () {
                    bucket.slice.outline.hide();
                });
            } else if (easing && easing !== "") {
                console.error("Unknown hover effect name: " + easing);
            }
        }

        function renderChartLegend(bucket) {
            if (bucket.label === "") {
                return;
            }
            legendLabelYstart += 10;
            var text,
                radius = 9,
                markerElement = null,
                markerAttrs = {"title": bucket.label, "fill": bucket.color, "fill-rule": "nonzero", "stroke": WHITE_COLOR, "stroke-width": "0.1", "cursor": cursor};

            if (marker === "rect") {
                markerElement = paper.path("M " + legendXstart + ", " + legendYstart + " l 28,0  0,16  -28,0  0,-16z");
            } else if (marker === "circle") {
                markerElement = paper.circle(legendXstart + (2 * radius), legendYstart + radius, radius);
            } else if (marker === "ellipse") {
                radius = 10;
                markerElement = paper.ellipse(legendXstart + (2 * radius), legendYstart + radius, 1.25 * radius, radius * 0.75);
            }

            if (markerElement) {
                markerElement.attr(markerAttrs);
                markerElement.handle = bucket.handle;
                markers.push(markerElement);
            }

            text = paper.text(legendLabelXstart, legendLabelYstart, bucket.label);
            text.attr({"title": bucket.label, "font-family": fontFamily, "font-weight": "normal", "fill": "#474747", "cursor": cursor, "font-size": fontSize, "text-anchor": "start"});
            text.handle = bucket.handle;
            descriptions.push(text);

            legendYstart += 30;
            legendLabelYstart = legendYstart;
        }

        new RaphaelConfigurator(paper).configure();

        for (index = 0; index < data.length; index += 1) {
            total += data[index];
        }

        for (index = 0; index < data.length; index += 1) {
            currentValue = data[index] || 0;
            currentColor = colors[index] || "#FF0000";
            currentLabel = legendLabels[index] || "";
            currentTitle = titles[index] || "";
            currentHref = hrefs[index] || "";
            currentHandle = handles[index] || "";
            initialAngle = terminalAngle;
            if (!index) {
                initialAngle = orientation;
            }
            currentSliceAngle = 360 * currentValue / total;
            terminalAngle = initialAngle + currentSliceAngle;
            currentSliceShiftX = startX + shiftDistance * Math.cos((initialAngle + (terminalAngle - initialAngle) / 2) * RADIAN);
            currentSliceShiftY = startY + shiftDistance * Math.sin((initialAngle + (terminalAngle - initialAngle) / 2) * RADIAN);

            bucket[index] = {};
            bucket[index].color = currentColor;
            bucket[index].label = currentLabel;
            bucket[index].title = currentTitle;
            bucket[index].href = currentHref;
            bucket[index].handle = currentHandle;
            bucket[index].initialAngle = initialAngle;
            bucket[index].terminalAngle = terminalAngle;
            bucket[index].startX = startX;
            bucket[index].startY = startY;
            bucket[index].shiftX = currentSliceShiftX;
            bucket[index].shiftY = currentSliceShiftY;
            bucket[index].sliceOrigin = [startX, startY, R1, initialAngle, terminalAngle];
            bucket[index].sliceOriginZero = [startX, startY, R1, 0, 0];

            if (threeD) {
                bucket[index].arcOrigin = bucket[index].sliceOrigin;
                bucket[index].initialSideBorderOrigin = [startX, startY, R1, initialAngle];
                bucket[index].terminalSideBorderOrigin = [startX, startY, R1, terminalAngle];
                bucket[index].arcOriginZero = bucket[index].sliceOriginZero;
                bucket[index].initialSideBorderOriginZero = [startX, startY, R1, 0];
                bucket[index].terminalSideBorderOriginZero = [startX, startY, R1, 0];
            }
        }

        for (index = 0; index < data.length; index += 1) {
            currentBucket = bucket[index];
            if (threeD) {
                if (slicedPie) {
                    bucket[index].initialSideBorder = paper.path().attr(attr("wall", currentBucket, (evolution ? currentBucket.initialSideBorderOriginZero : currentBucket.initialSideBorderOrigin)));
                    bucket[index].terminalSideBorder = paper.path().attr(attr("wall", currentBucket, (evolution ? currentBucket.terminalSideBorderOriginZero : currentBucket.terminalSideBorderOrigin)));
                }
                bucket[index].arc = paper.path().attr(attr("arc", currentBucket, (evolution ? currentBucket.arcOriginZero : currentBucket.arcOrigin)));
            }
            bucket[index].slice = paper.path().attr(attr("slice", currentBucket, (evolution ? currentBucket.sliceOriginZero : currentBucket.sliceOrigin)));
            bucket[index].slice.handle = bucket[index].handle;
            if (slicedPie && easing.indexOf("outline") !== -1) {
                currentSliceOutline = paper.path().attr(attr("outline", currentBucket, bucket[index].sliceOrigin));
                bucket[index].slice.outline = currentSliceOutline;
                currentSliceOutline.hide();
            }
            slices.push(bucket[index].slice);

            if (slicedPie) {
                bindEffectHandlers(bucket[index]);
            }
            renderChartLegend(bucket[index]);
        }

        if (evolution) {
            timeout = window.setTimeout(function () {
                for (index = 0; index < bucket.length; index += 1) {
                    if (threeD) {
                        bucket[index].arc.animate({arc: bucket[index].arcOrigin}, animationDelay, BACKOUT_EFFECT_NAME);
                        if (slicedPie) {
                            bucket[index].initialSideBorder.animate({wall: bucket[index].initialSideBorderOrigin}, animationDelay, BACKOUT_EFFECT_NAME);
                            bucket[index].terminalSideBorder.animate({wall: bucket[index].terminalSideBorderOrigin}, animationDelay, BACKOUT_EFFECT_NAME);
                        }
                    }
                    bucket[index].slice.animate({slice: bucket[index].sliceOrigin}, animationDelay, BACKOUT_EFFECT_NAME);
                }

                window.clearTimeout(timeout);
                configure3DBorderZIndices();
            }, 200);
        } else {
            configure3DBorderZIndices();
        }

        return {slices: slices.items, markers: markers.items, descriptions: descriptions.items};
    }

    Raphael.fn.pielicious = function (cx, cy, R, opts) {
        return new Pielicious(this, cx, cy, R, opts);
    };
}());