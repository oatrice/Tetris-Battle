package com.oatrice.tetrisserver

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import org.java_websocket.WebSocket
import org.java_websocket.handshake.ClientHandshake
import org.java_websocket.server.WebSocketServer
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentHashMap

class TetrisServer(port: Int, val onLog: (String) -> Unit) : WebSocketServer(InetSocketAddress(port)) {

    private val gson = Gson()

    data class Client(
        val conn: WebSocket,
        val id: String = System.nanoTime().toString(),
        var name: String = "Player",
        var opponent: Client? = null,
        var roomId: String? = null
    )

    private val clients = ConcurrentHashMap<WebSocket, Client>()
    @Volatile private var waitingClient: Client? = null

    override fun onOpen(conn: WebSocket, handshake: ClientHandshake?) {
        val client = Client(conn)
        clients[conn] = client
        log("Client connected: ${conn.remoteSocketAddress}")
    }

    override fun onClose(conn: WebSocket, code: Int, reason: String?, remote: Boolean) {
        val client = clients[conn] ?: return
        clients.remove(conn)

        synchronized(this) {
            if (waitingClient == client) {
                waitingClient = null
            }
        }

        // Notify opponent
        client.opponent?.let { opp ->
            if (opp.conn.isOpen) {
                sendJson(opp.conn, "player_left", null)
                opp.opponent = null
                opp.roomId = null
            }
        }
        log("Client disconnected")
    }

    override fun onMessage(conn: WebSocket, message: String) {
        val client = clients[conn] ?: return
        try {
            val jsonElement = JsonParser.parseString(message)
            if (!jsonElement.isJsonObject) return
            val json = jsonElement.asJsonObject
            
            if (!json.has("type")) return
            val type = json.get("type").asString

            handleMessage(client, type, json)
        } catch (e: Exception) {
            log("Error parsing: ${e.message}")
        }
    }

    override fun onError(conn: WebSocket?, ex: Exception?) {
        log("Error: ${ex?.message}")
    }

    override fun onStart() {
        log("Server started on port $port")
    }

    private fun handleMessage(client: Client, type: String, fullJson: JsonObject) {
        when (type) {
            "join_game" -> {
                if (fullJson.has("payload")) {
                    val p = fullJson.get("payload")
                    if (p.isJsonObject && p.asJsonObject.has("name")) {
                        client.name = p.asJsonObject.get("name").asString
                    }
                }
                if (client.name.isEmpty()) client.name = "Player " + client.id.takeLast(4)

                synchronized(this) {
                    if (waitingClient != null && waitingClient != client && waitingClient!!.conn.isOpen) {
                        // Match Found
                        val opponent = waitingClient!!
                        waitingClient = null
                        
                        val roomId = "room-${System.nanoTime()}"
                        
                        // Pair them
                        client.opponent = opponent
                        client.roomId = roomId
                        opponent.opponent = client
                        opponent.roomId = roomId
                        
                        // Send Game Start
                        sendGameStart(client, opponent, roomId)
                        sendGameStart(opponent, client, roomId)
                        
                        log("Match: ${client.name} vs ${opponent.name}")
                    } else {
                        // Wait
                        waitingClient = client
                        sendJson(client.conn, "waiting_for_opponent", null)
                        log("${client.name} waiting...")
                    }
                }
            }
            "game_state", "attack", "game_over", "pause", "resume" -> {
                client.opponent?.let { opp ->
                    // Forward mostly as-is, but we reconstruct to ensure structure
                    val payload = if (fullJson.has("payload")) fullJson.get("payload") else null
                    sendJson(opp.conn, type, payload)
                    
                    if (type == "game_over" || type == "pause") {
                         log("Action: $type from ${client.name}")
                    }
                }
            }
        }
    }

    private fun sendGameStart(client: Client, opponent: Client, roomId: String) {
        val payload = mapOf(
            "opponentId" to opponent.id,
            "opponentName" to opponent.name,
            "matchId" to roomId
        )
        sendJson(client.conn, "game_start", payload)
    }

    private fun sendJson(conn: WebSocket, type: String, payload: Any?) {
        if (conn.isOpen) {
            val map = HashMap<String, Any?>()
            map["type"] = type
            map["payload"] = payload
            conn.send(gson.toJson(map))
        }
    }

    private fun log(msg: String) {
        onLog(msg)
    }
}
