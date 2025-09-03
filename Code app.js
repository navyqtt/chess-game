import React, { useState } from "react";
import "./styles.css";

// --- Utilities ---
const FILES = "abcdefgh";
function sq(file, rank) {
  return rank * 8 + file;
}
function sqFile(i) {
  return i % 8;
}
function sqRank(i) {
  return Math.floor(i / 8);
}
function inBounds(f, r) {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function fenToPosition(fen) {
  const [placement, turn] = fen.split(" ");
  let board = Array(64).fill(null);
  let rank = 7,
    file = 0;
  for (let ch of placement) {
    if (ch === "/") {
      rank--;
      file = 0;
    } else if (!isNaN(ch)) {
      file += parseInt(ch);
    } else {
      const color = ch === ch.toUpperCase() ? "w" : "b";
      const type = ch.toLowerCase();
      board[sq(file, rank)] = { c: color, t: type, moved: false };
      file++;
    }
  }
  return { board, turn };
}

function pieceSymbol(piece) {
  const symbols = { p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚" };
  return piece.c === "w" ? symbols[piece.t].toUpperCase() : symbols[piece.t];
}

// --- Chess App ---
export default function ChessApp() {
  const [pos, setPos] = useState(() => fenToPosition(START_FEN));
  const [sel, setSel] = useState(null);
  const [legal, setLegal] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [capturedWhite, setCapturedWhite] = useState([]);
  const [capturedBlack, setCapturedBlack] = useState([]);
  const [winner, setWinner] = useState(null);
  const [check, setCheck] = useState(false);

  // --- Check if king is in check ---
  function isKingInCheck(board, color) {
    let kingPos = board.findIndex((p) => p?.c === color && p.t === "k");
    if (kingPos === -1) return false;
    for (let i = 0; i < 64; i++) {
      if (board[i] && board[i].c !== color) {
        const moves = generateLegalMoves(i, { board }, false);
        if (moves.includes(kingPos)) return true;
      }
    }
    return false;
  }

  // --- Generate legal moves ---
  function generateLegalMoves(i, position = pos, filterCheck = true) {
    const piece = position.board[i];
    if (!piece) return [];
    let moves = [];
    const color = piece.c;
    const enemy = color === "w" ? "b" : "w";
    const dirs = {
      r: [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ],
      b: [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ],
      q: [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ],
      n: [
        [1, 2],
        [2, 1],
        [-1, 2],
        [-2, 1],
        [1, -2],
        [2, -1],
        [-1, -2],
        [-2, -1],
      ],
      k: [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ],
    };

    if (piece.t === "p") {
      let dir = piece.c === "w" ? 1 : -1;
      let r = sqRank(i),
        f = sqFile(i);
      let fwd = sq(f, r + dir);
      if (inBounds(f, r + dir) && !position.board[fwd]) {
        moves.push(fwd);
        if (!piece.moved) {
          let dbl = sq(f, r + 2 * dir);
          if (!position.board[dbl]) moves.push(dbl);
        }
      }
      for (let df of [-1, 1]) {
        let nf = f + df,
          nr = r + dir;
        if (inBounds(nf, nr)) {
          let cap = sq(nf, nr);
          if (position.board[cap] && position.board[cap].c === enemy)
            moves.push(cap);
        }
      }
    }

    if (dirs[piece.t]) {
      for (let [df, dr] of dirs[piece.t]) {
        let f = sqFile(i),
          r = sqRank(i);
        while (true) {
          f += df;
          r += dr;
          if (!inBounds(f, r)) break;
          let j = sq(f, r);
          if (!position.board[j]) moves.push(j);
          else {
            if (position.board[j].c !== color) moves.push(j);
            break;
          }
          if (piece.t === "n" || piece.t === "k") break;
        }
      }
    }

    if (filterCheck) {
      const filtered = [];
      for (let to of moves) {
        const temp = JSON.parse(JSON.stringify(position));
        temp.board[to] = { ...piece, moved: true };
        temp.board[i] = null;
        if (!isKingInCheck(temp.board, color)) filtered.push(to);
      }
      moves = filtered;
    }

    return moves;
  }

  // --- Make a move ---
  function makeMove(from, to) {
    if (winner) return;
    const next = JSON.parse(JSON.stringify(pos));
    const piece = next.board[from];
    const target = next.board[to];

    if (target) {
      if (target.c === "w") setCapturedWhite((c) => [...c, target]);
      else setCapturedBlack((c) => [...c, target]);
      if (target.t === "k") {
        setWinner(piece.c === "w" ? "White" : "Black");
        return;
      }
    }

    next.board[to] = { ...piece, moved: true };
    next.board[from] = null;
    next.turn = pos.turn === "w" ? "b" : "w";

    setPos(next);
    setSel(null);
    setLegal([]);
    setLastMove({ from, to });

    const kingInCheck = isKingInCheck(next.board, next.turn);
    setCheck(kingInCheck);

    // Checkmate detection
    let hasLegal = false;
    for (let i = 0; i < 64; i++) {
      if (next.board[i]?.c === next.turn) {
        if (generateLegalMoves(i, next).length > 0) {
          hasLegal = true;
          break;
        }
      }
    }
    if (kingInCheck && !hasLegal)
      setWinner(pos.turn === "w" ? "White" : "Black");
  }

  // --- Handle clicks ---
  function handleSquareClick(i) {
    if (winner) return;
    if (sel === i) {
      setSel(null);
      setLegal([]);
    } else if (sel != null && legal.includes(i)) makeMove(sel, i);
    else {
      const piece = pos.board[i];
      if (piece && piece.c === pos.turn) {
        setSel(i);
        setLegal(generateLegalMoves(i));
      }
    }
  }

  // --- Restart game ---
  function restartGame() {
    setPos(fenToPosition(START_FEN));
    setSel(null);
    setLegal([]);
    setLastMove(null);
    setCapturedWhite([]);
    setCapturedBlack([]);
    setWinner(null);
    setCheck(false);
  }

  // --- Render ---
  return (
    <div className="game-container">
      <div className="captured">
        {capturedBlack.map((p, idx) => (
          <span key={idx}>{pieceSymbol(p)}</span>
        ))}
      </div>

      <div>
        <div className="board">
          {Array.from({ length: 64 }, (_, i) => {
            const piece = pos.board[i];
            const isDark = (sqFile(i) + sqRank(i)) % 2 === 1;
            const isSel = sel === i;
            const isLegal = legal.includes(i);
            const isLast =
              lastMove && (lastMove.from === i || lastMove.to === i);
            const isKingChecked =
              check && piece?.t === "k" && piece.c === pos.turn;
            return (
              <div
                key={i}
                className={`square ${isDark ? "dark" : "light"} ${
                  isSel ? "selected" : ""
                } ${isLegal ? "legal" : ""} ${isLast ? "last" : ""} ${
                  isKingChecked ? "last" : ""
                }`}
                onClick={() => handleSquareClick(i)}
              >
                {piece && <div className="piece">{pieceSymbol(piece)}</div>}
              </div>
            );
          })}
        </div>
        <button
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            fontSize: "16px",
            borderRadius: "8px",
            cursor: "pointer",
          }}
          onClick={restartGame}
        >
          Restart Game
        </button>
      </div>

      <div className="captured">
        {capturedWhite.map((p, idx) => (
          <span key={idx}>{pieceSymbol(p)}</span>
        ))}
      </div>

      {winner && <h2 className="winner">{winner} wins!</h2>}
    </div>
  );
}
