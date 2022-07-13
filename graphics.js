import { Gammonground } from './gammonground.js';
const config = {};
var legalMoves = new Array([]);
var lastDice1;
var lastDice2;
var ground = Gammonground(document.getElementById('gammonground'), config);

ground.set({
    highlight: {
        lastMove: false,
    },
    draggable: {
        enabled: true,
        showGhost: true,
        deleteOnDropOff: true
    },
    turnColor: 'black',
    events: {
        select: tryRoll(ground) 
    },
    movable: {
        events: { after: printLegalMoves(ground) } ,
        color: 'black',
        dests:  new Map([]),
        showDests: true,
        free: false
    }
});

function getTotal(moves)  {
    var sum = lastDice1 == lastDice2 ? 4*lastDice1 : lastDice1+lastDice2;
    moves.forEach(m => {
        sum -= ( parseInt(m.split('/')[0]) - parseInt(m.split('/')[1]));
    });
    return (sum == 0);
}

function setLegalMoves(lastMove) {
    if (getTotal(ground.state.lastGammonMove)) {
        ground.state.selected = undefined;
        return;
    }

    legalMoves.every(el => {
        if (el.length > 0) {
            if (el.length == ground.state.lastGammonMove.length) {
            } else {
                var v = [...el];
                ground.state.lastGammonMove.forEach (el2 => {
                    const index = v.indexOf(el2);
                    if (index > -1) {
                        v.splice(index, 1);
                    } else {
                        v = [];
                    }
                });
                v.forEach(el3 => {
                    addGroundMove(ground, el3.substr(0, el3.indexOf("/")), el3.substr(el3.indexOf("/") + 1));
                });
            }     
        }
        return true;
    });
}

export function printLegalMoves(Api) {
    return (orig, dest, metadata) => {
        if (legalMoves) {
            const lastMove = Api.state.lastGammonMove;
            setLegalMoves(lastMove);
        }
    }
}

window.gnubgMove = function(str) {
    ground.set({  movable: {
        color: 'white'
    }
    });

    var m = str.split(' ');
    var cm = cleanMoves(m);
    var t = 500;
    cm.forEach(m => {
        var a1 = m.split('/')[0];
        var a2 = m.split('/')[1];
        setTimeout(() => {
            //console.log(a1, a2);
            ground.gammonMove(a1, a2);

        }, t);
        //console.log(m, t);
        t += 250;
    });
}

window.preRoll = function() {
    ground.set({  movable: {
     color: 'black'
    }
    });
    ground.state.turnColor = 'black';
    if (legalMoves.length != 0) {
        legalMoves = [];
    }
    ground.state.lastGammonMove = [];
}

window.afterRoll = function(rawHint) {
    ground.set({  movable: {
        color: 'black'
    }
    });
    setLegalMoves("");
    ground.state.lastGammonMove = [];
}

