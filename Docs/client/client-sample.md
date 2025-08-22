# Client Sample

<!-- @cursor-change: 2025-01-27, v1.0.1, 문서 최신화 규칙 적용 -->

## 개요

이 문서는 LostArk Remote Kakao 서비스의 클라이언트 샘플 코드를 설명합니다.
클라이언트는 **메신저봇R**을 기반으로 하여 Android 환경에서 UDP를 통해 서버와
통신하며, 카카오톡 메시지를 원격으로 처리할 수 있습니다.

### 메신저봇R 기반 구현

이 클라이언트는 **메신저봇R** 프레임워크를 활용하여 구현되었습니다. 메신저봇R은
Android 환경에서 다양한 메신저 앱의 알림을 감지하고 처리할 수 있는 봇
프레임워크로, 다음과 같은 기능을 제공합니다:

- **알림 리스너**: 카카오톡 알림을 실시간으로 감지
- **RemoteInput 처리**: 알림을 통한 메시지 전송 기능
- **봇 매니저**: 봇 인스턴스 관리 및 이벤트 처리
- **WakeLock**: 백그라운드에서의 지속적인 실행 보장

## 전체 코드

### 1. 초기화 및 설정

```javascript
'use strict';
const bot = BotManager.getCurrentBot();
Device.acquireWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, '');

var scriptName = 'remote-kakao';
var config = {
  address: 'your address', // 서버 IP 주소
  port: 3000, // UDP 포트
  packageNames: ['com.kakao.talk'], // 모니터링할 앱 패키지
  userIds: [0], // 사용자 ID 배열
};

var RKPlugins = {}; // 플러그인 관리 객체
```

**설명:**

- `BotManager.getCurrentBot()`: 현재 봇 인스턴스를 가져옵니다
- `Device.acquireWakeLock()`: 화면이 꺼져도 스크립트가 계속 실행되도록
  보장합니다
- `config`: 서버 연결 정보와 모니터링할 앱 설정을 정의합니다

### 2. UDP 소켓 및 데이터 구조 초기화

```javascript
// UDP 소켓 설정
var socket = new java.net.DatagramSocket();
var address = java.net.InetAddress.getByName(config.address);
var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65535);
var inPacket = new java.net.DatagramPacket(buffer, buffer.length);

// 데이터 저장소 초기화
var replyActions = new Map(); // 답장 액션 캐시
var profileImages = new Map(); // 프로필 이미지 캐시
var roomIcons = new Map(); // 채팅방 아이콘 캐시
```

**설명:**

- `DatagramSocket`: UDP 통신을 위한 소켓을 생성합니다
- `buffer`: 65KB 크기의 수신 버퍼를 할당합니다
- `inPacket`: 수신된 UDP 패킷을 저장할 객체입니다
- 각 Map 객체는 메모리 캐싱을 위해 사용됩니다

### 3. 유틸리티 함수

```javascript
// 문자열을 바이트 배열로 변환
function getBytes(str) {
  return new java.lang.String(str).getBytes();
}

// 이벤트를 서버로 전송
function sendEvent(event, data) {
  var bytes = getBytes(JSON.stringify({ event: event, data: data }));
  var outPacket = new java.net.DatagramPacket(
    bytes,
    bytes.length,
    address,
    config.port,
  );
  socket.send(outPacket);
}

// 비트맵을 Base64 문자열로 변환
function bitmapToBase64(icon) {
  var outStream = new java.io.ByteArrayOutputStream();
  icon.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, outStream);
  var byteArray = outStream.toByteArray();
  try {
    outStream.close();
  } catch (_) {}
  return android.util.Base64.encodeToString(byteArray, 0);
}
```

**설명:**

- `getBytes()`: JSON 문자열을 UDP 패킷으로 전송하기 위한 바이트 변환
- `sendEvent()`: 이벤트와 데이터를 JSON으로 직렬화하여 서버로 전송
- `bitmapToBase64()`: 프로필 이미지와 채팅방 아이콘을 Base64로 인코딩

### 4. 메시지 수신 처리

