package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

// TestWebSocketConnection verifies that we can upgrade HTTP to WebSocket
// using the Server.ServeWS handler.
func TestWebSocketConnection(t *testing.T) {
	// 1. Initialize Server
	srv := NewServer()

	// 2. Create a test server that uses our ServeWS handler
	s := httptest.NewServer(http.HandlerFunc(srv.ServeWS))
	defer s.Close()

	// 3. Convert http:// -> ws://
	wsURL := "ws" + strings.TrimPrefix(s.URL, "http")

	// 4. Connect using Gorilla Dial
	_, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to open WebSocket connection: %v", err)
	}
}

// TestServeHello verifies the root handler returns the correct greeting.
func TestServeHello(t *testing.T) {
	// 1. Initialize Server
	srv := NewServer()

	// 2. Create a request to "/"
	req, err := http.NewRequest("GET", "/hello", nil)
	if err != nil {
		t.Fatal(err)
	}

	// 3. Create a ResponseRecorder
	rr := httptest.NewRecorder()

	// 4. Call ServeHello directly
	srv.ServeHello(rr, req)

	// 5. Check Status Code
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	// 6. Check Body
	expected := "Welcome to Tetris"
	if rr.Body.String() != expected {
		t.Errorf("handler returned unexpected body: got %v want %v",
			rr.Body.String(), expected)
	}
}

// TestScoreSystem verifies the scoring logic.
func TestScoreSystem(t *testing.T) {
	gs := NewGameSession()

	// Initial score should be 0
	if gs.GetScore() != 0 {
		t.Errorf("Initial score expected 0, got %d", gs.GetScore())
	}

	// Add 1 line -> 100 points
	gs.AddLinesCleared(1)
	if gs.GetScore() != 100 {
		t.Errorf("Score after 1 line expected 100, got %d", gs.GetScore())
	}

	// Add 2 lines -> +300 points = 400
	gs.AddLinesCleared(2)
	if gs.GetScore() != 400 {
		t.Errorf("Score after +2 lines expected 400, got %d", gs.GetScore())
	}

	// Add 3 lines -> +500 points = 900
	gs.AddLinesCleared(3)
	if gs.GetScore() != 900 {
		t.Errorf("Score after +3 lines expected 900, got %d", gs.GetScore())
	}

	// Add 4 lines -> +800 points = 1700
	gs.AddLinesCleared(4)
	if gs.GetScore() != 1700 {
		t.Errorf("Score after +4 lines expected 1700, got %d", gs.GetScore())
	}
}
