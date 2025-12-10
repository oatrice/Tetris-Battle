cmake_minimum_required(VERSION 3.15)
project(TetrisClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)

FetchContent_Declare(
  raylib
  GIT_REPOSITORY https://github.com/raysan5/raylib.git
  GIT_TAG        5.0
)

FetchContent_MakeAvailable(raylib)

add_executable(TetrisClient main.cpp game.cpp board.cpp)
target_link_libraries(TetrisClient PRIVATE raylib)

# --- TDD: GoogleTest Infrastructure ---
enable_testing()

FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)
# Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

# Test Executable (Links only Logic files, NOT Raylib main)
add_executable(test_tetris 
    tests/board_test.cpp 
    tests/logic_test.cpp
    board.cpp
    logic.cpp
)
target_link_libraries(test_tetris GTest::gtest_main)

include(GoogleTest)
gtest_discover_tests(test_tetris)