```javascript
var receiveMessage = function (msg) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;

  // JSON 파싱
  var _q = JSON.parse(msg),
    event = _q.event,
    data = _q.data,
    session = _q.session;

  // 응답 전송 함수
  function sendReply(data) {
    return sendEvent('reply:'.concat(session), data);
  }

  // 플러그인 이벤트 처리
  Object.keys(RKPlugins).map(function (key) {
    return RKPlugins[key].onEvent(
      { event: event, data: data, session: session },
      sendReply,
    );
  });

  // 이벤트별 처리
  switch (event) {
    case 'send_text':
      // 텍스트 메시지 전송 처리
      if (
        ((_a = data.userId) === null || _a === void 0
          ? void 0
          : _a.toString()) &&
        data.packageName &&
        data.roomId &&
        data.text
      ) {
        var action =
          (_d =
            (_c =
              (_b = replyActions.get(Number(data.userId))) === null ||
              _b === void 0
                ? void 0
                : _b.get(data.packageName.toString())) === null || _c === void 0
              ? void 0
              : _c.get(data.roomId.toString())) === null || _d === void 0
            ? void 0
            : _d[1];

        if (action) {
          var intent = new android.content.Intent();
          var bundle = new android.os.Bundle();
          var remoteInputs = action.getRemoteInputs();

          // RemoteInput 설정
          for (
            var _i = 0, _r = Array.from(remoteInputs);
            _i < _r.length;
            _i++
          ) {
            var input = _r[_i];
            bundle.putCharSequence(input.getResultKey(), data.text.toString());
          }

          android.app.RemoteInput.addResultsToIntent(
            action.getRemoteInputs(),
            intent,
            bundle,
          );

          try {
            action.actionIntent.send(Api.getContext(), 0, intent);
            sendReply(true);
          } catch (_) {
            sendReply(false);
          }
        }
      }
      sendReply(false);
      break;

    case 'read':
      // 읽음 처리
      if (
        ((_e = data.userId) === null || _e === void 0
          ? void 0
          : _e.toString()) &&
        data.packageName &&
        data.roomId
      ) {
        var action =
          (_h =
            (_g =
              (_f = replyActions.get(Number(data.userId))) === null ||
              _f === void 0
                ? void 0
                : _f.get(data.packageName.toString())) === null || _g === void 0
              ? void 0
              : _g.get(data.roomId.toString())) === null || _h === void 0
            ? void 0
            : _h[0];

        if (action) {
          try {
            action.actionIntent.send(
              Api.getContext(),
              1,
              new android.content.Intent(),
            );
            sendReply(true);
          } catch (_) {
            sendReply(false);
          }
        }
      }
      sendReply(false);
      break;

    case 'get_profile_image':
      // 프로필 이미지 요청
      if (
        ((_j = data.userId) === null || _j === void 0
          ? void 0
          : _j.toString()) &&
        data.packageName &&
        data.userHash
      ) {
        var profileImage =
          (_l =
            (_k = profileImages.get(Number(data.userId))) === null ||
            _k === void 0
              ? void 0
              : _k.get(data.packageName.toString())) === null || _l === void 0
            ? void 0
            : _l.get(data.userHash.toString());

        if (profileImage) return sendReply(profileImage);
      }
      sendReply(undefined);
      break;

    case 'get_room_icon':
      // 채팅방 아이콘 요청
      if (
        ((_m = data.userId) === null || _m === void 0
          ? void 0
          : _m.toString()) &&
        data.packageName &&
        data.roomId
      ) {
        var icon =
          (_p =
            (_o = roomIcons.get(Number(data.userId))) === null || _o === void 0
              ? void 0
              : _o.get(data.packageName.toString())) === null || _p === void 0
            ? void 0
            : _p.get(data.roomId.toString());

        if (icon) return sendReply(icon);
      }
      sendReply(undefined);
      break;
  }
};
```

**설명:**

- **JSON 파싱**: 수신된 메시지를 파싱하여 이벤트, 데이터, 세션 정보를 추출
- **플러그인 처리**: 등록된 플러그인들에게 이벤트를 전달
- **send_text**: RemoteInput을 사용하여 텍스트 메시지를 전송
- **read**: 알림 액션을 통해 메시지를 읽음 처리
- **get_profile_image**: 캐시된 프로필 이미지를 반환
- **get_room_icon**: 캐시된 채팅방 아이콘을 반환

