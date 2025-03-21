/*
.mjs?
- ES Modules 문법의 JavaScript를 의미
- 즉, JavaScript는 신, 구 두 가지 버전의 문법이 있음
- ES Module 문법이 신버전임
*/

import express from "express"; // Express.js
import morgan from "morgan"; // 서버 상세 로그 출력
import http from "http";
import { WebSocketServer } from "ws";
import net from "net";

import pool from "./DB/db.js";

const PORT = 8000; // socket 8000번 포트 개방
const TCP_SOCKET_PORT = 9000;// web socket 9000번 개방 

const app = express(); // 서버 앱
app.use(morgan("dev")); // 개발용 로그
app.use(express.json());

// [ GET ]
// 단순 조회
app.get("/api/v1/status", async (req, res) => {
  try {
    const [data] = await pool.query("SELECT * FROM status;");
    return res.json(data);
  } catch (error) {
    return res.json({
      error: error.message,
    });
  }
});

app.get("/api/v1/logs", async (req, res) => {
  try {
    const [data] = await pool.query("SELECT * FROM logs;");
    return res.json(data);
  } catch (error) {
    return res.json({
      error: error.message,
    });
  }
});

app.get("/api/v1/images", async (req, res) => {
  try {
    const [data] = await pool.query("SELECT * FROM images;");
    return res.json(data);
  } catch (error) {
    return res.json({
      error: error.message,
    });
  }
});

// [ POST ]
// 서버에 새로운 데이터 생성
app.post("/api/v1/status", async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO `robot`.`status` \
      (`x`, `y`, `yaw`, `battery`, `temperature`, `humidity`) \
      VALUES ('0', '0', '0', '0', '0', '0');"
    );

    const [data] = await pool.query("SELECT * FROM status;");

    return res.status(201).json(data);
  } catch (error) {
    return res.json({
      error: error.message,
    });
  }
});

app.post("/api/v1/logs", async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO `robot`.`logs` (`robot_id`, `log_message`, `log_type`) \
      VALUES ('junobot2', '잘 작동중', '1');"
    );

    const data = await pool.query("SELECT * FROM logs;");

    return res.status(201).json(data[0]);
  } catch (error) {
    return res.json({
      error: error.message,
    });
  }
});
app.post("/api/v1/images", async (req, res) => {
  try {
    await pool.query(
      "INSERT INTO `robot`.`images` (`image_url`) VALUES ('~/images/image1.png')"
    );

    const [data] = await pool.query("SELECT * FROM images;");

    return res.status(201).json(data);
  } catch (error) {
    return res.json({
      error: error.message,
    });
  }
});

// [ PATCH ]
// 기존 단일 데이터 수정.

// [ DELETE ]
// (단일, 전체) 데이터 삭제.

const socketServer = http.createServer(app); // HTTP 서버 생성
const webSocketServer = new WebSocketServer({ server: socketServer });

let tcpSocketClients = [];
let webSocketClients = [];

const tcpSocketServer = net.createServer((socket) => {
  console.log("TCP Socket client connected");

  tcpSocketClients.push(socket);

  socket.on("data", (data) => {
    /*

    DB에 저장하는 코드 부분

    */
   const message = data.toString()
   console.log('socket : ', message['temperature'])
    webSocketClients.forEach((webSocketClient) => {
      webSocketClient.send(data);
    });
  });
  socket.on("end", () => {
    console.log("TCP client disconnected");
    tcpSocketClients = tcpSocketClients.filter(
      (tcpSocketClient) => tcpSocketClient !== socket
    );
  });
});

// Web Socket 서버 설정
webSocketServer.on("connection", (webSocket) => {
  console.log("Web Socket client connected");

  webSocketClients.push(webSocket);

  webSocket.on("message", (message) => {
    /*

    DB에 저장하는 코드 부분

    */

    // TCP 클라이언트에게 브로드캐스트 (대시보드 => 로봇 || 대시보드 => 시뮬레이터)
    console.log('web socket : ', message)
  
    tcpSocketClients.forEach((tcpSocketClient) => {
      tcpSocketClient.write(message.data);
    });
  });

  webSocket.on("close", () => {
    console.log("Web Socket client disconnected");
    webSocketClients = webSocketClients.filter(
      (webSocketClient) => webSocketClient !== webSocket
    );
  });
});

tcpSocketServer.listen(TCP_SOCKET_PORT, () => {
  console.log(`TCP Socket server listening on port ${TCP_SOCKET_PORT}`);
});

socketServer.listen(PORT, () => console.log(`Web server listening on ${PORT}`)); // 서버 동작

/*
[ 성공 ]
200
- OK
- return res.json()의 디폴트

201
- POST 요청으로 데이터가 생성 (Created)
- PATCH 요청으로 데이터가 수정 (Edited)

204
- No Content
- 삭제 성공 (DELETE)
- 응답 바디가 없기 때문에 res.status(204).json()

[ 리다이렉션 ]
304
- Not Modified
- 저장된 캐시 기반으로 요청이 처리됐음.
- 동일한 내용을 매번 서버에서 리턴하는 것을 방지하기 위해 브라우저에서 처리.
- "캐시 비우기 및 강력 새로고침" 을 하면, 304 가 아닌 200 이 발생.

[ 클라이언트 오류 ]
400
- Bad Request
- 경로는 맞는데... 요청 형태가 적합하지 않음

401
- Unauthorized
- 권한 없는 사용자의 접근

404
- Not Found
- 경로에 데이터가 없음. 존재하지 않음

451
- Unavailable for Legal Reasons
- 특정 국가에서 법적인 사유로 접근할 수 없을 경우

[ 서버 오류 ]
500
- Internal Server Error
- 서버가 현재 서비스를 제공하기 적합하지 않은 상태.

503
- Service Temporarily Unavailable
- 현재 요청이 지나치게 많아 서비스를 할 수 없는 경우.
*/
