import { Action, ActionManager, Animation, BounceEase, CircleEase, EasingFunction, ExecuteCodeAction, Material, Nullable, PredicateCondition, Scene, Sound, Space, Vector2, Vector3 } from "@babylonjs/core";
import { InstancedMesh, Mesh, MeshBuilder } from "@babylonjs/core/Meshes";
import { FRAMES_PER_SECOND, GameEngine } from "../../engine/engine";
import { Board } from "../board";
import { Square } from "../square";
import { CancelMove, CaptureMove, Move, MovementMove } from "./move";
import { GameManager } from "../../gameManager";
import { Player, PlayerSide } from "../../player";
import { PieceMaterialGroup } from "../../engine/materialManager";
import { Piece } from "./piece";
import { SquareSelectionRuleSet } from "../squareSelectionRuleSet";
import { SelectDiagonalExtents, SelectDiagonalExtentsWithCurrentPlayersPieceBetween, SelectDiagonalExtentsWithOtherThanCurrentPlayersPieceBetween, SelectDiagonalExtentsWithPieceBetween, SelectEmptySquare } from "../squareSelectionRule";
import { checkSquaresBetweenSquaresOnDiagonals } from "../boardUtils";

const LIFT_HEIGHT = 1;
const PLACED_HEIGHT = 0.05;
const MESH_SCALE = 0.85;
enum State { NOT_DEFINED, LIFTED, PLACED }

export class CheckersPawn extends Piece {

  private movementRuleSet = new SquareSelectionRuleSet();
  private captureRuleSet = new SquareSelectionRuleSet();

  constructor(owner: Player, board: Board, square: Square, gameManager: GameManager, gameEngine: GameEngine) {
    super(owner, board, square, gameManager, gameEngine);

    this.movementRuleSet.addAdditiveRule(new SelectDiagonalExtents(board, 1));
    this.movementRuleSet.addAdditiveRule(new SelectDiagonalExtentsWithCurrentPlayersPieceBetween(board, 2, owner));
    this.movementRuleSet.addMaskingRule(new SelectEmptySquare(board));

    this.captureRuleSet.addAdditiveRule(new SelectDiagonalExtentsWithOtherThanCurrentPlayersPieceBetween(board, 2, owner));
    this.captureRuleSet.addMaskingRule(new SelectEmptySquare(board));
  }

  createMesh(): Mesh {
    const diameter = Math.min(this.board.getSquareSize().y, this.board.getSquareSize().x) * MESH_SCALE;
    return MeshBuilder.CreateCylinder('pawn', { height: 0.1, diameter }, this.gameEngine.scene);
  }

  getMaterialGroup(): PieceMaterialGroup {
    return this.owner.playerSide == PlayerSide.WHITE ?
      this.gameEngine.materialManager!.whitePawnMaterialGroup
      : this.gameEngine.materialManager!.blackPawnMaterialGroup;
  }

  protected getPickupSound(): Sound {
    return new Sound("POP", "./sfx/comedy_bubble_pop_003.mp3", this.gameEngine.scene, null, { loop: false, autoplay: false, volume: 0.3 });
  }

  // 
  // 

  public calcAvailableMoves() {
    this.availableMoves = new Map();
    this.board.foreachSquare((square: Square) => {
      if (this.movementRuleSet.select(square.coordinate, this.currentSquare.coordinate)) {
        this.availableMoves.set(square.coordinate.toString(), { move: new MovementMove(square), instance: undefined });
        return;
      }
      if (this.captureRuleSet.select(square.coordinate, this.currentSquare.coordinate)) {
        var target: Square | undefined;

        checkSquaresBetweenSquaresOnDiagonals((square) => {
          if(target != null) {
            return;
          }

          let piece = square.getPawn();
          if(piece != null && piece.owner.name != this.owner.name) {
            target = square;
          }
        }, this.board, this.currentSquare.coordinate, square.coordinate);

        if(!target) {
          throw new Error("Could not find target when creating checkers capture move");
          return
        }

        this.availableMoves.set(square.coordinate.toString(), { move: new CheckersCaptureMove(square, target), instance: undefined });
        return;
      }
      return;
    });

    this.availableMoves.set(this.currentSquare.coordinate.toString(), { move: new CancelMove(this.currentSquare), instance: undefined });
  }
}

class CheckersCaptureMove extends CaptureMove {

  constructor(target: Square, captureSquare: Square) {
    super(target);

    this.captureSquare = captureSquare;

  }

}