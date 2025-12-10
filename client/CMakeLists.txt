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

add_executable(TetrisClient main.cpp)

target_link_libraries(TetrisClient PRIVATE raylib)
