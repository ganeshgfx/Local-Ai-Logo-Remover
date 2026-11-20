cmake_minimum_required(VERSION 3.20)
project(GeminiRemoverShellExt LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_library(GeminiRemoverShellExt SHARED
    dllmain.cpp
    GeminiRemoverCommand.cpp
    GeminiRemoverShellExt.def
)

target_compile_definitions(GeminiRemoverShellExt PRIVATE
    WIN32_LEAN_AND_MEAN
    NOMINMAX
    UNICODE
    _UNICODE
)

target_link_libraries(GeminiRemoverShellExt PRIVATE
    shlwapi
    shell32
    ole32
    oleaut32
    uuid
)

set_target_properties(GeminiRemoverShellExt PROPERTIES
    OUTPUT_NAME "GeminiRemoverShellExt"
    RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../resources/native"
)
