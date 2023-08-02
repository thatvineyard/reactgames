import { Board } from "./board/board";
import { Pawn } from "./board/pawn/pawn";
import { GameRuleError } from "./game";
import { Player } from "./player";

export class Cpu {

  player: Player;

  pawnWithMostMoves?: Pawn;

  constructor(player: Player) {
    this.player = player;
  }

  public takeTurn(onEndTurn: () => void, board: Board) {
    board.foreachPawn((pawn: Pawn) => {
      if (pawn.canBePlayedBy(this.player)) {
        pawn.calcAvailableMoves();
        if (this.pawnWithMostMoves == null) {
          this.pawnWithMostMoves = pawn;
        } else {
          if (pawn.availableMoves.size > this.pawnWithMostMoves.availableMoves.size) {
            this.pawnWithMostMoves = pawn;
            return
          }
        }

      }
    });

    if (this.pawnWithMostMoves == null) {
      throw new GameRuleError(`${this.player.name} had no useable pawns`);
    }

    this.pawnWithMostMoves.lift();

    setTimeout(() => {
      const selectMove = Math.floor(Math.random() * this.pawnWithMostMoves.availableMoves.size);
      let move = Array.from(this.pawnWithMostMoves.availableMoves)[selectMove][1].move;
      this.pawnWithMostMoves.place(move.square);
      
      setTimeout(() => {
      onEndTurn();
      }, 500);
    }, 500);
  }
}