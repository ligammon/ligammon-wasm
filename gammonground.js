var Gammonground = (function () {
    'use strict';

    const colors = ['white', 'black'];
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';', '<', '='];

    const x = 13;
    const invRanks = [...ranks].reverse();
    const allKeys = Array.prototype.concat(...files.map(c => ranks.map(r => c + r)));
    const pos2key = (pos) => allKeys[x * pos[0] + pos[1]];
    const key2pos = (k) => [k.charCodeAt(0) - 97, k.charCodeAt(1) - 49];
    allKeys.map(key2pos);
    function memo(f) {
        let v;
        const ret = () => {
            if (v === undefined)
                v = f();
            return v;
        };
        ret.clear = () => {
            v = undefined;
        };
        return ret;
    }
    const timer = () => {
        let startAt;
        return {
            start() {
                startAt = performance.now();
            },
            cancel() {
                startAt = undefined;
            },
            stop() {
                if (!startAt)
                    return 0;
                const time = performance.now() - startAt;
                startAt = undefined;
                return time;
            },
        };
    };
    const opposite = (c) => (c === 'white' ? 'black' : 'white');
    const distanceSq = (pos1, pos2) => {
        const dx = pos1[0] - pos2[0], dy = pos1[1] - pos2[1];
        return dx * dx + dy * dy;
    };
    const samePiece = (p1, p2) => p1.role === p2.role && p1.color === p2.color;
    const posToTranslate = (bounds) => (pos, asWhite) => [((asWhite ? pos[0] : x - 1 - pos[0]) * bounds.width) / x, ((asWhite ? x - 1 - pos[1] : pos[1]) * bounds.height) / x];
    const translate = (el, pos) => {
        el.style.transform = `translate(${pos[0]}px,${pos[1]}px)`;
    };
    const setVisible = (el, v) => {
        el.style.visibility = v ? 'visible' : 'hidden';
    };
    const eventPosition = (e) => {
        var _a;
        if (e.clientX || e.clientX === 0)
            return [e.clientX, e.clientY];
        if ((_a = e.targetTouches) === null || _a === void 0 ? void 0 : _a[0])
            return [e.targetTouches[0].clientX, e.targetTouches[0].clientY];
        return; // touchend has no position!
    };
    const createEl = (tagName, className) => {
        const el = document.createElement(tagName);
        if (className)
            el.className = className;
        return el;
    };
    function computeSquareCenter(key, asWhite, bounds) {
        const pos = key2pos(key);
        if (!asWhite) {
            pos[0] = x - 1 - pos[0];
            pos[1] = x - 1 - pos[1];
        }
        return [
            bounds.left + (bounds.width * pos[0]) / x + bounds.width / (x * 2),
            bounds.top + (bounds.height * (x - 1 - pos[1])) / x + bounds.height / (x * 2),
        ];
    }
    // 13x13 Backgammon specific functions
    function isGammonLegal(orig, dest, pieces) {
        return (isPip(dest) && !isSamePip(orig, dest) && !isOccupied(orig, dest, pieces));
    }
    function square2pip(square) {
        //const x = square[0].charCodeAt() - 'a'.charCodeAt();
        //const y = square[1].charCodeAt() - '0'.charCodeAt();
        const xy = key2pos(square);
        const x = xy[0];
        const y = xy[1];
        //console.log("x, y: ", x, ",",y);
        if (y >= 7) {
            return (24 - x) + (x / 7 >> 0);
        }
        return (x + 1) - (x / 7 >> 0);
    }
    function isPip(key) {
        const pos = key2pos(key);
        return (pos[0] != 6 && pos[1] != 6);
    }
    // returns true if orig and dest share a triangle
    function isSamePip(orig, dest) {
        const pos1 = key2pos(orig);
        const pos2 = key2pos(dest);
        return (!(dest == 'a0') &&
            (pos1[0] == pos2[0]) &&
            (pos1[1] - pos2[1] < 6) &&
            (((pos1[1] / 7) >> 0) - ((pos2[1] / 7) >> 0) == 0));
    }
    // returns true if dest triangle has 1 or fewer of opponent's pieces
    function isOccupied(orig, dest, pieces) {
        var _a;
        var count = getCount(dest, pieces);
        return ((_a = pieces.get(orig)) === null || _a === void 0 ? void 0 : _a.color) == "black" ? count > 1 : count < -1;
    }
    // returns number signifying how many checkers on destination
    // pip, with numbers less than 0 representing black
    // TODO make this in the style of chessground
    function getCount(dest, pieces) {
        var count = 0;
        const pos = key2pos(dest);
        var nextPos = pos;
        const start = ((pos[1] / 7) >> 0) * 12;
        const incr = (pos[1] / 7 >> 0) ? -1 : 1;
        for (var i = start; i != 6; i += incr) {
            nextPos[1] = i;
            var p = pieces.get(pos2key(nextPos));
            if (p) {
                if (p.color == "black") {
                    count--;
                }
                else {
                    count++;
                }
            }
        }
        return count;
    }
    function pip2square(pip) {
        let pv = 24 - parseInt(pip);
        if (pv < 0) {
            return "g6";
        }
        else if (pv > 23) {
            return "a>";
        }
        else {
            if (pv < 12) {
                return pos2key([(pv) + (pv / 6 >> 0), 0]);
            }
            else {
                return pos2key([(24 - pv) + (((24 - pv) / 7) >> 0) - 1, 12]);
            }
        }
    }

    function callUserFunction(f, ...args) {
        if (f)
            setTimeout(() => f(...args), 1);
    }
    function toggleOrientation(state) {
        state.orientation = opposite(state.orientation);
        state.animation.current = state.draggable.current = state.selected = undefined;
    }
    function setPieces(state, pieces) {
        for (const [key, piece] of pieces) {
            if (piece)
                state.pieces.set(key, piece);
            else
                state.pieces.delete(key);
        }
    }
    function baseMove(state, orig, dest) {
        var _a, _b, _c;
        const origPiece = state.pieces.get(orig), destPiece = state.pieces.get(dest);
        if (orig === dest || !origPiece)
            return false;
        const captured = destPiece && destPiece.color !== origPiece.color ? destPiece : undefined;
        //const captured = destPiece;
        if (dest === state.selected)
            unselect(state);
        callUserFunction(state.events.move, orig, dest, captured);
        //if (!tryAutoCastle(state, orig, dest)) {
        state.pieces.set(dest, origPiece);
        state.pieces.delete(orig);
        //}
        // don't register slid checkers
        if (!isSamePip(orig, dest)) {
            state.lastMove = [orig, dest];
            if (orig.charAt(0) == 'g') {
                (_a = state.lastGammonMove) === null || _a === void 0 ? void 0 : _a.push('25/' + square2pip(dest));
            }
            else if (dest == 'a0') {
                (_b = state.lastGammonMove) === null || _b === void 0 ? void 0 : _b.push(square2pip(orig) + '/0');
            }
            else {
                (_c = state.lastGammonMove) === null || _c === void 0 ? void 0 : _c.push(square2pip(orig) + '/' + square2pip(dest));
            }
        }
        //state.lastMove = [orig, dest];
        callUserFunction(state.events.change);
        return captured || true;
    }
    function baseNewPiece(state, piece, key, force) {
        if (state.pieces.has(key)) {
            if (force)
                state.pieces.delete(key);
            else
                return false;
        }
        callUserFunction(state.events.dropNewPiece, piece, key);
        state.pieces.set(key, piece);
        state.lastMove = [key];
        //state.lastGammonMove = [];
        callUserFunction(state.events.change);
        state.movable.dests = undefined;
        //state.turnColor = opposite(state.e);
        return true;
    }
    function baseUserMove(state, orig, dest) {
        const result = baseMove(state, orig, dest);
        if (result) {
            state.movable.dests = undefined;
            //state.turnColor = opposite(state.turnColor);
            state.animation.current = undefined;
        }
        return result;
    }
    function userMove(state, orig, dest) {
        var _a, _b, _c;
        if (canMove(state, orig, dest)) {
            var result;
            // Gammonground
            const clr = (_a = state.pieces.get(orig)) === null || _a === void 0 ? void 0 : _a.color;
            var isSame = ((_b = state.pieces.get(orig)) === null || _b === void 0 ? void 0 : _b.color) == ((_c = state.pieces.get(dest)) === null || _c === void 0 ? void 0 : _c.color);
            const pos1 = key2pos(orig);
            const pos2 = key2pos(dest);
            const incr1 = pos1[1] > 6 ? -1 : 1;
            const incr2 = pos2[1] > 6 ? -1 : 1;
            var k = pos2[1];
            var i = pos1[1] + incr1;
            if (dest == 'a0' || dest == 'a>') {
                result = baseUserMove(state, orig, dest);
            }
            else {
                if (isSame) {
                    // slide checkers dest up
                    for (k = pos2[1]; (k + incr2) != 6 && state.pieces.get(pos2key([pos2[0], k + incr2])); k += incr2)
                        ;
                    if (k + incr2 == 6) {
                        // original move
                        //console.log(state.dom);
                        //setText(state.pieces.get(dest));
                        //if (state.checkerCounts)
                        //state.checkerCounts[square2pip(pos2key(pos2))] += 1;
                        result = baseUserMove(state, orig, dest);
                    }
                    else {
                        result = baseUserMove(state, orig, pos2key([pos2[0], k + incr2]));
                    }
                }
                else {
                    // The original move
                    result = baseUserMove(state, orig, dest);
                }
            }
            if (result) {
                const holdTime = state.hold.stop();
                unselect(state);
                const metadata = {
                    ctrlKey: state.stats.ctrlKey,
                    holdTime,
                };
                if (result !== true) {
                    metadata.captured = result;
                }
                callUserFunction(state.movable.events.after, orig, dest, metadata);
                // TODO grab checkers from top orig 
                for (var i = pos1[1] + incr1; i != 6 && state.pieces.get(pos2key([pos1[0], i])); i += incr1) {
                    baseUserMove(state, pos2key([pos1[0], i]), pos2key([pos1[0], i - incr1]));
                }
                if (dest == 'a0' || dest == 'a>') {
                    if (state.checkerCounts) {
                        let inc = clr == 'white' ? -1 : 1;
                        let p1 = square2pip(pos2key(pos1)) - 1;
                        if (dest == 'a0') {
                            state.checkerCounts[26] += inc;
                        }
                        else {
                            state.checkerCounts[27] += inc;
                        }
                        state.checkerCounts[p1 + (p1 / 6 >> 0) - (p1 / 12 >> 0)] -= inc;
                        if (Math.abs(state.checkerCounts[p1 + (p1 / 6 >> 0) - (p1 / 12 >> 0)]) > 5) {
                            state.pieces.set(pos2key([pos1[0], i - incr1]), { role: 'checker', color: inc < 0 ? 'white' : 'black', });
                        }
                    }
                    return true;
                }
                // TODO slide successive checkers down to destination to fill gap
                var p2 = state.pieces.get(dest);
                for (var j = pos2[1]; j != ((pos2[1] / 7) >> 0) * 12; j -= incr2) {
                    var p = state.pieces.get(pos2key([pos2[0], j - incr2]));
                    if (p && p2 && samePiece(p, p2)) {
                        break;
                    }
                }
                baseUserMove(state, dest, pos2key([pos2[0], j]));
                state.lastMove = [pos2key([pos1[0], i - incr1]), isSame ? pos2key([pos2[0], k + incr2 == 6 ? k : k + incr2]) : pos2key([pos2[0], j])];
                if (state.checkerCounts) {
                    let p1 = square2pip(pos2key(pos1)) - 1;
                    let p2 = square2pip(pos2key(pos2)) - 1;
                    let inc = clr == 'white' ? -1 : 1;
                    state.checkerCounts[p2 + (p2 / 6 >> 0) - (p2 / 12 >> 0)] += inc;
                    // if captured
                    if (state.checkerCounts[p2 + (p2 / 6 >> 0) - (p2 / 12 >> 0)] == 0) {
                        state.pieces.set(pos2key([6, inc > 0 ? 5 : 7]), { role: 'checker', color: inc > 0 ? 'white' : 'black', });
                        state.checkerCounts[inc > 0 ? 6 : 19] -= inc;
                        state.checkerCounts[p2 + (p2 / 6 >> 0) - (p2 / 12 >> 0)] = inc;
                    }
                    if (pos1[0] == 6) { // if origin is on bar
                        state.checkerCounts[inc > 0 ? 19 : 6] -= inc;
                        if (Math.abs(state.checkerCounts[inc > 0 ? 19 : 6]) > 0) {
                            state.pieces.set(pos2key([6, inc < 0 ? 5 : 7]), { role: 'checker', color: inc < 0 ? 'white' : 'black', });
                        }
                    }
                    else {
                        state.checkerCounts[p1 + (p1 / 6 >> 0) - (p1 / 12 >> 0)] -= inc;
                        if (Math.abs(state.checkerCounts[p1 + (p1 / 6 >> 0) - (p1 / 12 >> 0)]) > 5) {
                            state.pieces.set(pos2key([pos1[0], i - incr1]), { role: 'checker', color: inc < 0 ? 'white' : 'black', });
                        }
                    }
                }
                return true;
            }
        }
        unselect(state);
        return false;
    }
    function dropNewPiece(state, orig, dest, force) {
        const piece = state.pieces.get(orig);
        if (piece && (canDrop(state, orig, dest) || force)) {
            state.pieces.delete(orig);
            baseNewPiece(state, piece, dest, force);
            callUserFunction(state.movable.events.afterNewPiece, piece.role, dest, {});
        }
        state.pieces.delete(orig);
        unselect(state);
    }
    function selectSquare(state, key, force) {
        callUserFunction(state.events.select, key);
        if (state.selected) {
            if (state.selected === key && !state.draggable.enabled) {
                unselect(state);
                state.hold.cancel();
                return;
            }
            else if ((state.selectable.enabled || force) && state.selected !== key) {
                if (userMove(state, state.selected, key)) {
                    state.stats.dragged = false;
                    return;
                }
            }
        }
        if (isMovable(state, key)) {
            setSelected(state, key);
            state.hold.start();
        }
    }
    function setSelected(state, key) {
        state.selected = key;
    }
    function unselect(state) {
        state.selected = undefined;
        state.hold.cancel();
    }
    function isMovable(state, orig) {
        const piece = state.pieces.get(orig);
        return (!!piece &&
            piece.role == 'checker' &&
            (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color)));
    }
    function canMove(state, orig, dest) {
        var _a, _b;
        return (orig !== dest && isMovable(state, orig) && (state.movable.color == 'white' || state.movable.free || !!((_b = (_a = state.movable.dests) === null || _a === void 0 ? void 0 : _a.get(orig)) === null || _b === void 0 ? void 0 : _b.includes(dest)) || dest == 'a0') && (isGammonLegal(orig, dest, state.pieces) || dest == 'a0' || dest == 'a>'));
    }
    function canDrop(state, orig, dest) {
        const piece = state.pieces.get(orig);
        return (!!piece &&
            (orig === dest || !state.pieces.has(dest)) &&
            (state.movable.color === 'both' || (state.movable.color === piece.color && state.turnColor === piece.color)));
    }
    function isDraggable(state, orig) {
        const piece = state.pieces.get(orig);
        return (!!piece &&
            state.draggable.enabled &&
            (state.movable.color === 'both') || (state.movable.color === (piece === null || piece === void 0 ? void 0 : piece.color)) // && (state.turnColor === piece.color || state.premovable.enabled)))
        );
    }
    function cancelMove(state) {
        unselect(state);
    }
    function stop(state) {
        state.movable.color = state.movable.dests = state.animation.current = undefined;
        cancelMove(state);
    }
    function getKeyAtDomPos(pos, asWhite, bounds) {
        let file = Math.floor((x * (pos[0] - bounds.left)) / bounds.width);
        if (!asWhite)
            file = x - 1 - file;
        let rank = x - 1 - Math.floor((x * (pos[1] - bounds.top)) / bounds.height);
        if (!asWhite)
            rank = x - 1 - rank;
        return file >= 0 && file < x && rank >= 0 && rank < x ? pos2key([file, rank]) : undefined;
    }
    function whitePov(s) {
        return s.orientation === 'white';
    }

    const initial = 'board:somebody:gnubg:1:0:0:0:-2:0:0:0:0:5:0:3:0:0:0:-5:5:0:0:0:-3:0:-5:0:0:0:0:2:0:0:0:1:3:1:1:1:1:0:1:-1:0:25:0:0:0:0:0:0:0:0';
    const letters = {
        checker: 'c',
        undo: 'u',
        double: 'd',
        resign1: 'r',
        resign2: 's',
        resign3: 't',
        d1: '1',
        d2: '2',
        d3: '3',
        d4: '4',
        d5: '5',
        d6: '6',
    };
    const dice = {
        '1': 'd1',
        '2': 'd2',
        '3': 'd3',
        '4': 'd4',
        '5': 'd5',
        '6': 'd6',
    };
    function readCounts(fen) {
        if (fen === 'start')
            fen = initial;
        var my_string = fen.split(':');
        const counts = new Array();
        // for (let i = 0; i < 12; i++) {
        //   if (i==6) r++;
        //   let count = parseInt(my_string[i+7]);
        //   let count2 = parseInt(my_string[23-i+7]);
        //   r++;
        // }
        for (var i = 0; i < 24; i++) {
            //counts.push(1);
            if (i == 6) {
                counts.push(parseInt(my_string[6]));
            }
            else if (i == 18) {
                counts.push(parseInt(my_string[31]));
            }
            counts.push(parseInt(my_string[i + 7]));
        }
        counts.push(parseInt(my_string[45]));
        counts.push(0 - parseInt(my_string[46]));
        counts.push(parseInt(my_string[37]));
        return counts;
    }
    function read(fen) {
        if (fen === 'start')
            fen = initial;
        const pieces = new Map();
        var my_string = fen.split(':');
        let r = 0;
        for (let i = 0; i < 12; i++) {
            if (i == 6)
                r++;
            let count = parseInt(my_string[i + 7]);
            let count2 = parseInt(my_string[23 - i + 7]);
            if (count != 0) {
                for (var c = 0; c < Math.min(Math.abs(count), 6); c++) {
                    pieces.set(pos2key([r, c]), { role: 'checker', color: count > 0 ? 'black' : 'white', });
                }
            }
            if (count2 != 0) {
                for (var c = 0; c < Math.min(Math.abs(count2), 6); c++) {
                    pieces.set(pos2key([r, 12 - c]), { role: 'checker', color: count2 > 0 ? 'black' : 'white', });
                }
            }
            r++;
        }
        var turn = parseInt(my_string[32]);
        if (parseInt(my_string[33]) > 0) {
            var x = turn > 0 ? 9 : 2;
            pieces.set(pos2key([x, 6]), { role: dice[my_string[33]], color: turn > 0 ? 'black' : 'white', });
            //pieces.move(pos2key([x,6]), pos2key([x,8]));
            pieces.set(pos2key([x + 1, 6]), { role: dice[my_string[34]], color: turn > 0 ? 'black' : 'white', });
            if (turn > 0) {
                pieces.set(pos2key([12, 6]), { role: 'undo', color: 'black' });
            }
        }
        //var cubeValue = parseInt(my_string[37]);
        var iMayDouble = parseInt(my_string[38]);
        var opponentMayDouble = parseInt(my_string[39]);
        //var wasDoubled = parseInt(my_string[40]);
        if (iMayDouble && opponentMayDouble) ;
        else if (iMayDouble) {
            pieces.set(pos2key([6, 0]), { role: 'double', color: 'black' });
        }
        else if (opponentMayDouble) {
            pieces.set(pos2key([6, 12]), { role: 'double', color: 'black' });
        }
        // draw bar checkers
        if (parseInt(my_string[31]) != 0) {
            pieces.set(pos2key([6, 7]), { role: 'checker', color: 'black' });
        }
        if (parseInt(my_string[6]) != 0) {
            pieces.set(pos2key([6, 5]), { role: 'checker', color: 'white' });
        }
        // draw off checkers
        if (parseInt(my_string[46]) != 0) {
            pieces.set('a>', { role: 'checker', color: 'white' });
        }
        if (parseInt(my_string[45]) != 0) {
            pieces.set('a0', { role: 'checker', color: 'black' });
        }
        return pieces;
    }
    // TODO this is still for chess
    function write(pieces) {
        return invRanks
            .map(y => files
            .map(x => {
            const piece = pieces.get((x + y));
            if (piece) {
                let p = letters[piece.role];
                if (piece.color === 'white')
                    p = p.toUpperCase();
                if (piece.promoted)
                    p += '~';
                return p;
            }
            else
                return '1';
        })
            .join(''))
            .join('/')
            .replace(/1{2,}/g, s => s.length.toString());
    }

    function applyAnimation(state, config) {
        if (config.animation) {
            deepMerge(state.animation, config.animation);
            // no need for such short animations
            if ((state.animation.duration || 0) < 70)
                state.animation.enabled = false;
        }
    }
    function configure(state, config) {
        var _a;
        // don't merge destinations and autoShapes. Just override.
        if ((_a = config.movable) === null || _a === void 0 ? void 0 : _a.dests)
            state.movable.dests = undefined;
        config.lastGammonMove = [];
        deepMerge(state, config);
        // if a fen was provided, replace the pieces
        if (config.fen) {
            state.pieces = read(config.fen);
            state.checkerCounts = readCounts(config.fen);
        }
        // apply config values that could be undefined yet meaningful
        if ('lastMove' in config && !config.lastMove)
            state.lastMove = undefined;
        // in case of ZH drop last move, there's a single square.
        // if the previous last move had two squares,
        // the merge algorithm will incorrectly keep the second square.
        else if (config.lastMove)
            state.lastMove = config.lastMove;
        // fix move/premove dests
        if (state.selected)
            setSelected(state, state.selected);
        applyAnimation(state, config);
    }
    function deepMerge(base, extend) {
        for (const key in extend) {
            if (isObject(base[key]) && isObject(extend[key]))
                deepMerge(base[key], extend[key]);
            else
                base[key] = extend[key];
        }
    }
    function isObject(o) {
        return typeof o === 'object';
    }

    function anim(mutation, state) {
        return state.animation.enabled ? animate(mutation, state) : render$1(mutation, state);
    }
    function render$1(mutation, state) {
        const result = mutation(state);
        state.dom.redraw();
        return result;
    }
    function makePiece(key, piece) {
        return {
            key: key,
            pos: key2pos(key),
            piece: piece,
        };
    }
    function closer(piece, pieces) {
        return pieces.sort((p1, p2) => {
            return distanceSq(piece.pos, p1.pos) - distanceSq(piece.pos, p2.pos);
        })[0];
    }
    function computePlan(prevPieces, current) {
        const anims = new Map(), animedOrigs = [], fadings = new Map(), missings = [], news = [], prePieces = new Map();
        let curP, preP, vector;
        for (const [k, p] of prevPieces) {
            prePieces.set(k, makePiece(k, p));
        }
        for (const key of allKeys) {
            curP = current.pieces.get(key);
            preP = prePieces.get(key);
            if (curP) {
                if (preP) {
                    if (!samePiece(curP, preP.piece)) {
                        missings.push(preP);
                        news.push(makePiece(key, curP));
                    }
                }
                else
                    news.push(makePiece(key, curP));
            }
            else if (preP)
                missings.push(preP);
        }
        for (const newP of news) {
            preP = closer(newP, missings.filter(p => samePiece(newP.piece, p.piece)));
            if (preP) {
                vector = [preP.pos[0] - newP.pos[0], preP.pos[1] - newP.pos[1]];
                anims.set(newP.key, vector.concat(vector));
                animedOrigs.push(preP.key);
            }
        }
        for (const p of missings) {
            if (!animedOrigs.includes(p.key))
                fadings.set(p.key, p.piece);
        }
        return {
            anims: anims,
            fadings: fadings,
        };
    }
    function step(state, now) {
        const cur = state.animation.current;
        if (cur === undefined) {
            // animation was canceled :(
            if (!state.dom.destroyed)
                state.dom.redrawNow();
            return;
        }
        const rest = 1 - (now - cur.start) * cur.frequency;
        if (rest <= 0) {
            state.animation.current = undefined;
            state.dom.redrawNow();
        }
        else {
            const ease = easing(rest);
            for (const cfg of cur.plan.anims.values()) {
                cfg[2] = cfg[0] * ease;
                cfg[3] = cfg[1] * ease;
            }
            state.dom.redrawNow(true); // optimisation: don't render SVG changes during animations
            requestAnimationFrame((now = performance.now()) => step(state, now));
        }
    }
    function animate(mutation, state) {
        // clone state before mutating it
        const prevPieces = new Map(state.pieces);
        const result = mutation(state);
        const plan = computePlan(prevPieces, state);
        if (plan.anims.size || plan.fadings.size) {
            const alreadyRunning = state.animation.current && state.animation.current.start;
            state.animation.current = {
                start: performance.now(),
                frequency: 1 / state.animation.duration,
                plan: plan,
            };
            if (!alreadyRunning)
                step(state, performance.now());
        }
        else {
            // don't animate, just render right away
            state.dom.redraw();
        }
        return result;
    }
    // https://gist.github.com/gre/1650294
    function easing(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    function start$1(s, e) {
        if (!e.isTrusted || (e.button !== undefined && e.button !== 0))
            return; // only touch or left click
        if (e.touches && e.touches.length > 1)
            return; // support one finger touch only
        const bounds = s.dom.bounds(), position = eventPosition(e), orig = getKeyAtDomPos(position, whitePov(s), bounds);
        if (!orig)
            return;
        const piece = s.pieces.get(orig);
        const previouslySelected = s.selected;
        // Prevent touch scroll and create no corresponding mouse event, if there
        // is an intent to interact with the board.
        if (e.cancelable !== false &&
            (!e.touches || s.blockTouchScroll || piece || previouslySelected || pieceCloseTo(s, position)))
            e.preventDefault();
        s.stats.ctrlKey = e.ctrlKey;
        if (s.selected && canMove(s, s.selected, orig)) {
            anim(state => selectSquare(state, orig), s);
        }
        else {
            selectSquare(s, orig);
        }
        const stillSelected = s.selected === orig;
        const element = pieceElementByKey(s, orig);
        if (piece && element && stillSelected && isDraggable(s, orig)) {
            s.draggable.current = {
                orig,
                piece,
                origPos: position,
                pos: position,
                started: s.draggable.autoDistance && s.stats.dragged,
                element,
                previouslySelected,
                originTarget: e.target,
                keyHasChanged: false,
            };
            element.cgDragging = true;
            element.classList.add('dragging');
            // place ghost
            const ghost = s.dom.elements.ghost;
            if (ghost) {
                ghost.className = `ghost ${piece.color} ${piece.role}`;
                translate(ghost, posToTranslate(bounds)(key2pos(orig), whitePov(s)));
                setVisible(ghost, true);
            }
            processDrag(s);
        }
        s.dom.redraw();
    }
    function pieceCloseTo(s, pos) {
        const asWhite = whitePov(s), bounds = s.dom.bounds(), radiusSq = Math.pow(bounds.width / x, 2);
        for (const key of s.pieces.keys()) {
            const center = computeSquareCenter(key, asWhite, bounds);
            if (distanceSq(center, pos) <= radiusSq)
                return true;
        }
        return false;
    }
    function dragNewPiece(s, piece, e, force) {
        const key = 'a0';
        s.pieces.set(key, piece);
        s.dom.redraw();
        const position = eventPosition(e);
        s.draggable.current = {
            orig: key,
            piece,
            origPos: position,
            pos: position,
            started: true,
            element: () => pieceElementByKey(s, key),
            originTarget: e.target,
            newPiece: true,
            force: !!force,
            keyHasChanged: false,
        };
        processDrag(s);
    }
    function processDrag(s) {
        requestAnimationFrame(() => {
            var _a;
            const cur = s.draggable.current;
            if (!cur)
                return;
            // cancel animations while dragging
            if ((_a = s.animation.current) === null || _a === void 0 ? void 0 : _a.plan.anims.has(cur.orig))
                s.animation.current = undefined;
            // if moving piece is gone, cancel
            const origPiece = s.pieces.get(cur.orig);
            if (!origPiece || !samePiece(origPiece, cur.piece))
                cancel(s);
            else {
                if (!cur.started && distanceSq(cur.pos, cur.origPos) >= Math.pow(s.draggable.distance, 2))
                    cur.started = true;
                if (cur.started) {
                    // support lazy elements
                    if (typeof cur.element === 'function') {
                        const found = cur.element();
                        if (!found)
                            return;
                        found.cgDragging = true;
                        found.classList.add('dragging');
                        cur.element = found;
                    }
                    const bounds = s.dom.bounds();
                    translate(cur.element, [
                        cur.pos[0] - bounds.left - bounds.width / 16,
                        cur.pos[1] - bounds.top - bounds.height / 16,
                    ]);
                    cur.keyHasChanged || (cur.keyHasChanged = cur.orig !== getKeyAtDomPos(cur.pos, whitePov(s), bounds));
                }
            }
            processDrag(s);
        });
    }
    function move(s, e) {
        // support one finger touch only
        if (s.draggable.current && (!e.touches || e.touches.length < 2)) {
            s.draggable.current.pos = eventPosition(e);
        }
    }
    function end(s, e) {
        var _a, _b, _c, _d, _e, _f;
        const cur = s.draggable.current;
        if (!cur) {
            // TODO delete if clicked off screen
            if (s.draggable.deleteOnDropOff && s.selected) {
                const b = s.dom.bounds();
                const epos = eventPosition(e);
                if (epos) {
                    if (epos[0] < b.left || epos[0] > b.right || epos[1] < b.top || epos[1] > b.bottom) {
                        //if (cur && cur.origin)
                        // console.log("GETSD ERE", s.selected);
                        if ((_c = (_b = (_a = s.movable) === null || _a === void 0 ? void 0 : _a.dests) === null || _b === void 0 ? void 0 : _b.get(s.selected)) === null || _c === void 0 ? void 0 : _c.includes('a0')) {
                            userMove(s, s.selected, 'a0');
                        }
                        //s.pieces.delete(s.selected);
                        callUserFunction(s.events.change);
                        unselect(s);
                        removeDragElements(s);
                        s.draggable.current = undefined;
                        s.dom.redraw();
                    }
                }
            }
            return;
        }
        // create no corresponding mouse event
        if (e.type === 'touchend' && e.cancelable !== false)
            e.preventDefault();
        // comparing with the origin target is an easy way to test that the end event
        // has the same touch origin
        if (e.type === 'touchend' && cur.originTarget !== e.target && !cur.newPiece) {
            s.draggable.current = undefined;
            return;
        }
        // touchend has no position; so use the last touchmove position instead
        const eventPos = eventPosition(e) || cur.pos;
        const dest = getKeyAtDomPos(eventPos, whitePov(s), s.dom.bounds());
        //const dest = board.getKeyAtDomPos(eventPos, board.whitePov(s), s.dom.bounds());
        if (dest && cur.started && cur.orig !== dest) {
            if (cur.newPiece)
                dropNewPiece(s, cur.orig, dest, cur.force);
            else {
                s.stats.ctrlKey = e.ctrlKey;
                if (userMove(s, cur.orig, dest))
                    s.stats.dragged = true;
            }
        }
        else if (cur.newPiece) {
            s.pieces.delete(cur.orig);
        }
        else if (s.draggable.deleteOnDropOff && !dest && ((_f = (_e = (_d = s.movable) === null || _d === void 0 ? void 0 : _d.dests) === null || _e === void 0 ? void 0 : _e.get(cur === null || cur === void 0 ? void 0 : cur.orig)) === null || _f === void 0 ? void 0 : _f.includes('a0'))) {
            userMove(s, cur.orig, 'a0');
            //s.pieces.delete(cur.orig);
            callUserFunction(s.events.change);
        }
        if ((cur.orig === cur.previouslySelected || cur.keyHasChanged) && (cur.orig === dest || !dest))
            unselect(s);
        else if (!s.selectable.enabled)
            unselect(s);
        removeDragElements(s);
        s.draggable.current = undefined;
        s.dom.redraw();
    }
    function cancel(s) {
        const cur = s.draggable.current;
        if (cur) {
            if (cur.newPiece)
                s.pieces.delete(cur.orig);
            s.draggable.current = undefined;
            unselect(s);
            removeDragElements(s);
            s.dom.redraw();
        }
    }
    function removeDragElements(s) {
        const e = s.dom.elements;
        if (e.ghost)
            setVisible(e.ghost, false);
    }
    function pieceElementByKey(s, key) {
        let el = s.dom.elements.board.firstChild;
        while (el) {
            if (el.cgKey === key && el.tagName === 'PIECE')
                return el;
            el = el.nextSibling;
        }
        return;
    }

    // see API types and documentations in dts/api.d.ts
    function start(state, redrawAll) {
        function toggleOrientation$1() {
            toggleOrientation(state);
            redrawAll();
        }
        return {
            set(config) {
                if (config.orientation && config.orientation !== state.orientation)
                    toggleOrientation$1();
                applyAnimation(state, config);
                (config.fen ? anim : render$1)(state => configure(state, config), state);
            },
            state,
            getFen: () => write(state.pieces),
            toggleOrientation: toggleOrientation$1,
            setPieces(pieces) {
                anim(state => setPieces(state, pieces), state);
            },
            selectSquare(key, force) {
                if (key)
                    anim(state => selectSquare(state, key, force), state);
                else if (state.selected) {
                    unselect(state);
                    state.dom.redraw();
                }
            },
            move(orig, dest) {
                anim(state => baseMove(state, orig, dest), state);
            },
            gammonMove(orig, dest) {
                let fr = pip2square(orig);
                let to = pip2square(dest);
                anim(state => userMove(state, fr, to), state);
            },
            newPiece(piece, key) {
                anim(state => baseNewPiece(state, piece, key), state);
            },
            cancelMove() {
                render$1(state => {
                    cancelMove(state);
                    cancel(state);
                }, state);
            },
            stop() {
                render$1(state => {
                    stop(state);
                    cancel(state);
                }, state);
            },
            getKeyAtDomPos(pos) {
                return getKeyAtDomPos(pos, whitePov(state), state.dom.bounds());
            },
            redrawAll,
            dragNewPiece(piece, event, force) {
                dragNewPiece(state, piece, event, force);
            },
            destroy() {
                stop(state);
                state.dom.unbind && state.dom.unbind();
                state.dom.destroyed = true;
            },
        };
    }

    function defaults() {
        return {
            pieces: read(initial),
            checkerCounts: readCounts(initial),
            orientation: 'white',
            turnColor: 'white',
            viewOnly: false,
            disableContextMenu: false,
            addPieceZIndex: false,
            addDimensionsCssVars: false,
            blockTouchScroll: false,
            pieceKey: false,
            highlight: {
                lastMove: true,
            },
            animation: {
                enabled: true,
                duration: 200,
            },
            movable: {
                free: true,
                color: 'both',
                showDests: true,
                events: {},
            },
            draggable: {
                enabled: true,
                distance: 3,
                autoDistance: true,
                showGhost: true,
                deleteOnDropOff: false,
            },
            dropmode: {
                active: false,
            },
            selectable: {
                enabled: true,
            },
            stats: {
                // on touchscreen, default to "tap-tap" moves
                // instead of drag
                dragged: !('ontouchstart' in window),
            },
            events: {},
            hold: timer(),
        };
    }

    //import { createElement as createSVG, setAttributes } from './svg.js';
    function createElement$1(tagName) {
        return document.createElementNS('http://www.w3.org/2000/svg', tagName);
    }
    function setAttributes$1(el, attrs) {
        for (const key in attrs)
            el.setAttribute(key, attrs[key]);
        return el;
    }
    function pos2user$1(pos, bounds) {
        const xScale = Math.min(1, bounds.width / bounds.height);
        const yScale = Math.min(1, bounds.height / bounds.width);
        return [(pos[0] - 3.5) * xScale, (3.5 - pos[1]) * yScale];
    }
    function renderSvg$1(pos, customSvg, bounds) {
        //function renderSvg(customSvg: string, pos: cg.Pos, bounds: ClientRect): SVGElement {
        const [x, y] = pos2user$1(pos, bounds);
        // Translate to top-left of `orig` square
        const g = setAttributes$1(createElement$1('g'), { transform: `translate(${x},${y})` });
        // Give 100x100 coordinate system to the user for `orig` square
        const svg = setAttributes$1(createElement$1('svg'), { width: 1, height: 1, viewBox: '0 0 100 100' });
        g.appendChild(svg);
        svg.innerHTML = customSvg;
        return g;
    }
    function renderWrap(element, s) {
        // .cg-wrap (element passed to Chessground)
        //   cg-container
        //     cg-board
        //     svg.cg-shapes
        //       defs
        //       g
        //     svg.cg-custom-svgs
        //       g
        //     cg-auto-pieces
        //     coords.ranks
        //     coords.files
        //     piece.ghost
        element.innerHTML = '';
        // ensure the cg-wrap class is set
        // so bounds calculation can use the CSS width/height values
        // add that class yourself to the element before calling chessground
        // for a slight performance improvement! (avoids recomputing style)
        element.classList.add('cg-wrap');
        for (const c of colors)
            element.classList.toggle('orientation-' + c, s.orientation === c);
        element.classList.toggle('manipulable', !s.viewOnly);
        const container = createEl('cg-container');
        element.appendChild(container);
        const board = createEl('cg-board');
        container.appendChild(board);
        let customSvg;
        customSvg = setAttributes$1(createElement$1('svg'), {
            class: 'cg-custom-svgs',
            viewBox: '-3.5 -3.5 13 13',
            preserveAspectRatio: 'xMidYMid slice',
        });
        //s.checkerCounts?.push(0);
        customSvg.appendChild(createElement$1('g'));
        //s.checkerCounts = new Array(0);
        container.appendChild(customSvg);
        for (var i = 0; i < 26; i++) {
            //customSvg.appendChild(renderSvg([i>12?12-(i%13):i%13,i>12?2:0], makeCheckerCount(i), board.getBoundingClientRect()));
            customSvg.appendChild(renderSvg$1([i > 12 ? 12 - (i % 13) : i % 13, i > 12 ? 2 : 0], '', board.getBoundingClientRect()));
        }
        customSvg.appendChild(renderSvg$1([0, -6], '', board.getBoundingClientRect()));
        customSvg.appendChild(renderSvg$1([0, 8], '', board.getBoundingClientRect()));
        customSvg.appendChild(renderSvg$1([6, 1], '64', board.getBoundingClientRect()));
        let ghost;
        if (s.draggable.showGhost) {
            ghost = createEl('piece', 'ghost');
            setVisible(ghost, false);
            container.appendChild(ghost);
        }
        return {
            board,
            container,
            wrap: element,
            ghost,
            customSvg
        };
    }
    //  function makeCheckerCount(count: number): string {
    //   return '<style> .heavy { font:  50px arial; fill: red; } </style> <text x="45" y="60" class="heavy">' + count + '</text>';
    // }

    function drop(s, e) {
        //console.log("drop");
        if (!s.dropmode.active)
            return;
        const piece = s.dropmode.piece;
        if (piece) {
            s.pieces.set('a0', piece);
            const position = eventPosition(e);
            const dest = position && getKeyAtDomPos(position, whitePov(s), s.dom.bounds());
            if (dest)
                dropNewPiece(s, 'a0', dest);
        }
        //console.log("drop");
        s.dom.redraw();
    }

    function bindBoard(s, onResize) {
        const boardEl = s.dom.elements.board;
        if ('ResizeObserver' in window)
            new ResizeObserver(onResize).observe(s.dom.elements.wrap);
        if (s.viewOnly)
            return;
        // Cannot be passive, because we prevent touch scrolling and dragging of
        // selected elements.
        const onStart = startDragOrDraw(s);
        boardEl.addEventListener('touchstart', onStart, {
            passive: false,
        });
        boardEl.addEventListener('mousedown', onStart, {
            passive: false,
        });
        if (s.disableContextMenu) {
            boardEl.addEventListener('contextmenu', e => e.preventDefault());
        }
    }
    // returns the unbind function
    function bindDocument(s, onResize) {
        const unbinds = [];
        // Old versions of Edge and Safari do not support ResizeObserver. Send
        // chessground.resize if a user action has changed the bounds of the board.
        if (!('ResizeObserver' in window))
            unbinds.push(unbindable(document.body, 'chessground.resize', onResize));
        if (!s.viewOnly) {
            const onmove = dragOrDraw(s, move);
            const onend = dragOrDraw(s, end);
            for (const ev of ['touchmove', 'mousemove'])
                unbinds.push(unbindable(document, ev, onmove));
            for (const ev of ['touchend', 'mouseup'])
                unbinds.push(unbindable(document, ev, onend));
            const onScroll = () => s.dom.bounds.clear();
            unbinds.push(unbindable(document, 'scroll', onScroll, { capture: true, passive: true }));
            unbinds.push(unbindable(window, 'resize', onScroll, { passive: true }));
        }
        return () => unbinds.forEach(f => f());
    }
    function unbindable(el, eventName, callback, options) {
        el.addEventListener(eventName, callback, options);
        return () => el.removeEventListener(eventName, callback, options);
    }
    function startDragOrDraw(s) {
        return e => {
            if (!s.viewOnly) {
                if (s.dropmode.active)
                    drop(s, e);
                else
                    start$1(s, e);
            }
        };
    }
    function dragOrDraw(s, withDrag) {
        return e => {
            if (!s.viewOnly)
                withDrag(s, e);
        };
    }

    // ported from https://github.com/veloce/lichobile/blob/master/src/js/chessground/view.js
    // in case of bugs, blame @veloce
    function render(s) {
        const asWhite = whitePov(s), posToTranslate$1 = posToTranslate(s.dom.bounds()), boardEl = s.dom.elements.board, pieces = s.pieces, curAnim = s.animation.current, anims = curAnim ? curAnim.plan.anims : new Map(), fadings = curAnim ? curAnim.plan.fadings : new Map(), curDrag = s.draggable.current, squares = computeSquareClasses(s), samePieces = new Set(), sameSquares = new Set(), movedPieces = new Map(), movedSquares = new Map(); // by class name
        let k, el, pieceAtKey, elPieceName, anim, fading, pMvdset, pMvd, sMvdset, sMvd;
        // walk over all board dom elements, apply animations and flag moved pieces
        el = boardEl.firstChild;
        while (el) {
            k = el.cgKey;
            if (isPieceNode(el)) {
                pieceAtKey = pieces.get(k);
                anim = anims.get(k);
                //console.log("anim",anim);
                fading = fadings.get(k);
                elPieceName = el.cgPiece;
                // if piece not being dragged anymore, remove dragging style
                if (el.cgDragging && (!curDrag || curDrag.orig !== k)) {
                    el.classList.remove('dragging');
                    translate(el, posToTranslate$1(key2pos(k), asWhite));
                    el.cgDragging = false;
                }
                // remove fading class if it still remains
                if (!fading && el.cgFading) {
                    el.cgFading = false;
                    el.classList.remove('fading');
                }
                // there is now a piece at this dom key
                if (pieceAtKey) {
                    // continue animation if already animating and same piece
                    // (otherwise it could animate a captured piece)
                    if (anim && el.cgAnimating && elPieceName === pieceNameOf(pieceAtKey)) {
                        const pos = key2pos(k);
                        pos[0] += anim[2];
                        pos[1] += anim[3];
                        el.classList.add('anim');
                        translate(el, posToTranslate$1(pos, asWhite));
                    }
                    else if (el.cgAnimating) {
                        el.cgAnimating = false;
                        el.classList.remove('anim');
                        translate(el, posToTranslate$1(key2pos(k), asWhite));
                        if (s.addPieceZIndex)
                            el.style.zIndex = posZIndex(key2pos(k), asWhite);
                    }
                    // same piece: flag as same
                    if (elPieceName === pieceNameOf(pieceAtKey) && (!fading || !el.cgFading)) {
                        samePieces.add(k);
                    }
                    // different piece: flag as moved unless it is a fading piece
                    else {
                        if (fading && elPieceName === pieceNameOf(fading)) {
                            el.classList.add('fading');
                            el.cgFading = true;
                        }
                        else {
                            appendValue(movedPieces, elPieceName, el);
                        }
                    }
                }
                // no piece: flag as moved
                else {
                    appendValue(movedPieces, elPieceName, el);
                }
            }
            else if (isSquareNode(el)) {
                const cn = el.className;
                if (squares.get(k) === cn)
                    sameSquares.add(k);
                else
                    appendValue(movedSquares, cn, el);
            }
            el = el.nextSibling;
        }
        // walk over all squares in current set, apply dom changes to moved squares
        // or append new squares
        for (const [sk, className] of squares) {
            if (!sameSquares.has(sk)) {
                sMvdset = movedSquares.get(className);
                sMvd = sMvdset && sMvdset.pop();
                const translation = posToTranslate$1(key2pos(sk), asWhite);
                if (sMvd) {
                    sMvd.cgKey = sk;
                    translate(sMvd, translation);
                }
                else {
                    const squareNode = createEl('square', className);
                    squareNode.cgKey = sk;
                    translate(squareNode, translation);
                    boardEl.insertBefore(squareNode, boardEl.firstChild);
                }
            }
        }
        // walk over all pieces in current set, apply dom changes to moved pieces
        // or append new pieces
        for (const [k, p] of pieces) {
            anim = anims.get(k);
            if (!samePieces.has(k)) {
                //console.log(key2pos(k));
                pMvdset = movedPieces.get(pieceNameOf(p));
                pMvd = pMvdset && pMvdset.pop();
                // a same piece was moved
                if (pMvd) {
                    // apply dom changes
                    pMvd.cgKey = k;
                    if (pMvd.cgFading) {
                        pMvd.classList.remove('fading');
                        pMvd.cgFading = false;
                    }
                    const pos = key2pos(k);
                    if (s.addPieceZIndex)
                        pMvd.style.zIndex = posZIndex(pos, asWhite);
                    if (anim) {
                        pMvd.cgAnimating = true;
                        pMvd.classList.add('anim');
                        pos[0] += anim[2];
                        pos[1] += anim[3];
                    }
                    translate(pMvd, posToTranslate$1(pos, asWhite));
                }
                // no piece in moved obj: insert the new piece
                // assumes the new piece is not being dragged
                else {
                    const pieceName = pieceNameOf(p), pieceNode = createEl('piece', pieceName), pos = key2pos(k);
                    pieceNode.cgPiece = pieceName;
                    pieceNode.cgKey = k;
                    if (anim) {
                        pieceNode.cgAnimating = true;
                        pos[0] += anim[2];
                        pos[1] += anim[3];
                    }
                    translate(pieceNode, posToTranslate$1(pos, asWhite));
                    if (s.addPieceZIndex)
                        pieceNode.style.zIndex = posZIndex(pos, asWhite);
                    boardEl.appendChild(pieceNode);
                }
            }
        }
        // remove any element that remains in the moved sets
        for (const nodes of movedPieces.values())
            removeNodes(s, nodes);
        for (const nodes of movedSquares.values())
            removeNodes(s, nodes);
    }
    function renderResized(s) {
        const asWhite = whitePov(s), posToTranslate$1 = posToTranslate(s.dom.bounds());
        let el = s.dom.elements.board.firstChild;
        while (el) {
            if ((isPieceNode(el) && !el.cgAnimating) || isSquareNode(el)) {
                translate(el, posToTranslate$1(key2pos(el.cgKey), asWhite));
            }
            el = el.nextSibling;
        }
    }
    function updateBounds(s) {
        const bounds = s.dom.elements.wrap.getBoundingClientRect();
        const container = s.dom.elements.container;
        const ratio = bounds.height / bounds.width;
        const width = (Math.floor((bounds.width * window.devicePixelRatio) / x) * x) / window.devicePixelRatio;
        const height = width * ratio;
        container.style.width = width + 'px';
        container.style.height = height + 'px';
        s.dom.bounds.clear();
        if (s.addDimensionsCssVars) {
            document.documentElement.style.setProperty('--cg-width', width + 'px');
            document.documentElement.style.setProperty('--cg-height', height + 'px');
        }
    }
    function isPieceNode(el) {
        return el.tagName === 'PIECE';
    }
    function isSquareNode(el) {
        return el.tagName === 'SQUARE';
    }
    function removeNodes(s, nodes) {
        for (const node of nodes)
            s.dom.elements.board.removeChild(node);
    }
    function posZIndex(pos, asWhite) {
        const minZ = 3;
        const rank = pos[1];
        const z = asWhite ? minZ + 7 - rank : minZ + rank;
        return `${z}`;
    }
    function pieceNameOf(piece) {
        return `${piece.color} ${piece.role}`;
    }
    function computeSquareClasses(s) {
        var _a;
        const squares = new Map();
        if (s.lastMove && s.highlight.lastMove)
            for (const k of s.lastMove) {
                addSquare(squares, k, 'last-move');
            }
        if (s.selected) {
            addSquare(squares, s.selected, 'selected');
            if (s.movable.showDests) {
                const dests = (_a = s.movable.dests) === null || _a === void 0 ? void 0 : _a.get(s.selected);
                if (dests)
                    for (const k of dests) {
                        addSquare(squares, k, 'move-dest' + (s.pieces.has(k) ? ' oc' : ''));
                    }
            }
        }
        return squares;
    }
    function addSquare(squares, key, klass) {
        const classes = squares.get(key);
        if (classes)
            squares.set(key, `${classes} ${klass}`);
        else
            squares.set(key, klass);
    }
    function appendValue(map, key, value) {
        const arr = map.get(key);
        if (arr)
            arr.push(value);
        else
            map.set(key, [value]);
    }

    function Gammonground(element, config) {
        const maybeState = defaults();
        configure(maybeState, config || {});
        function redrawAll() {
            const prevUnbind = 'dom' in maybeState ? maybeState.dom.unbind : undefined;
            // compute bounds from existing board element if possible
            // this allows non-square boards from CSS to be handled (for 3D)
            const elements = renderWrap(element, maybeState), bounds = memo(() => elements.board.getBoundingClientRect()), redrawNow = () => {
                render(state);
                renderCheckerCount(state, elements.customSvg);
            }, onResize = () => {
                updateBounds(state);
                renderResized(state);
            };
            const state = maybeState;
            state.dom = {
                elements,
                bounds,
                redraw: debounceRedraw(redrawNow),
                redrawNow,
                unbind: prevUnbind,
            };
            updateBounds(state);
            redrawNow();
            bindBoard(state, onResize);
            if (!prevUnbind)
                state.dom.unbind = bindDocument(state, onResize);
            state.events.insert && state.events.insert(elements);
            return state;
        }
        return start(redrawAll(), redrawAll);
    }
    function debounceRedraw(redrawNow) {
        let redrawing = false;
        return () => {
            if (redrawing)
                return;
            redrawing = true;
            requestAnimationFrame(() => {
                redrawNow();
                redrawing = false;
            });
        };
    }
    function createElement(tagName) {
        return document.createElementNS('http://www.w3.org/2000/svg', tagName);
    }
    function setAttributes(el, attrs) {
        for (const key in attrs)
            el.setAttribute(key, attrs[key]);
        return el;
    }
    function pos2user(pos, bounds) {
        const xScale = Math.min(1, bounds.width / bounds.height);
        const yScale = Math.min(1, bounds.height / bounds.width);
        return [(pos[0] - 3.5) * xScale, (3.5 - pos[1]) * yScale];
    }
    function renderSvg(pos, customSvg, bounds) {
        //function renderSvg(customSvg: string, pos: cg.Pos, bounds: ClientRect): SVGElement {
        const [x, y] = pos2user(pos, bounds);
        // Translate to top-left of `orig` square
        const g = setAttributes(createElement('g'), { transform: `translate(${x},${y})` });
        // Give 100x100 coordinate system to the user for `orig` square
        const svg = setAttributes(createElement('svg'), { width: 1, height: 1, viewBox: '0 0 100 100' });
        g.appendChild(svg);
        svg.innerHTML = customSvg;
        return g;
    }
    function renderCheckerCount(state, customSvg) {
        //console.log(customSvgsEl.viewportElement?.children[1], bounds);
        if (state.checkerCounts) {
            for (var i = 0; i < 26; i++) {
                if (Math.abs(state.checkerCounts[i]) > 6 ||
                    (Math.abs(state.checkerCounts[i]) > 1 && (i == 6 || i == 19))) {
                    customSvg.replaceChild(renderSvg([i > 12 ? 12 - (i % 13) : i % 13, i > 12 ? 2 : 0], makeCheckerCount(state.checkerCounts[i]), state.dom.bounds()), customSvg.children[i + 1]);
                    //customSvg.replaceChild(renderSvg([i,0], makeCheckerCount(state.checkerCounts[i]), state.dom.bounds()), customSvg.children[i] );
                    //customSvg.children[i].innerHTML = makeCheckerCount(state.checkerCounts[i]);
                }
                else {
                    customSvg.children[i + 1].innerHTML = '';
                }
            }
            // off checkers
            if (Math.abs(state.checkerCounts[26]) > 1) {
                customSvg.replaceChild(renderSvg([0, -6], makeCheckerCount(state.checkerCounts[26]), state.dom.bounds()), customSvg.children[27]);
            }
            else {
                customSvg.children[27].innerHTML = '';
            }
            if (Math.abs(state.checkerCounts[27]) > 1) {
                customSvg.replaceChild(renderSvg([0, 8], makeCheckerCount(state.checkerCounts[27]), state.dom.bounds()), customSvg.children[28]);
            }
            else {
                customSvg.children[28].innerHTML = '';
            }
            // cube
            if (state.checkerCounts[28] > 1) {
                // var pos = [6,1];
                //console.log(state.pieces.get('g7'));
                if (state.pieces.get('f7')) {
                    customSvg.replaceChild(renderSvg([5, 1], makeDoublingCube(state.checkerCounts[28]), state.dom.bounds()), customSvg.children[29]);
                }
                else if (state.pieces.get('h7')) {
                    customSvg.replaceChild(renderSvg([7, 1], makeDoublingCube(state.checkerCounts[28]), state.dom.bounds()), customSvg.children[29]);
                }
                else if (state.pieces.get('g=')) {
                    customSvg.replaceChild(renderSvg([6, 7], makeDoublingCube(state.checkerCounts[28]), state.dom.bounds()), customSvg.children[29]);
                }
                else if (state.pieces.get('g1')) {
                    customSvg.replaceChild(renderSvg([6, -5], makeDoublingCube(state.checkerCounts[28]), state.dom.bounds()), customSvg.children[29]);
                }
            }
            else {
                customSvg.children[29].innerHTML = '';
            }
        }
        //console.log(state.checkerCounts, customSvg);
    }
    function makeCheckerCount(count) {
        const c = (count < 0) ? 'black' : 'white';
        //console.log("numb", count, c);
        return '<style> .white { font:  50px arial; fill: white; }  .black { font:  50px arial; fill: black; } </style> <text x="50" y="58" class="' + c + '">' + Math.abs(count) + '</text>';
    }
    function makeDoublingCube(count) {
        //const c =  (count < 0) ? 'black' : 'white';
        //console.log("numb", count, c);
        return '<style> .white { font:  50px arial; fill: white; }  .black { font:  50px courier; fill: black; } </style> <text x="50" y="58" class="black">' + count + '</text>';
    }

    return Gammonground;

})();
export {Gammonground};