### 5. 메시지 이벤트 리스너

```javascript
function onMessage(data) {
  let msg = data || {};

  msg.id = 0; // 메시지 ID 초기화
  msg.sender = data.author; // 발신자 정보 설정
  msg.time = new Date().getTime(); // 타임스탬프 추가

  msg.app = {};
  msg.app.packageName = msg.packageName;
  msg.app.userId = config.userIds[0];

  sendEvent('message', msg); // 서버로 메시지 이벤트 전송
}
```

**설명:**

- 메시지 데이터를 정규화하여 서버로 전송
- 발신자 정보, 타임스탬프, 앱 정보를 추가
- `sendEvent()`를 통해 서버로 메시지 이벤트 전송

### 6. UDP 수신 스레드

```javascript
// @ts-ignore
var thread = new java.lang.Thread({
  run: function () {
    while (true) {
      socket.receive(inPacket); // UDP 패킷 수신 대기

      // 수신된 데이터를 문자열로 변환
      var message = decodeURIComponent(
        String(
          new java.lang.String(
            inPacket.getData(),
            inPacket.getOffset(),
            inPacket.getLength(),
          ),
        ),
      );

      Log.i(message); // 로그 출력
      receiveMessage(message); // 메시지 처리
    }
  },
});

// 스레드 시작
thread.start();
```

**설명:**

- 별도 스레드에서 UDP 패킷을 지속적으로 수신
- 수신된 바이트 데이터를 UTF-8 문자열로 디코딩
- URL 디코딩 후 메시지 처리 함수 호출

### 7. 컴파일 시작 처리

```javascript
function onStartCompile() {
  replyActions.clear(); // 답장 액션 캐시 초기화
  return thread.interrupt(); // 수신 스레드 중단
}
```

**설명:**

- 스크립트 재시작 시 캐시를 초기화하고 스레드를 중단
- 메모리 누수 방지 및 깨끗한 상태에서 시작

### 8. 봇 이벤트 리스너 등록

```javascript
bot.addListener(Event.MESSAGE, onMessage);
```

**설명:**

- 봇의 메시지 이벤트에 리스너를 등록
- 메시지 수신 시 `onMessage` 함수가 호출됨

### 9. 알림 리스너