window.getRolls = function(rawHint) {
    var moves = rawHint.split('.')[1].split('   ')[1].trim().split(' ');
    var cm = cleanMoves(moves);
    legalMoves.push(cm);
    if (lastDice1 != lastDice2) {
        if (cm.length == 1 && (parseInt(cm[0].split('/')[0]) -  parseInt(cm[0].split('/')[1]) == (lastDice1 + lastDice2))) {
            let m0 = cm[0].split('/')[0];
            var m1 = parseInt(m0) - lastDice1;
            var m2 = parseInt(m0) - lastDice2;
            let m3 = cm[0].split('/')[1];
            let c1 = ground.state.checkerCounts[(m1-1)+((m1-1)/6>>0)-((m1-1)/12>>0)];
            let c2 = ground.state.checkerCounts[(m2-1)+((m2-1)/6>>0)-((m2-1)/12>>0)];
            if (c1 >= -1) {
                legalMoves.push([m0 + '/' + m1, '' + m1 + '/' + m3]);
            }
            if (c2 >= -1) {
                legalMoves.push([m0 + '/' + m2, '' + m2 + '/' + m3]);
            }
        }
    } else { // TODO sooo ugly, but it works. Still missing edge cases parsing gnubg commands:
            //  e.g "8/6*/4(2)" needs "8/6/4 8/4" in addition to "8/6/4 8/6/4"
        // gap of 4x
        if (cm.length == 1 && (parseInt(cm[0].split('/')[0]) -  parseInt(cm[0].split('/')[1]) == (4* + lastDice1))) {
            //add 7 things
            let m0 = cm[0].split('/')[0];
            var m1 = parseInt(m0) - lastDice1;
            var m2 = m1 - lastDice1;
            var m3 = m2 - lastDice1;
            let m4 = cm[0].split('/')[1];
            legalMoves.push([m0 + '/' + m1, '' + m1 + '/' + m4]);
            legalMoves.push([m0 + '/' + m1, '' + m1 + '/' + m2, '' + m2 + '/' + m4]);
            legalMoves.push([m0 + '/' + m1, '' + m1 + '/' + m2, '' + m2 + '/' + m3, '' + m3 + '/' + m4]);
            legalMoves.push([m0 + '/' + m1, '' + m1 + '/' + m3, '' + m3 + '/' + m4]);
            legalMoves.push([m0 + '/' + m2, '' + m2 + '/' + m3, '' + m3 + '/' + m4]);
            legalMoves.push([m0 + '/' + m2, '' + m2 + '/' + m4]);
            legalMoves.push([m0 + '/' + m3, '' + m3 + '/' + m4])

        } else {
             cm.forEach(m => {
                 const n0 = parseInt(m.split('/')[0]);
                 const n1 = parseInt(m.split('/')[1]);
                 if (Math.abs(n0-n1) == 3*lastDice1) {
                    const m0 = n0;
                    const m1 = m0 - lastDice1;
                    const m2 = m1 - lastDice1;
                    const m3 = m2 - lastDice1;
                    const index2 = cm.indexOf(m);
                    var other = [...cm];
                    other.splice(index2, 1);
                    let a = ['' + m0 + '/' + m1, '' + m1 + '/' + m2, '' + m2 + '/' + m3, ...other];
                    let b = ['' + m0 + '/' + m1, '' + m1 + '/' + m3, ...other];
                    let c = ['' + m0 + '/' + m2, '' + m2 + '/' + m3, ...other];
                    legalMoves.push(a, b, c);
                 } else if (Math.abs(n0-n1) == 2*lastDice1) {
                     const m0 = n0;
                     const m1 = m0 - lastDice1;
                     const m2 = m1 - lastDice1;
                     const index3 = cm.indexOf(m);
                     var other2 = [...cm];
                     other2.splice(index3, 1);
                     legalMoves.push(['' + m0 + '/' + m1, '' + m1 + '/' + m2, ...other2]);
                     if (cm.length == 2 && Math.abs(parseInt(cm[1-index3].split('/')[0]) - parseInt(cm[1-index3].split('/')[1])) == 2*lastDice1) {
                        const s0 = parseInt(cm[1-index3].split('/')[0]);
                        const s1 = s0 - lastDice1;
                        const s2 = s1 - lastDice1;
                        legalMoves.push(['' + m0 + '/' + m1, '' + m1 + '/' + m2, '' + s0 + '/' + s1, '' + s1 + '/' + s2]);
                     }

                 }

            });
        }
    }
}

function addGroundMove(g, p1, p2) {
    if (!g.state.movable.dests) {
         g.set({
          movable: {
               dests: new Map([]),
               showDests: true,
           }
       });
    }
    var m = g.state.movable.dests;
    const squares1 = pip2squares(p1);
    const squares2 = pip2squares(p2);
    if (g.state.movable.dests.get(squares1[0])?.includes(squares2[0])) {
        return;
    }
    squares1.forEach(el1 => {
        var k = m.get(el1);
        if (k) {
            squares2.forEach(el2 => {
                if (!k.includes(el2)) {
                    k.push(el2); 
                }   
            });
        } else {
            g.state.movable.dests.set(el1, squares2);
        }
    });
}

