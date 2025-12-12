#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include "raylib.h"
#include <arpa/inet.h>
#include <atomic>
#include <iostream>
#include <mutex>
#include <string>
#include <sys/socket.h>
#include <thread>
#include <unistd.h>
#include <vector>

class NetworkManager {
public:
  NetworkManager()
      : currentSocket(-1), isRunning(false), isConnected(false), isHost(false) {
  }

  ~NetworkManager() { Stop(); }

  bool StartHost(int port) {
    Stop(); // Ensure clean state
    isHost = true;

    currentSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (currentSocket < 0)
      return false;

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
  }

  bool ConnectClient(const std::string &ip, int port) {
    Stop(); // Ensure clean state
    isHost = false;

    currentSocket = socket(AF_INET, SOCK_STREAM, 0);
    if (currentSocket < 0)
      return false;

    struct sockaddr_in serverAddr;
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(port);

    if (inet_pton(AF_INET, ip.c_str(), &serverAddr.sin_addr) <= 0) {
      return false;
    }

    // Blocking connect for simplicity (or can be async)
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
  }

  void Stop() {
    isRunning = false;
    if (currentSocket != -1) {
      // Shutdown both send and receive operations
      shutdown(currentSocket, SHUT_RDWR);
      close(currentSocket);
      currentSocket = -1;
    }
    if (networkThread.joinable()) {
      networkThread.join();
    }
    isConnected = false;

    // Clear queue
    std::lock_guard<std::mutex> lock(queueMutex);
    messageQueue.clear();
  }

  void SendMessageStr(const std::string &msg) {
    if (!isConnected || currentSocket == -1)
      return;

    // Simple line-based protocol: Append newline if not present
    std::string payload = msg + "\n";
    send(currentSocket, payload.c_str(), payload.length(), 0);
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
  std::thread networkThread;
  std::atomic<bool> isRunning;
  std::atomic<bool> isConnected;
  bool isHost;

  std::mutex queueMutex;
  std::vector<std::string> messageQueue;

  void HostLoop() {
    TraceLog(LOG_INFO,
             "NETWORK: Host thread started, waiting for connection...");
    struct sockaddr_in clientAddr;
    socklen_t clientLen = sizeof(clientAddr);

    // Blocking accept
    int clientSocket =
        accept(currentSocket, (struct sockaddr *)&clientAddr, &clientLen);
    if (clientSocket < 0) {
      TraceLog(LOG_INFO, "NETWORK: Accept failed or stopped.");
      isRunning = false;
      return;
    }

    TraceLog(LOG_INFO, "NETWORK: Client connected!");
    isConnected = true;

    // Replace listener socket with client socket for communication
    // NOTE: In a real server handling multiple clients, we'd keep the listener.
    // For 1v1, we can close the listener or just stop accepting.
    // We'll keep using clientSocket for data.
    // But to keep class simple, let's swap:
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
    std::string pendingData;

    while (isRunning && isConnected) {
      int bytesRead = recv(currentSocket, buffer, sizeof(buffer) - 1, 0);
      if (bytesRead <= 0) {
        TraceLog(LOG_INFO, "NETWORK: Connection closed or error.");
        isConnected = false;
        break;
      }

      buffer[bytesRead] = '\0';
      pendingData += buffer;

      // Process line breaks (simple framing)
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
    isRunning = false;
  }
};

#endif