```javascript
function onNotificationPosted(sbn) {
  var _a,
    _b,
    _c,
    _d,
    _e,
    _f,
    _g,
    _h,
    _j,
    _k,
    _l,
    _m,
    _o,
    _p,
    _q,
    _r,
    _s,
    _t,
    _u,
    _v;

  // 알림 정보 추출
  var packageName = sbn.getPackageName();
  var userId = sbn.getUser().hashCode();

  // 필터링: 카카오톡 알림만 처리
  if (
    !config.packageNames.includes(packageName) ||
    !config.userIds.includes(userId)
  )
    return;

  var noti = sbn.getNotification();
  var actions = noti.actions;
  var bundle = noti.extras;

  // 메시징 스타일 알림 확인
  if (
    !actions ||
    !bundle ||
    bundle.getString('android.template') !==
      'android.app.Notification$MessagingStyle'
  )
    return;

  // 메시지 정보 추출
  var senderName = bundle.getString('android.title');
  var roomName =
    (_b =
      (_a = bundle.getString('android.subText')) !== null && _a !== void 0
        ? _a
        : bundle.getString('android.summaryText')) !== null && _b !== void 0
      ? _b
      : senderName;
  var androidText = bundle.get('android.text');
  var content = androidText.toString();
  var containsMention = androidText instanceof android.text.SpannableString;
  var isGroupChat = bundle.getBoolean('android.isGroupConversation');

  // 메시지 번들 처리
  var messageBundle = bundle.getParcelableArray('android.messages')[0];
  var senderPerson = messageBundle.get('sender_person');
  var senderHash = senderPerson.getKey();
  var time = messageBundle.getLong('time');
  var roomId = sbn.getTag();
  var logId = java.lang.Long.toString(bundle.getLong('chatLogId'));

  // 프로필 이미지 캐싱
  var profileImage = bitmapToBase64(senderPerson.getIcon().getBitmap());
  if (!profileImages.has(userId)) profileImages.set(userId, new Map());
  if (
    !((_c = profileImages.get(userId)) === null || _c === void 0
      ? void 0
      : _c.has(packageName))
  )
    (_d = profileImages.get(userId)) === null || _d === void 0
      ? void 0
      : _d.set(packageName, new Map());
  if (
    !((_f =
      (_e = profileImages.get(userId)) === null || _e === void 0
        ? void 0
        : _e.get(packageName)) === null || _f === void 0
      ? void 0
      : _f.has(senderHash))
  )
    (_h =
      (_g = profileImages.get(userId)) === null || _g === void 0
        ? void 0
        : _g.get(packageName)) === null || _h === void 0
      ? void 0
      : _h.set(roomId, profileImage);

  // 채팅방 아이콘 캐싱
  var roomIcon = bitmapToBase64(bundle.get('android.largeIcon').getBitmap());
  if (!roomIcons.has(userId)) roomIcons.set(userId, new Map());
  if (
    !((_j = roomIcons.get(userId)) === null || _j === void 0
      ? void 0
      : _j.has(packageName))
  )
    (_k = roomIcons.get(userId)) === null || _k === void 0
      ? void 0
      : _k.set(packageName, new Map());
  if (
    !((_m =
      (_l = roomIcons.get(userId)) === null || _l === void 0
        ? void 0
        : _l.get(packageName)) === null || _m === void 0
      ? void 0
      : _m.has(roomId))
  )
    (_p =
      (_o = roomIcons.get(userId)) === null || _o === void 0
        ? void 0
        : _o.get(packageName)) === null || _p === void 0
      ? void 0
      : _p.set(roomId, roomIcon);

  // 액션 처리
  var readAction = undefined;
  for (var _i = 0, _w = Array.from(actions); _i < _w.length; _i++) {
    var action = _w[_i];

    // 답장 액션 처리
    if (
      action.getRemoteInputs() &&
      ['reply', '답장'].includes(action.title.toLowerCase())
    ) {
      // 답장 액션 캐싱
      if (!replyActions.has(userId)) replyActions.set(userId, new Map());
      if (
        !((_q = replyActions.get(userId)) === null || _q === void 0
          ? void 0
          : _q.has(packageName))
      )
        (_r = replyActions.get(userId)) === null || _r === void 0
          ? void 0
          : _r.set(packageName, new Map());
      if (
        !((_t =
          (_s = replyActions.get(userId)) === null || _s === void 0
            ? void 0
            : _s.get(packageName)) === null || _t === void 0
          ? void 0
          : _t.has(roomId))
      )
        (_v =
          (_u = replyActions.get(userId)) === null || _u === void 0
            ? void 0
            : _u.get(packageName)) === null || _v === void 0
          ? void 0
          : _v.set(roomId, [
              readAction !== null && readAction !== void 0
                ? readAction
                : actions[1],
              action,
            ]);

      // 메시지 이벤트 전송
      onMessage.call(null, {
        room: { name: roomName, id: roomId, isGroupChat: isGroupChat },
        id: logId,
        sender: { name: senderName, hash: senderHash },
        content: content,
        containsMention: containsMention,
        time: time,
        app: { packageName: packageName, userId: userId },
      });
    }
    // 읽음 액션 처리
    else if (['read', '읽음'].includes(action.title.toLowerCase())) {
      readAction = action;
      com.xfl.msgbot.application.service.NotificationListener.Companion.setMarkAsRead(
        packageName,
        roomName,
        action,
      );
    }
  }
}
```

**설명:**

- **알림 필터링**: 카카오톡 알림만 처리하도록 필터링
- **메시지 정보 추출**: 발신자, 채팅방, 메시지 내용 등 추출
- **이미지 캐싱**: 프로필 이미지와 채팅방 아이콘을 Base64로 변환하여 캐싱
- **액션 캐싱**: 답장과 읽음 액션을 메모리에 저장
- **메시지 이벤트 전송**: 추출된 정보를 정규화하여 서버로 전송

## 주요 구성 요소

### 1. 설정 (Configuration)