function square2pip(square) {
    const x = square[0].charCodeAt() - 'a'.charCodeAt();
    const y = square[1].charCodeAt() - '0'.charCodeAt();
    if (y >= 7) {
        return (24-x) + (x/7>>0);
    }
    return (x+1) - (x/7>>0);
}

function pip2squares(pip) {
    var r = new Array();
    if (parseInt(pip) > 24) {
        r.push("g6");
        r.push("g8");
    } else if (parseInt(pip) == 0) {
        r.push("a0", "b0", "c0", "d0", "e0", "f0");
    } else {
        if (parseInt(pip) <= 12) {
            let c = String.fromCharCode('a'.charCodeAt() + (parseInt(pip)-1) + (parseInt(pip)/7>>0));
            for (var i = 1; i <= 6; i++) {
                r.push(c + i);
            }
        } else {
            let c2 = String.fromCharCode('a'.charCodeAt() + (24-parseInt(pip)) +  (((25-parseInt(pip))/7)>>0) );
            for (var j = 8; j <= 13; j++) {
                r.push(c2 +  String.fromCharCode('0'.charCodeAt() + j));
            }
        }
    }
   return r;
}

export function tryRoll(Api) {
    return (orig, dest) => {
        if (orig == "c7" || orig == "d7" || orig == "j7" || orig == "k7") {
            if (Api.state.turnColor == 'white') {
                window.preRoll();
                gnubgCommand("roll");
                legalMoves.forEach(el => {
                    if (el.length > 0) {
                        el.forEach(el2 => {
                             addGroundMove(ground, el2.substr(0, el2.indexOf("/")), el2.substr(el2.indexOf("/") + 1));
                        })
                    }
                });
                //gnubgCommand("show dice");

            } else { 
                // already rolled, make move
                gnubgCommand("move " + ground.state.lastGammonMove.join(" "));
            }
        // undo
        } else if (orig == "m7") {
            ground.state.lastGammonMove = [];
            legalMoves.forEach(el => {
                if (el.length > 0) {
                    el.forEach(el2 => {
                         addGroundMove(ground, el2.substr(0, el2.indexOf("/")), el2.substr(el2.indexOf("/") + 1));
                    })
                }
            });
            // sync gnubg state with gammonground state
            gnubgCommand("show board");
        } else {

            // TODO selection off piece but on pip is only semi working
            if (isPip(orig) && !ground.state.pieces.has(orig)) {
                let p2 = square2pip(orig) -1;
                let c1 = ground.state.checkerCounts[p2+(p2/6>>0)-(p2/12>>0)];
                if (c1 > 0 && c1 < 6) {
                    var sq;
                    if (p2 > 11) {
                        sq = orig.charAt(0) + String.fromCharCode( '>'.charCodeAt() - (c1));
                    } else {
                        sq = orig.charAt(0) + String.fromCharCode( '0'.charCodeAt() + c1);
                    }
                    if (ground.state.selected != undefined) {
                        //ground.state.selected = undefined;
                    } else {
                        ground.selectSquare(sq);
                    }
                }
            }
        }

    }
}

function cleanMoves(a) {
    let b = new Array();
    a.forEach(el => {
        var repeat = 1;
        if (el.includes('(')) {
            repeat = parseInt(el.charAt(el.indexOf('(')+1));
        }
        var c = el.split('(')[0].replaceAll('off','0').replaceAll('bar','25').replaceAll('*','').split('/');
        for (var j = 0; j < repeat; j++) {
            b.push(c[0] + '/' + c[1]);
            if (c.length > 2) {
                for (var i = 1; i+2 <= c.length; i++) {
                     b.push(c[i] + '/' + c[i+1]);
                }
            }
        }
    });
    return b;
}

function isPip(val) {
    return (val[0] != 'g' && val[1] != '7');
}

