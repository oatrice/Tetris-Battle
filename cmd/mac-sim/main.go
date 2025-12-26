package main

import (
	"fmt"
	tetrisserver "tetris-battle" // Imports the root package
)

// ConsoleLogger implements tetrisserver.Logger
type ConsoleLogger struct{}

func (c *ConsoleLogger) Log(msg string) {
	fmt.Println("[Mac-Sim]", msg)
}

func main() {
	mock := &ConsoleLogger{}
	tetrisserver.SetLogger(mock)

	port := ":8080"
	fmt.Printf("🍎 Starting Mac Simulation on http://localhost%s\n", port)
	fmt.Println("   (Simulates Android Server behavior via go run)")

	tetrisserver.Start(port)
}
