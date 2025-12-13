#include "../network_protocol.h"
#include <gtest/gtest.h>

TEST(NetworkProtocolTest, ParseMoveLR) {
  std::string msg = "MOVE_LR;DIR:-1";
  NetworkMessage out = NetworkProtocol::Parse(msg);
  EXPECT_EQ(out.type, NetworkMsgType::MOVE_LR);
  EXPECT_EQ(out.intParam1, -1);

  msg = "MOVE_LR;DIR:1";
  out = NetworkProtocol::Parse(msg);
  EXPECT_EQ(out.type, NetworkMsgType::MOVE_LR);
  EXPECT_EQ(out.intParam1, 1);
}

TEST(NetworkProtocolTest, ParseGameStart) {
  std::string msg = "GAME_START_HOST;SEED:12345;P1_NAME:Oatrice";
  NetworkMessage out = NetworkProtocol::Parse(msg);
  EXPECT_EQ(out.type, NetworkMsgType::GAME_START);
  EXPECT_EQ(out.intParam1, 12345);
  // Note: Parsing P1_NAME is not fully implemented in Parse method shown in
  // snippet but basic type check and seed is there.
}

TEST(NetworkProtocolTest, SerializeMoveLR) {
  std::string msg = NetworkProtocol::SerializeMoveLR(-1);
  EXPECT_EQ(msg, "MOVE_LR;DIR:-1");
}

TEST(NetworkProtocolTest, SerializeGameStart) {
  std::string msg = NetworkProtocol::SerializeGameStart(999, "Player");
  EXPECT_EQ(msg, "GAME_START_HOST;SEED:999;P1_NAME:Player");
}