function countPieces (val) {
    var pstart = 0;
    var pend = 0;
    if (parseInt(val[1]) > 7) {
        pstart = 7;
        pend = 13;
    }
}

 window.drawBoard = function(backgroundOnly,
                   board,
                   boardString,
        		   matchLength,
        		   myScore,
        		   opponentScore,
        		   turn,
        		   dice1,
        		   dice2,
        		   cubeValue,
        		   iMayDouble,
        		   opponentMayDouble,
        		   wasDoubled,
        		   crawford,
                   resignationOffered,
        		   resignationValue) {
    if (backgroundOnly) {
        ground.set({fen: "board:somebody:gnubg:1:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:0:1:3:1:1:1:1:0:1:-1:0:25:0:0:0:0:0:0:0:0"});
        return;
    }

    if (dice1 > 0) {
        lastDice1 = dice1;
        lastDice2 = dice2;
    }

    if (dice1 <= 0) {
        ground.state.turnColor = 'white';
        ground.newPiece({role:'d'+lastDice1, color:'white'}, 'c7');
        ground.newPiece({role:'d'+lastDice2, color:'white'}, 'd7');
        ground.newPiece({role:'undo', color:'black'}, 'd7');
   } else {
       ground.set({fen: boardString});
   }

    if (!crawford) {
        if (wasDoubled) {
            ground.state.checkerCounts[28] = ground.state.checkerCounts[28]*2;
    	    if (wasDoubled > 0) {
                if (cubeValue > 1) {
                    ground.move('g1', 'f7');
                } else {
                    ground.newPiece({role:'double', color:'black'},'f7');
                }
    	    } else {
                if (cubeValue > 1) {
                    ground.move('g=', 'h7');
                } else {
                    ground.newPiece({role:'double', color:'black'},'h7');;
                }
    	    }
    	}
    }

    if (resignationOffered) {
    	if (turn == 1) {
            ground.newPiece({role:'resign' + resignationValue, color:'black'}, 'e7');
    	} else {
            ground.newPiece({role:'resign' + resignationValue, color:'black'}, 'i7');
    	}
    }

    var info = document.getElementById("info");
    info.innerHTML = "Score: " + myScore + "-" + opponentScore + (matchLength > 0 ? " Match to: " + matchLength : "") + (crawford ? " Crawford" : "");
    var instructions = document.getElementById("instructions");
    if (turn == 0) {
	   instructions.innerHTML = "";
    } else {
    	if (dice1 > 0) {
    	    instructions.innerHTML = "Move your checkers";
    	    document.getElementById("roll").disabled = true;
    	    document.getElementById("double").disabled = true;
    	    document.getElementById("accept").disabled = true;
    	    document.getElementById("reject").disabled = true;
    	    document.getElementById("beaver").disabled = true;
    	    document.getElementById("resign").disabled = false;
    	} else if (wasDoubled) {
    	    instructions.innerHTML = "Accept or reject the double";
    	    document.getElementById("roll").disabled = true;
    	    document.getElementById("double").disabled = true;
    	    document.getElementById("accept").disabled = false;
    	    document.getElementById("reject").disabled = false;
    	    document.getElementById("beaver").disabled = (matchLength > 0);
    	    document.getElementById("resign").disabled = true;
            } else if (resignationOffered) {
    	    instructions.innerHTML = "Accept or reject the resignation";
    	    document.getElementById("roll").disabled = true;
    	    document.getElementById("double").disabled = true;
    	    document.getElementById("accept").disabled = false;
    	    document.getElementById("reject").disabled = false;
    	    document.getElementById("beaver").disabled = true;
    	    document.getElementById("resign").disabled = true;
    	} else {
    	    instructions.innerHTML = "Roll or double";
    	    document.getElementById("roll").disabled = false;
    	    document.getElementById("double").disabled = crawford ? true : false;
    	    document.getElementById("accept").disabled = true;
    	    document.getElementById("reject").disabled = true;
    	    document.getElementById("beaver").disabled = true;
    	    document.getElementById("resign").disabled = false;
    	}
    }
}
