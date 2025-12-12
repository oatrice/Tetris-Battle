#ifndef NETWORK_PROTOCOL_H
#define NETWORK_PROTOCOL_H

#include <sstream>
#include <string>
#include <vector>

enum class NetworkMsgType {
  UNKNOWN,
  CONNECT_REQ,
  GAME_START,
  MOVE_LR,
  ROTATE,
  MOVE_DOWN,
  // Add more as needed
};

struct NetworkMessage {
  NetworkMsgType type;
  std::string payload; // Raw payload for handling specific logic
  int intParam1 = 0;
  std::string strParam1 = "";
};

class NetworkProtocol {
public:
  static std::string SerializeMoveLR(int dir) {
    return "MOVE_LR;DIR:" + std::to_string(dir);
  }

  static std::string SerializeGameStart(int seed, const std::string &name) {
    return "GAME_START_HOST;SEED:" + std::to_string(seed) + ";P1_NAME:" + name;
  }

  static NetworkMessage Parse(const std::string &msg) {
    NetworkMessage out;
    out.type = NetworkMsgType::UNKNOWN;

    if (msg.find("MOVE_LR") == 0) {
      out.type = NetworkMsgType::MOVE_LR;
      size_t pos = msg.find("DIR:");
      if (pos != std::string::npos) {
        out.intParam1 = std::stoi(msg.substr(pos + 4));
      }
    } else if (msg.find("GAME_START") == 0) {
      out.type = NetworkMsgType::GAME_START;
      size_t seedPos = msg.find("SEED:");
      size_t namePos = msg.find("P1_NAME:");
      if (seedPos != std::string::npos) {
        out.intParam1 =
            std::stoi(msg.substr(seedPos + 5)); // Just parsing seed roughly
      }
    } else if (msg.find("ROTATE") == 0) {
      out.type = NetworkMsgType::ROTATE;
    } else if (msg.find("MOVE_DOWN") == 0) {
      out.type = NetworkMsgType::MOVE_DOWN;
    }

    return out;
  }
};

#endif
