package main

import (
	"encoding/json"
	"testing"
	"time"
)

func TestMatchmaking(t *testing.T) {
	hub := NewHub()
	go hub.run()

	// c1 joins
	c1 := &Client{
		hub:  hub,
		send: make(chan []byte, 10),
		id:   "client1",
	}
	// We need to simulate registration which happens in ws handler usually
	// But handleMessage checks hub.waitingClient under mutex.

	// Simulate join_game message
	joinMsg := Message{
		Type: "join_game",
		Payload: map[string]interface{}{
			"name": "Player 1",
		},
	}
	c1.handleMessage(joinMsg)

	// Expect waiting_for_opponent
	select {
	case msgBytes := <-c1.send:
		var msg Message
		json.Unmarshal(msgBytes, &msg)
		if msg.Type != "waiting_for_opponent" {
			t.Errorf("Expected waiting_for_opponent, got %s", msg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for response")
	}

	// c2 joins
	c2 := &Client{
		hub:  hub,
		send: make(chan []byte, 10),
		id:   "client2",
	}
	joinMsg2 := Message{
		Type: "join_game",
		Payload: map[string]interface{}{
			"name": "Player 2",
		},
	}
	c2.handleMessage(joinMsg2)

	// Expect game_start for both
	// c1 receives
	select {
	case msgBytes := <-c1.send:
		var msg Message
		json.Unmarshal(msgBytes, &msg)
		if msg.Type != "game_start" {
			t.Errorf("Expected game_start for c1, got %s", msg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for game_start c1")
	}

	// c2 receives
	select {
	case msgBytes := <-c2.send:
		var msg Message
		json.Unmarshal(msgBytes, &msg)
		if msg.Type != "game_start" {
			t.Errorf("Expected game_start for c2, got %s", msg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for game_start c2")
	}

	// Verify room assignment
	if c1.room == nil || c2.room == nil {
		t.Fatal("Clients should be in a room")
	}
	if c1.room != c2.room {
		t.Fatal("Clients should be in the same room")
	}
}

func TestPauseResumeBroadcasting(t *testing.T) {
	hub := NewHub()
	// No need to run hub loop for direct broadcast tests if we manually set up room

	c1 := &Client{
		hub:  hub,
		send: make(chan []byte, 10),
		id:   "client1",
		name: "P1",
	}
	c2 := &Client{
		hub:  hub,
		send: make(chan []byte, 10),
		id:   "client2",
		name: "P2",
	}

	// Manually create a room and join them
	room := NewRoom("test-room")
	c1.room = room
	c2.room = room
	room.clients[c1] = true
	room.clients[c2] = true

	// --- Test Pause ---
	pauseMsg := Message{Type: "pause"}
	c1.handleMessage(pauseMsg)

	// Check if c2 received the pause message
	select {
	case msgBytes := <-c2.send:
		var receivedMsg Message
		if err := json.Unmarshal(msgBytes, &receivedMsg); err != nil {
			t.Fatalf("Failed to unmarshal message: %v", err)
		}
		if receivedMsg.Type != "pause" {
			t.Errorf("Expected 'pause', got '%s'", receivedMsg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for pause message")
	}

	// Check if c1 did NOT receive the message (should not broadcast to self)
	select {
	case <-c1.send:
		t.Error("Sender should not receive own broadcast")
	default:
		// OK
	}

	// --- Test Resume ---
	resumeMsg := Message{Type: "resume"}
	c1.handleMessage(resumeMsg)

	// Check if c2 received the resume message
	select {
	case msgBytes := <-c2.send:
		var receivedMsg Message
		if err := json.Unmarshal(msgBytes, &receivedMsg); err != nil {
			t.Fatalf("Failed to unmarshal message: %v", err)
		}
		if receivedMsg.Type != "resume" {
			t.Errorf("Expected 'resume', got '%s'", receivedMsg.Type)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for resume message")
	}
}
