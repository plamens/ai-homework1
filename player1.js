var readline = require('readline');

var fs = require('fs');//uncomment to enable logging
var _ = require('underscore');
var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const FREE = 0;
const OPONENT = 1;
const ME = 2;
const WALL = '';

var seq18 = [1,2,3,4,5,6,7,8];
var seq17 = [1,2,3,4,5,6,7];

function log(data) {
    fs.appendFileSync('log' + process.argv[2], data + "\n");//uncomment to enable logging
}
fs.openSync('log' + process.argv[2], 'a')
fs.truncateSync('log' + process.argv[2]);//uncomment to enable logging
log('game start-----------------------------------');


var timeOfMoveStart;
rl.on('line', function(line) {
    timeOfMoveStart = Math.round(new Date().getTime());
    var data = line.split(' ');
    var x = parseInt(data[0]);
    var y = parseInt(data[1]);
    var isVertical = parseInt(data[2]) === 1;
    log('oponent moved: ' + line);
    currentBoard = makeOponentMove(new Move(x, y, isVertical), currentBoard);
    printBoard();
    var move = getMove(currentBoard);
    currentBoard = makeMove(move, currentBoard);
    declareMove(move);
    log('current score: ME-' + getScore(ME, currentBoard) + ' OPONENT-' + getScore(OPONENT, currentBoard));
    log('heuristic: ME:' + heuristic(ME, OPONENT, currentBoard) + ' OPONENT:' + heuristic(OPONENT, ME, currentBoard));
    log('time to answer: ' + (Math.round(new Date().getTime()) - timeOfMoveStart));
});
rl.on('close', function() {
  log('goodbye!');
});

function getNonBlunderMoves(possibleMoves, playerColor, baseBoard) {
    return possibleMoves.filter(function(move) {
        return !isBlunder(move, playerColor, baseBoard);
    });
}

function getMovesToEvaluate(possibleMoves, playerColor, baseBoard) {
    var nonBlunderMoves = possibleMoves.filter(function(move) {
        return !isBlunder(move, playerColor, baseBoard);
    });
    var movesToEvaluate = nonBlunderMoves;
    if (nonBlunderMoves.length === 0) {
        movesToEvaluate = possibleMoves;
    }
    return movesToEvaluate;
}

function getMove(board) {
    possibleMoves = getPossibleMoves(board);
    log('possible moves left: ' + possibleMoves.length);
    var nonBlunderMoves = possibleMoves.filter(function(move) {
        return !isBlunder(move, ME, board);
    });
    log('without the blunders there are: ' + nonBlunderMoves.length);
    var movesToEvaluate = nonBlunderMoves;
    if (nonBlunderMoves.length === 0) {
        movesToEvaluate = possibleMoves;
    }
    var depth = 0;
    var timeOfMoveStart = Math.round(new Date().getTime());
    var timeNow = timeOfMoveStart;
    var bestMoveWithHeuristic;
    var timeStart;
    var timeEnd;
    while (true) {//depth < 10 maybe?
        try {
            timeStart = Math.round(new Date().getTime());
            bestMoveWithHeuristic = getBestMoveWithHeuristic(movesToEvaluate, board, depth);
            log('best move heuristic: ' + bestMoveWithHeuristic.heuristic);
            if (bestMoveWithHeuristic.heuristic === Number.POSITIVE_INFINITY) {
                log('winning heuristic, no need to go deeper');
                break;
            }
            timeEnd = Math.round(new Date().getTime());
            log('took ' + (timeEnd - timeStart) + ' at depth ' + depth);
            log('best move: ' + bestMoveWithHeuristic.move.x + ' ' + bestMoveWithHeuristic.move.y + ' ' + (bestMoveWithHeuristic.move.isVertical? 1: 0));
            timeNow = timeEnd;
            depth++;
        } catch(e) {//OutOfTimeException
            log(e);
            break;
        }
    }
    return bestMoveWithHeuristic.move;
}

function getBestMoveWithHeuristic(movesToEvaluate, board, depth) {
    var movesWithHeuristic = movesToEvaluate.map(function(move) {
        return {
            move: move,
            // naming this 'heuristic' wasn't the best idea. Should be something more like 'alphaBetaEvaluation'
            heuristic: alphabeta(makeMove(move, board), depth, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, false)
        };
    });
    var bestMoveWithHeuristic = _.max(movesWithHeuristic, function(moveWithHeuristic) {
        return moveWithHeuristic.heuristic;
    });
    return bestMoveWithHeuristic;
}

