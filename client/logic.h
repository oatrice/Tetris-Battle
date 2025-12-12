#ifndef LOGIC_H
#define LOGIC_H

#include "board.h"
#include "piece.h"
#include <random>

const int BOARD_WIDTH = 10;
const int BOARD_HEIGHT = 20;

class Logic {
public:
  Logic();

  // Core Game Loop
  void Tick();
  void SpawnPiece();

  // Actions
  void Move(int dx, int dy);
  void Rotate();

  // Helpers
  bool IsValidPosition(const Piece &p) const;
  void LockPiece();
  void CheckLines();

  // New: Game Over State and Reset
  bool isGameOver = false;   // Indicates if the game is currently over
  void Reset(int seed = -1); // Resets the game state with optional seed

  Board board;
  Piece currentPiece;
  Piece nextPiece;      // Feature: Stores the upcoming piece for preview
  int spawnCounter = 0; // New: Tracks how many pieces have spawned
  int score;            // Feature: Stores the current game score

private:
  std::mt19937 rng;
  std::uniform_int_distribution<int> dist;
};

#endif