#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include "raylib.h"
#include <arpa/inet.h>
#include <atomic>
#include <fcntl.h>
#include <iostream>
#include <mutex>
#include <netinet/tcp.h> // For TCP_NODELAY
#include <string>
#include <sys/select.h>
#include <sys/socket.h>
#include <unistd.h>
#include <vector>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
// Emscripten doesn't support std::thread well without headers/flags
// We will use a polling approach in the main loop.
#else
#include <thread>
#endif

class NetworkManager {
public:
  NetworkManager()
      : currentSocket(-1), isRunning(false), isConnected(false), isHost(false),
        pendingData("") {}

  ~NetworkManager() { Stop(); }

  bool StartHost(int port) {
#ifdef __EMSCRIPTEN__
    TraceLog(LOG_WARNING, "NETWORK: Hosting not supported on Web/WASM yet.");
    return false;
#else
    Stop(); // Ensure clean state
    isHost = true;

    currentSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (currentSocket < 0)
      return false;

    // Enable TCP_NODELAY
    int flag = 1;
    setsockopt(currentSocket, IPPROTO_TCP, TCP_NODELAY, (char *)&flag,
               sizeof(int));

    // Allow reuse address
    int opt = 1;
    setsockopt(currentSocket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    struct sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_addr.s_addr = INADDR_ANY;
    serverAddr.sin_port = htons(port);

    if (bind(currentSocket, (struct sockaddr *)&serverAddr,
             sizeof(serverAddr)) < 0) {
      return false;
    }

    if (listen(currentSocket, 1) < 0) {
      return false;
    }

    isRunning = true;
    networkThread = std::thread(&NetworkManager::HostLoop, this);
    return true;
#endif
  }

  bool ConnectClient(const std::string &ip, int port) {
    Stop(); // Ensure clean state
    isHost = false;

    currentSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (currentSocket < 0)
      return false;

    // Enable TCP_NODELAY
    int flag = 1;
    setsockopt(currentSocket, IPPROTO_TCP, TCP_NODELAY, (char *)&flag,
               sizeof(int));

    struct sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(port);

    if (inet_pton(AF_INET, ip.c_str(), &serverAddr.sin_addr) <= 0) {
      return false;
    }

#ifdef __EMSCRIPTEN__
    // Non-blocking connect for Web
    fcntl(currentSocket, F_SETFL, O_NONBLOCK);

    int res = connect(currentSocket, (struct sockaddr *)&serverAddr,
                      sizeof(serverAddr));
    if (res < 0 && errno != EINPROGRESS) {
      TraceLog(LOG_ERROR, "NETWORK: Connect failed immediately: %d", errno);
      close(currentSocket);
      currentSocket = -1;
      return false;
    }

    // We are "connecting". IsConnected will be true once we confirm in Update()
    // but for simplicity, let's mark as connected so game transitions,
    // and if it fails later, we disconnect.
    // Actually, emscripten sockets over websocket behave a bit differently.
    // Let's assume connected for now and handle errors in Update.
    isConnected = true;
    isRunning = true;
    TraceLog(LOG_INFO, "NETWORK: Async connect started...");
    return true;

#else
    // Blocking connect for Desktop
    if (connect(currentSocket, (struct sockaddr *)&serverAddr,
                sizeof(serverAddr)) < 0) {
      close(currentSocket);
      currentSocket = -1;
      return false;
    }

    isConnected = true;
    isRunning = true;
    networkThread = std::thread(&NetworkManager::ClientLoop, this);
    return true;
#endif
  }

  void Stop() {
    isRunning = false;
    isConnected = false;

    if (currentSocket != -1) {
      shutdown(currentSocket, SHUT_RDWR);
      close(currentSocket);
      currentSocket = -1;
    }
#ifndef __EMSCRIPTEN__
    if (networkThread.joinable()) {
      // Check if we are trying to join ourselves (which causes a crash)
      if (std::this_thread::get_id() != networkThread.get_id()) {
        networkThread.join();
      } else {
        // If we are stopping from within the thread, detaching is safer
        // (though we should avoid calling Stop from within thread)
        // But since we fixed ReadLoop, this is just a safety guard.
        networkThread.detach();
      }
    }
#endif
    std::lock_guard<std::mutex> lock(queueMutex);
    messageQueue.clear();
    pendingData = "";
  }

  void SendMessageStr(const std::string &msg) {
    if (!isConnected || currentSocket == -1)
      return;

    std::string payload = msg + "\n";
    send(currentSocket, payload.c_str(), payload.length(), 0);
  }

  // Called every frame to handle network tasks (polling)
  void Update() {
#ifdef __EMSCRIPTEN__
    if (!isRunning || currentSocket == -1)
      return;

    // Check if we are writable (connected)
    fd_set wset;
    FD_ZERO(&wset);
    FD_SET(currentSocket, &wset);
    struct timeval t = {0, 0};
    int rc = select(currentSocket + 1, NULL, &wset, NULL, &t);

    if (rc > 0 && FD_ISSET(currentSocket, &wset)) {
      // Connected or error
      int error = 0;
      socklen_t len = sizeof(error);
      if (getsockopt(currentSocket, SOL_SOCKET, SO_ERROR, &error, &len) < 0 ||
          error != 0) {
        TraceLog(LOG_INFO, "NETWORK: Socket connect failed: %d", error);
        Stop();
        return;
      }
    } else {
      // Still connecting or not writable
      return;
    }

    // Handshake check (Emscripten specific)
    // Actually relying on recv to return EAGAIN is standard for non-blocking.
    // But if we get 0, it's closed.

    char buffer[1024];
    int bytesRead = recv(currentSocket, buffer, sizeof(buffer) - 1, 0);

    if (bytesRead > 0) {
      buffer[bytesRead] = '\0';
      pendingData += buffer;
      ProcessPendingData();
    } else if (bytesRead == 0) {
      // If we just connected, getting 0 immediately is suspicious.
      // But if it's truly closed, we must stop.
      TraceLog(LOG_INFO, "NETWORK: Connection closed by remote.");
      Stop();
    } else {
      if (errno != EAGAIN && errno != EWOULDBLOCK) {
        TraceLog(LOG_INFO, "NETWORK: Socket error: %d",
                 errno); // Down level to INFO
        Stop();
      }
    }
#endif
  }

  std::vector<std::string> PollMessages() {
    std::lock_guard<std::mutex> lock(queueMutex);
    std::vector<std::string> messages = messageQueue;
    messageQueue.clear();
    return messages;
  }

  bool IsConnected() const { return isConnected; }

private:
  int currentSocket;
#ifndef __EMSCRIPTEN__
  std::thread networkThread;
#endif
  std::atomic<bool> isRunning;
  std::atomic<bool> isConnected;
  bool isHost;

  std::mutex queueMutex;
  std::vector<std::string> messageQueue;
  std::string pendingData; // For partial reads

  void ProcessPendingData() {
    size_t pos;
    while ((pos = pendingData.find('\n')) != std::string::npos) {
      std::string msg = pendingData.substr(0, pos);
      if (!msg.empty()) {
        std::lock_guard<std::mutex> lock(queueMutex);
        messageQueue.push_back(msg);
      }
      pendingData.erase(0, pos + 1);
    }
  }

#ifndef __EMSCRIPTEN__
  void HostLoop() {
    TraceLog(LOG_INFO,
             "NETWORK: Host thread started, waiting for connection...");
    struct sockaddr_in clientAddr;
    socklen_t clientLen = sizeof(clientAddr);

    int clientSocket =
        accept(currentSocket, (struct sockaddr *)&clientAddr, &clientLen);
    if (clientSocket < 0) {
      TraceLog(LOG_INFO, "NETWORK: Accept failed or stopped.");
      isRunning = false;
      return;
    }

    // Enable TCP_NODELAY for accepted client socket
    int flag = 1;
    setsockopt(clientSocket, IPPROTO_TCP, TCP_NODELAY, (char *)&flag,
               sizeof(int));

    TraceLog(LOG_INFO, "NETWORK: Client connected!");
    isConnected = true;

    close(currentSocket); // Close listener
    currentSocket = clientSocket;

    ReadLoop();
  }

  void ClientLoop() {
    TraceLog(LOG_INFO, "NETWORK: Client thread started reading...");
    ReadLoop();
  }

  void ReadLoop() {
    char buffer[1024];
    while (isRunning && isConnected) {
      int bytesRead = recv(currentSocket, buffer, sizeof(buffer) - 1, 0);
      if (bytesRead <= 0) {
        TraceLog(LOG_INFO,
                 "NETWORK: Connection closed or error. Stopping ReadLoop.");
        break; // Exit loop, thread finishes naturally. Don't call Stop() here!
      }
      buffer[bytesRead] = '\0';
      pendingData += buffer;
      ProcessPendingData();
    }
    // Ensure flags are cleared when loop exits
    isConnected = false;
  }
#endif
};

#endif