function alphabeta(baseBoard, depth, alpha, beta, maximizingPlayer) {
    // HTTP calls to the server are slow and are counted on my time.
    // 9000ms time to respond was too-much. Reduce if needed.
    if ((Math.round(new Date().getTime()) - timeOfMoveStart) > 8500) {
        throw 'OutOfTimeException';
    }
    var v;
    var i;
    var boardWithAppliedMove;
    var playerColor;
    var oponentColor;
    var possibleMoves = getPossibleMoves(baseBoard);
    var movesToEvaluate;
    if (maximizingPlayer) {
        playerColor = ME;
        oponentColor = OPONENT;
        if (possibleMoves.length === 0) {
            return (getScore(playerColor, baseBoard) > getScore(oponentColor, baseBoard)) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        if (depth === 0) {
            return heuristic(playerColor, oponentColor, baseBoard);
        }
        v = Number.NEGATIVE_INFINITY;
        movesToEvaluate = getMovesToEvaluate(possibleMoves, playerColor, baseBoard);
        for (i = 0; i < movesToEvaluate.length; i++) {
            boardWithAppliedMove = makeMove(movesToEvaluate[i], baseBoard);
            v = Math.max(v, alphabeta(boardWithAppliedMove, depth - 1, alpha, beta, false));
            alpha = Math.max(alpha, v);
            if (beta <= alpha) {
                break; //(* beta cut-off *)
            }
        }
        return v
    } else {
        playerColor = OPONENT;
        oponentColor = ME;
        if (possibleMoves.length === 0) {
            return (getScore(playerColor, baseBoard) < getScore(oponentColor, baseBoard)) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
        }
        if (depth === 0) {
            return heuristic(oponentColor, playerColor, baseBoard);
        }
        v = Number.POSITIVE_INFINITY;
        movesToEvaluate = getMovesToEvaluate(possibleMoves, playerColor, baseBoard);
        for (i = 0; i < movesToEvaluate.length; i++) {
            boardWithAppliedMove = makeOponentMove(movesToEvaluate[i], baseBoard);
            v = Math.min(v, alphabeta(boardWithAppliedMove, depth - 1, alpha, beta, true));
            beta = Math.min(beta, v);
            if (beta <= alpha) {
                break; //(* alpha cut-off *)
            }
        }
        return v
    }
}

function getPossibleMoves(board) {
    return possibleMoves.filter(function(move) {
        return isLegal(move, board);
    });
}

// This rules out some good moves, but it is a simple way to limit branching
function isBlunder(move, playerColor, baseBoard) {
    var adjacentSquares = getAdjacentSquares(move);
    return adjacentSquares.every(function(square) {
        var squareState = baseBoard[square.x][square.y];
        return squareState !== playerColor;
    });
}

// Using only the score as a heuristic is not a good idea,
// because scores are kept equal for the first two thirds of the game,
// which are very important, because you need to get a good position.
// Relying only on score, basically makes you blind until someone has to make a second island.
// Still, I thought it was a good idea to calculate the score for the end of the game.
function heuristic(playerColor, oponentColor, baseBoard) {
    var possibleMoves = getPossibleMoves(baseBoard);
    var possibleMovesHeuristic = getNonBlunderMoves(possibleMoves, playerColor, baseBoard).length - getNonBlunderMoves(possibleMoves, oponentColor, baseBoard).length;
    var scoreHeuristic = getScore(playerColor, baseBoard) - getScore(oponentColor, baseBoard);
    return possibleMovesHeuristic + scoreHeuristic*2;
}

function getIslandFreeAdjacentSquares(playerColor, board, x, y) {
    var queue = getNeighbours(new Square(x, y));
    var adjacent = 0;
    board[x][y] = WALL;
    while (queue.length > 0) {
        var square = queue.pop();
        if (board[square.x][square.y] === playerColor) {
            queue = queue.concat(getNeighbours(square));
            board[square.x][square.y] = WALL;
            continue;
        }
        if (board[square.x][square.y] === FREE) {
            board[square.x][square.y] = WALL;
            adjacent++;
        }
    }
    return adjacent;
}

function getScore(playerColor, baseBoard) {
    var board = cloneBoard(baseBoard);
    var score = 0;
    seq18.forEach(function(x) {
        seq18.forEach(function(y) {
            if (board[x][y] === playerColor) {
                var islandSize = getIslandSize(playerColor, board, x, y);
                // log('found an island for player ' + playerColor + ' of size: ' + islandSize);
                score += (islandSize*islandSize);
            }
        });
    });
    return score;
}

function getIslandSize(playerColor, board, x, y) {
    var queue = getNeighbours(new Square(x, y));
    // log('square ' + x + ' ' + y + ' has neighbours count: ' + queue.length);
    var size = 1;
    board[x][y] = WALL;
    while (queue.length > 0) {
        // log('going through a queue of: ' + queue.length);
        var square = queue.pop();
        if (board[square.x][square.y] === playerColor) {
            queue = queue.concat(getNeighbours(square));
            size++;
            board[square.x][square.y] = WALL;
        }
    }
    return size;
}

function isLegal(move, baseBoard) {
    var squares = getSquares(move);
    return squares.every(function(square) {
        return baseBoard[square.x][square.y] === FREE;
    });
}

function cloneBoard(board) {
    return board.map(function(row) {
        return row.map(_.identity);
    });
}

// for convenience, the board is padded with special blocks (WALL)
var boardTop = [WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL, WALL];
var currentBoard = [boardTop].concat(seq18.map(function() {
    return [WALL].concat(seq18.map(function() {
        return FREE;
    })).concat([WALL]);
})).concat([boardTop]);

function makeOponentMove(move, baseBoard) {
    var board = cloneBoard(baseBoard);
    getSquares(move).forEach(function(square) {
        board[square.x][square.y] = OPONENT;
    });
    return board;
}

function declareMove(move) {
    log('declaring a move: ' + move.x + ' ' + move.y + ' ' + (move.isVertical? 1: 0));
    process.stdout.write(move.x + ' ' + move.y + ' ' + (move.isVertical ? 1 : 0) + "\n");
}

function makeMove(move, baseBoard) {
    var board = cloneBoard(baseBoard);
    getSquares(move).forEach(function(square) {
        board[square.x][square.y] = ME;
    });
    return board;
}

function printBoard() {
    currentBoard.forEach(function(row) {
        log(row.join(' '));
    })
}

function Move(x, y, isVertical) {
    return {
        x: x,
        y: y,
        isVertical: isVertical
    };
}

function Square(x, y) {
    return {
        x: x,
        y: y
    };
}

var possibleMoves = [];
seq18.forEach(function(x) {
    seq17.forEach(function(y) {
        possibleMoves.push(new Move(x, y, false));
        possibleMoves.push(new Move(y, x, true));
    });
});

function getSquares(move) {
    var sq1 = new Square(move.x, move.y);
    var sq2x;
    var sq2y;
    if (move.isVertical) {
        sq2x = move.x + 1;
        sq2y = move.y;
    } else {
        sq2x = move.x;
        sq2y = move.y + 1;
    }
    return [sq1, new Square(sq2x, sq2y)];
}

function upOf(square) {
    return new Square(square.x - 1, square.y);
}

function downOf(square) {
    return new Square(square.x + 1, square.y);
}

function leftOf(square) {
    return new Square(square.x, square.y - 1);
}

function rightOf(square) {
    return new Square(square.x, square.y + 1);
}

function getNeighbours(square) {
    return [upOf, downOf, leftOf, rightOf].map(function(f) {
        return f(square);
    });
}

function getAdjacentSquares(move) {
    var moveSquares = getSquares(move);
    if (move.isVertical) {
        return [rightOf(moveSquares[0]), upOf(moveSquares[0]), leftOf(moveSquares[0]), 
                rightOf(moveSquares[1]), downOf(moveSquares[1]), leftOf(moveSquares[1])];
    } else {
        return [leftOf(moveSquares[0]), upOf(moveSquares[0]), downOf(moveSquares[0]), 
                rightOf(moveSquares[1]), downOf(moveSquares[1]), upOf(moveSquares[1])];
    }
}

// This was part of the heuristic, but I replaced it with the
// count of possible, non-blunder moves, because the player
// was leaving single squares near the end of the game.
//
// function freeAdjacentSquares(playerColor, baseBoard) {
//     var board = cloneBoard(baseBoard);
//     var adjacentSquaresCount = 0;
//     seq18.forEach(function(x) {
//         seq18.forEach(function(y) {
//             if (board[x][y] === playerColor) {
//                 var islandAdjacent = getIslandFreeAdjacentSquares(playerColor, board, x, y);
//                 adjacentSquaresCount += islandAdjacent;
//             }
//         });
//     });
//     return adjacentSquaresCount;
// }