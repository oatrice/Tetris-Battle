
#pragma once

class Board {
public:
  Board();
  void Reset();
  void SetCell(int r, int c, int val);
  int GetCell(int r, int c) const;
  int GetWidth() const { return 10; }
  int GetHeight() const { return 20; }

private:
  int grid[20][10];
};