```javascript
var config = {
  address: 'your address', // 서버 주소
  port: 3000, // 서버 포트
  packageNames: ['com.kakao.talk'], // 모니터링할 패키지
  userIds: [0], // 사용자 ID
};
```

### 2. UDP 소켓 설정

```javascript
var socket = new java.net.DatagramSocket();
var address = java.net.InetAddress.getByName(config.address);
var buffer = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, 65535);
var inPacket = new java.net.DatagramPacket(buffer, buffer.length);
```

### 3. 데이터 저장소

- `replyActions`: 답장 액션 저장
- `profileImages`: 프로필 이미지 캐시
- `roomIcons`: 채팅방 아이콘 캐시

## 주요 기능

### 1. 이벤트 전송

```javascript
function sendEvent(event, data) {
  var bytes = getBytes(JSON.stringify({ event: event, data: data }));
  var outPacket = new java.net.DatagramPacket(
    bytes,
    bytes.length,
    address,
    config.port,
  );
  socket.send(outPacket);
}
```

### 2. 메시지 수신 처리

```javascript
var receiveMessage = function (msg) {
  // JSON 파싱 및 이벤트 처리
  var _q = JSON.parse(msg),
    event = _q.event,
    data = _q.data,
    session = _q.session;

  // 이벤트별 처리 로직
  switch (event) {
    case 'send_text': // 텍스트 전송
    case 'read': // 읽음 처리
    case 'get_profile_image': // 프로필 이미지 요청
    case 'get_room_icon': // 채팅방 아이콘 요청
  }
};
```

### 3. 알림 처리

```javascript
function onNotificationPosted(sbn) {
  // 카카오톡 알림 감지 및 메시지 정보 추출
  // 프로필 이미지, 채팅방 아이콘 캐싱
  // 메시지 이벤트 전송
}
```

## 지원하는 이벤트

### 1. `send_text`

- **목적**: 원격으로 텍스트 메시지 전송
- **필수 데이터**: `userId`, `packageName`, `roomId`, `text`

### 2. `read`

- **목적**: 메시지를 읽음 처리
- **필수 데이터**: `userId`, `packageName`, `roomId`

### 3. `get_profile_image`

- **목적**: 사용자 프로필 이미지 요청
- **필수 데이터**: `userId`, `packageName`, `userHash`

### 4. `get_room_icon`

- **목적**: 채팅방 아이콘 요청
- **필수 데이터**: `userId`, `packageName`, `roomId`

## 메시지 형식

### 전송 메시지

```json
{
  "event": "message",
  "data": {
    "room": {
      "name": "채팅방명",
      "id": "roomId",
      "isGroupChat": false
    },
    "id": "logId",
    "sender": {
      "name": "발신자명",
      "hash": "senderHash"
    },
    "content": "메시지 내용",
    "containsMention": false,
    "time": 1234567890,
    "app": {
      "packageName": "com.kakao.talk",
      "userId": 0
    }
  }
}
```

### 응답 메시지

```json
{
  "event": "reply:sessionId",
  "data": true/false/undefined
}
```

## 사용 방법

1. **메신저봇R 설치**: Android 기기에 메신저봇R 앱을 설치
2. **스크립트 등록**: 메신저봇R에서 이 스크립트를 등록
3. **설정 수정**: `config` 객체에서 서버 주소와 포트를 설정
4. **권한 설정**: 메신저봇R에서 알림 접근 권한 및 카카오톡 알림 권한 허용
5. **실행**: 메신저봇R에서 스크립트를 활성화하여 UDP 통신 시작
6. **모니터링**: 카카오톡 알림을 감지하여 서버로 전송

## 주의사항

- **메신저봇R 필수**: Android 환경에서 메신저봇R 앱이 설치되어 있어야 동작
- **권한 요구사항**: 메신저봇R에서 알림 접근 권한 및 카카오톡 알림 권한 필요
- **앱 호환성**: 메신저봇R과 카카오톡 버전에 따라 동작이 달라질 수 있음
- **UDP 통신**: UDP 사용으로 네트워크 안정성 고려 필요
- **메모리 사용량**: 프로필 이미지와 채팅방 아이콘 캐싱으로 인한 메모리 사용량
  증가
- **배터리 소모**: WakeLock 사용으로 배터리 소모 증가 가능
