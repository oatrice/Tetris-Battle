cmake_minimum_required(VERSION 3.20)
project(TetrisClient LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Git)
if(GIT_FOUND)
    execute_process(
        COMMAND ${GIT_EXECUTABLE} log -1 --format=%h
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE GIT_HASH
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    execute_process(
        COMMAND ${GIT_EXECUTABLE} log -1 --format=%Y-%m-%d
        WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
        OUTPUT_VARIABLE GIT_DATE
        OUTPUT_STRIP_TRAILING_WHITESPACE
    )
    set(VERSION_STRING "${GIT_HASH} (${GIT_DATE})")
else()
    set(VERSION_STRING "Dev Build")
endif()

# Pass string as a C string literal
add_compile_definitions(GIT_VERSION="${VERSION_STRING}")

include(FetchContent)

FetchContent_Declare(
  raylib
  GIT_REPOSITORY https://github.com/raysan5/raylib.git
  GIT_TAG        5.0
)

FetchContent_MakeAvailable(raylib)


if (EMSCRIPTEN)
    set(CMAKE_EXECUTABLE_SUFFIX ".html")
    # Define the build type for Raylib
    set(PLATFORM "Web")
    # Add compile definitions for Raylib Web
    add_compile_definitions(PLATFORM_WEB)
else()
    set(PLATFORM "Desktop")
endif()

add_executable(TetrisClient main.cpp game.cpp board.cpp logic.cpp)
target_link_libraries(TetrisClient PRIVATE raylib)

if (EMSCRIPTEN)
    # Emscripten specific options
    target_link_options(TetrisClient PRIVATE 
        "-sUSE_GLFW=3"
        "-sWASM=1"
        "-sALLOW_MEMORY_GROWTH=1"
        "--shell-file ${CMAKE_SOURCE_DIR}/minshell.html"
    )
endif()


# --- TDD: GoogleTest Infrastructure ---
if (NOT EMSCRIPTEN)
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
        tests/network_test.cpp
        board.cpp
        logic.cpp
    )

    target_link_libraries(test_tetris GTest::gtest_main)

    include(GoogleTest)
    gtest_discover_tests(test_tetris)
endif()
